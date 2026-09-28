/* ================================================================
   Sids Colours - the commands, which is the Ctrl+Shift+P half.

   Everything here is reachable by name from the command palette, and
   two of them are on the context menu of an open editor.

   The rule the whole file obeys: a command answers about the colour
   you are POINTING AT - the selection, or the line the caret is on -
   and if there is no colour there it says so rather than guessing.
   ================================================================ */

import * as vscode from 'vscode';
import {
    contrastRatio,
    contrastVerdict,
    COPY_FORMATS,
    CopyFormat,
    findColours,
    formatColour,
    paletteNameFor,
    parseColour,
    readableTextOn,
    Rgba,
    toHex,
} from './colors';
import { PaletteEntry, readSettings, savePalette, usablePalette } from './config';
import { ensureSwatch } from './png';
import { colourHere, ColourHere } from './swatches';
import { paletteUri } from './palette-document';

const NO_COLOUR = 'Sids Colours: no colour where the caret is.';

interface PalettePick extends vscode.QuickPickItem {
    entry: PaletteEntry;
}

function activeEditor(): vscode.TextEditor | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        void vscode.window.showWarningMessage('Sids Colours: open a file first.');
        return null;
    }
    return editor;
}

/** The colour file for a quick pick row, so the list is colours and not words. */
function swatchIcon(
    swatchDir: string,
    colour: Rgba
): vscode.Uri | vscode.ThemeIcon {
    const file = ensureSwatch(swatchDir, colour, toHex(colour, true).slice(1));
    return file ? vscode.Uri.file(file) : new vscode.ThemeIcon('symbol-color');
}

/** Write text where the caret is, then leave it selected - so the new
 *  colour's own square is one click away if it wants changing. */
async function insertAtCaret(editor: vscode.TextEditor, text: string): Promise<void> {
    const target = editor.selection.isEmpty
        ? new vscode.Range(editor.selection.active, editor.selection.active)
        : editor.selection;
    const start = target.start;
    const done = await editor.edit((builder) => builder.replace(target, text));
    if (!done) return;
    const end = editor.document.positionAt(editor.document.offsetAt(start) + text.length);
    editor.selection = new vscode.Selection(start, end);
}

function hereOrComplain(
    editor: vscode.TextEditor,
    namedColours: boolean
): ColourHere | null {
    const here = colourHere(editor, namedColours);
    if (!here) {
        void vscode.window.showInformationMessage(NO_COLOUR);
        return null;
    }
    return here;
}

async function insertFromPalette(swatchDir: string): Promise<void> {
    const settings = readSettings();
    const { good, broken } = usablePalette(settings.palette);
    if (broken.length > 0) {
        void vscode.window.showWarningMessage(
            'Sids Colours: these palette entries are not colours and were left out - ' +
                broken.map((entry) => `${entry.name} (${entry.value})`).join(', ')
        );
    }
    const editor = activeEditor();
    if (!editor) return;
    if (good.length === 0) {
        void vscode.window.showInformationMessage(
            'Sids Colours: your palette is empty. Put the caret on a colour and run "Save the Colour Here to My Palette".'
        );
        return;
    }
    const items: PalettePick[] = good.map((entry) => {
        const colour = parseColour(entry.value) as Rgba;
        return {
            label: entry.name,
            description: `${toHex(colour, true)}   ${formatColour(colour, settings.insertFormat)}`,
            iconPath: swatchIcon(swatchDir, colour),
            entry,
        };
    });
    const picked = await vscode.window.showQuickPick(items, {
        title: 'Sids Colours',
        placeHolder: `Which colour? It goes in as ${settings.insertFormat}.`,
    });
    if (!picked) return;
    const colour = parseColour(picked.entry.value);
    if (!colour) return;
    await insertAtCaret(editor, formatColour(colour, settings.insertFormat, picked.entry.name));
}

async function showPalette(): Promise<void> {
    const document = await vscode.workspace.openTextDocument(paletteUri());
    await vscode.window.showTextDocument(document, { preview: false });
}

async function insertTyped(): Promise<void> {
    const editor = activeEditor();
    if (!editor) return;
    const settings = readSettings();
    const here = colourHere(editor, settings.namedColours);
    const firstGood = settings.palette.find((entry) => parseColour(entry.value) !== null);
    const initial = here ? here.text : firstGood ? firstGood.value : '#38bdf8';
    const typed = await vscode.window.showInputBox({
        title: 'Sids Colours - insert a colour',
        prompt: 'Any form: #38bdf8, #abc, rgb(56, 189, 248), hsl(199, 89%, 60%), cornflowerblue',
        value: initial,
        validateInput: (value) =>
            parseColour(value) === null ? 'That is not a colour I can read.' : undefined,
    });
    if (typed === undefined) return;
    const colour = parseColour(typed);
    if (!colour) return;
    await insertAtCaret(editor, formatColour(colour, settings.insertFormat));
}

async function convertHere(): Promise<void> {
    const editor = activeEditor();
    if (!editor) return;
    const settings = readSettings();
    const here = hereOrComplain(editor, settings.namedColours);
    if (!here) return;
    const colour = parseColour(here.text);
    if (!colour) return;
    const items = COPY_FORMATS.filter(
        (format) => format.id === 'hex' || format.id === 'hex8' || format.id === 'rgb' || format.id === 'hsl'
    ).map((format) => ({
        label: formatColour(colour, format.id),
        description: format.label,
        id: format.id,
    }));
    const picked = await vscode.window.showQuickPick(items, {
        title: `Convert ${here.text}`,
        placeHolder: 'The label is the text you will get.',
    });
    if (!picked) return;
    await editor.edit((builder) => builder.replace(here.range, picked.label));
}

async function copyHere(): Promise<void> {
    const editor = activeEditor();
    if (!editor) return;
    const settings = readSettings();
    const here = hereOrComplain(editor, settings.namedColours);
    if (!here) return;
    const colour = parseColour(here.text);
    if (!colour) return;
    const name = paletteNameFor(settings.palette, colour) ?? 'colour';
    const items = COPY_FORMATS.map((format) => ({
        label: formatColour(colour, format.id, name),
        description: format.label,
    }));
    const picked = await vscode.window.showQuickPick(items, {
        title: `Copy ${here.text} as`,
        placeHolder: 'The label is the text that goes on the clipboard.',
    });
    if (!picked) return;
    await vscode.env.clipboard.writeText(picked.label);
    void vscode.window.showInformationMessage(`Sids Colours: copied ${picked.label}`);
}

async function contrastHere(): Promise<void> {
    const editor = activeEditor();
    if (!editor) return;
    const settings = readSettings();
    const line = editor.document.lineAt(editor.selection.active.line);
    const onLine = findColours(line.text, settings.namedColours);

    let first: Rgba | null = null;
    let second: Rgba | null = null;
    let firstText = '';
    const here = colourHere(editor, settings.namedColours);
    if (here) {
        first = parseColour(here.text);
        firstText = here.text;
        const after = onLine.filter((match) => match.start >= here.match.end);
        if (after.length > 0) second = parseColour(after[0].text);
    } else if (onLine.length === 2) {
        /* Two colours on the line and the caret is not in either: the
           question is obviously about those two, so it is answered. */
        first = parseColour(onLine[0].text);
        second = parseColour(onLine[1].text);
        firstText = onLine[0].text;
    }
    if (!first) {
        void vscode.window.showInformationMessage(NO_COLOUR);
        return;
    }
    if (!second) {
        const typed = await vscode.window.showInputBox({
            title: `Contrast against ${firstText}`,
            prompt: 'The other colour - the background this one sits on',
            value: '#ffffff',
            validateInput: (value) =>
                parseColour(value) === null ? 'That is not a colour I can read.' : undefined,
        });
        if (typed === undefined) return;
        second = parseColour(typed);
    }
    if (!second) return;

    const ratio = contrastRatio(first, second);
    const verdict = contrastVerdict(ratio);
    const textColour = readableTextOn(first);
    const message =
        `${firstText} on ${toHex(second, true)}: ${ratio}:1 - ${verdict.level}. ` +
        `If ${toHex(first, true)} is a background, text on it reads best as ${toHex(textColour, true)} at ${contrastRatio(first, textColour)}:1.`;
    const action = await vscode.window.showInformationMessage(message, 'Copy the numbers');
    if (action) await vscode.env.clipboard.writeText(message);
}

async function saveHere(): Promise<void> {
    const editor = activeEditor();
    if (!editor) return;
    const settings = readSettings();
    const here = hereOrComplain(editor, settings.namedColours);
    if (!here) return;
    const colour = parseColour(here.text);
    if (!colour) return;
    const existing = paletteNameFor(settings.palette, colour);
    const name = await vscode.window.showInputBox({
        title: 'Save to my palette',
        prompt: existing ? `Already in the palette as ${existing}. A new name adds a second entry.` : 'What is it called?',
        value: existing ?? toHex(colour, colour.a < 1),
        validateInput: (value) => (value.trim() === '' ? 'It needs a name.' : undefined),
    });
    if (name === undefined) return;
    const entry: PaletteEntry = {
        name: name.trim(),
        value: toHex(colour, colour.a < 1),
    };
    const palette = settings.palette.slice();
    const at = palette.findIndex(
        (candidate) => candidate.name.toLowerCase() === entry.name.toLowerCase()
    );
    if (at >= 0) palette[at] = entry;
    else palette.push(entry);
    await savePalette(palette);
    void vscode.window.showInformationMessage(
        `Sids Colours: ${at >= 0 ? 'replaced' : 'saved'} ${entry.name} as ${entry.value}.`
    );
}

export function registerCommands(
    context: vscode.ExtensionContext,
    swatchDir: string
): void {
    const register = (id: string, run: () => Promise<void> | void): void => {
        context.subscriptions.push(
            vscode.commands.registerCommand(id, () => {
                /* Every command is wrapped: a failure in a colour
                   helper must arrive as a sentence, never as a dead
                   command with nothing on screen. */
                return Promise.resolve(run()).catch((error: unknown) => {
                    const detail = error instanceof Error ? error.message : String(error);
                    void vscode.window.showErrorMessage(`Sids Colours: ${detail}`);
                });
            })
        );
    };
    register('sidsColours.palette', () => insertFromPalette(swatchDir));
    register('sidsColours.show', () => showPalette());
    register('sidsColours.insert', () => insertTyped());
    register('sidsColours.convert', () => convertHere());
    register('sidsColours.copy', () => copyHere());
    register('sidsColours.contrast', () => contrastHere());
    register('sidsColours.save', () => saveHere());
}
