/* ================================================================
   Sids Colours - the squares in the editor.

   This is the native half. VS Code has a colour decorator built in,
   but it only understands CSS, SCSS and LESS - in a PHP file, a JSON
   theme, a Markdown note or a shell script a colour is just text, and
   nothing tells you what it looks like or lets you change it by eye.

   Implementing `DocumentColorProvider` for a language buys three
   things at once, and they are the three things the extension is for:
     - the colour square in the gutter,
     - clicking that square opens the real picker,
     - and what you pick is written back in the shape the file
       already used, because the list of choices is built from the
       text that is already there.

   Pure CSS is deliberately NOT registered: VS Code does it itself and
   a second provider would draw a second square in the same place.
   ================================================================ */

import * as vscode from 'vscode';
import { ColourMatch, CopyFormat, findColours, formatColour, notationOfText, Rgba } from './colors';

/** Above this, scanning is refused. A colour provider runs on every
 *  edit, and a 40 MB log file is not worth a stutter in an editor. */
const MAX_SCAN_CHARS = 400000;

export class SwatchProvider implements vscode.DocumentColorProvider {
    constructor(private readonly namedColours: () => boolean) {}

    provideDocumentColors(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken
    ): vscode.ColorInformation[] {
        const text = document.getText();
        if (text.length > MAX_SCAN_CHARS) return [];

        const infos: vscode.ColorInformation[] = [];
        for (const match of findColours(text, this.namedColours())) {
            infos.push(
                new vscode.ColorInformation(
                    new vscode.Range(
                        document.positionAt(match.start),
                        document.positionAt(match.end)
                    ),
                    new vscode.Color(
                        match.colour.r / 255,
                        match.colour.g / 255,
                        match.colour.b / 255,
                        match.colour.a
                    )
                )
            );
        }
        return infos;
    }

    /**
     * What the picker offers once a colour has been chosen.
     *
     * The first entry is the SAME notation the file already uses, so
     * the default action never rewrites `hsl(...)` into `#rrggbb` just
     * because that is what the extension finds easiest.
     */
    provideColorPresentations(
        color: vscode.Color,
        context: { document: vscode.TextDocument; range: vscode.Range },
        _token: vscode.CancellationToken
    ): vscode.ColorPresentation[] {
        const colour: Rgba = {
            r: Math.round(color.red * 255),
            g: Math.round(color.green * 255),
            b: Math.round(color.blue * 255),
            a: color.alpha,
        };
        const original = context.document.getText(context.range);
        const notation = notationOfText(original);

        const order: CopyFormat[] = [];
        if (notation === 'rgb' || notation === 'rgba') order.push('rgb');
        else if (notation === 'hsl' || notation === 'hsla') order.push('hsl');
        else if (notation === 'hex8') order.push('hex8');
        else order.push(colour.a >= 1 ? 'hex' : 'hex8');
        for (const format of ['hex', 'hex8', 'rgb', 'hsl'] as CopyFormat[]) {
            if (order.indexOf(format) === -1) order.push(format);
        }

        return order.map((format) => {
            const text = formatColour(colour, format);
            const presentation = new vscode.ColorPresentation(text);
            presentation.textEdit = vscode.TextEdit.replace(context.range, text);
            return presentation;
        });
    }
}

/** A colour found where the caret is, with its real place in the file. */
export interface ColourHere {
    match: ColourMatch;
    range: vscode.Range;
    text: string;
}

/**
 * The colour the caret is on, or the one in the selection.
 *
 * It looks at the selection first and then at the caret's own line,
 * rather than at the whole file: a command should answer about what
 * you are pointing at, not about the first colour in the document.
 */
export function colourHere(
    editor: vscode.TextEditor,
    namedColours: boolean
): ColourHere | null {
    const document = editor.document;
    const selection = editor.selection;
    const caret = document.offsetAt(selection.active);

    const scopes: { text: string; base: number; wholeScope: boolean }[] = [];
    if (!selection.isEmpty) {
        scopes.push({
            text: document.getText(selection),
            base: document.offsetAt(selection.start),
            wholeScope: true,
        });
    }
    const line = document.lineAt(selection.active.line);
    scopes.push({ text: line.text, base: document.offsetAt(line.range.start), wholeScope: false });

    for (const scope of scopes) {
        const matches = findColours(scope.text, namedColours);
        if (matches.length === 0) continue;
        let chosen: ColourMatch | undefined;
        for (const match of matches) {
            if (caret >= scope.base + match.start && caret <= scope.base + match.end) {
                chosen = match;
                break;
            }
        }
        if (!chosen && (scope.wholeScope || matches.length === 1)) chosen = matches[0];
        if (!chosen) continue;
        return {
            match: chosen,
            range: new vscode.Range(
                document.positionAt(scope.base + chosen.start),
                document.positionAt(scope.base + chosen.end)
            ),
            text: chosen.text,
        };
    }
    return null;
}
