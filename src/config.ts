/* ================================================================
   Sids Colours - the settings, read in one place.

   Every default here has to match the default in package.json. A
   setting whose shipped default and whose code default disagree
   behaves differently before and after you touch it, which is the
   sort of fault that takes an hour to believe.
   ================================================================ */

import * as vscode from 'vscode';
import { CopyFormat, parseColour } from './colors';

export interface PaletteEntry {
    name: string;
    value: string;
}

export interface Settings {
    palette: PaletteEntry[];
    languages: string[];
    namedColours: boolean;
    insertFormat: CopyFormat;
}

const DEFAULT_LANGUAGES = [
    'php',
    'javascript',
    'typescript',
    'javascriptreact',
    'typescriptreact',
    'json',
    'jsonc',
    'html',
    'markdown',
    'yaml',
    'python',
    'shellscript',
    'sql',
    'xml',
    'twig',
    'plaintext',
    'dotenv',
    'ini',
    'dockerfile',
    'nginx',
    'apacheconf',
    'powershell',
];

function readPalette(): PaletteEntry[] {
    const raw = vscode.workspace
        .getConfiguration('sidsColours')
        .get<unknown[]>('palette', []);
    const entries: PaletteEntry[] = [];
    if (!Array.isArray(raw)) return entries;
    for (const item of raw) {
        if (typeof item !== 'object' || item === null) continue;
        const candidate = item as { name?: unknown; value?: unknown };
        const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
        const value = typeof candidate.value === 'string' ? candidate.value.trim() : '';
        if (name === '' || value === '') continue;
        entries.push({ name, value });
    }
    return entries;
}

export function readSettings(): Settings {
    const config = vscode.workspace.getConfiguration('sidsColours');
    const languages = config.get<string[]>('languages', DEFAULT_LANGUAGES);
    const insertFormat = config.get<CopyFormat>('insertFormat', 'hex');
    return {
        palette: readPalette(),
        languages: Array.isArray(languages) && languages.length > 0 ? languages : DEFAULT_LANGUAGES,
        namedColours: config.get<boolean>('namedColours', false),
        insertFormat: insertFormat === 'rgb' || insertFormat === 'hsl' ? insertFormat : 'hex',
    };
}

/** The palette, minus anything that is not a colour - so a typo in the
 *  settings shows up as a warning rather than as a broken picker. */
export function usablePalette(palette: PaletteEntry[]): {
    good: PaletteEntry[];
    broken: PaletteEntry[];
} {
    const good: PaletteEntry[] = [];
    const broken: PaletteEntry[] = [];
    for (const entry of palette) {
        (parseColour(entry.value) ? good : broken).push(entry);
    }
    return { good, broken };
}

export function paletteForWriting(): PaletteEntry[] {
    return readPalette();
}

export async function savePalette(palette: PaletteEntry[]): Promise<void> {
    await vscode.workspace
        .getConfiguration('sidsColours')
        .update('palette', palette, vscode.ConfigurationTarget.Global);
}
