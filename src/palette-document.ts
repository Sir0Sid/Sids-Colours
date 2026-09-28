/* ================================================================
   Sids Colours - the palette page.

   `Sids Colours: Show My Palette` opens a read-only tab with one
   colour per line, which exists for one reason: the colour provider
   is registered for this document's scheme too, so the page shows the
   real colours, in the editor, using VS Code's own swatches - no
   webview, no HTML, no second copy of the palette to keep in step.
   ================================================================ */

import * as vscode from 'vscode';
import { parseColour, toHex } from './colors';
import { readSettings, usablePalette } from './config';

export const PALETTE_SCHEME = 'sids-colours';

export function paletteUri(): vscode.Uri {
    return vscode.Uri.from({ scheme: PALETTE_SCHEME, path: '/Sids Colours' });
}

export class PaletteDocumentProvider implements vscode.TextDocumentContentProvider {
    private readonly changed = new vscode.EventEmitter<vscode.Uri>();

    readonly onDidChange = this.changed.event;

    /** Tell VS Code the page is out of date, so an open tab redraws. */
    refresh(): void {
        this.changed.fire(paletteUri());
    }

    provideTextDocumentContent(): string {
        const { good, broken } = usablePalette(readSettings().palette);
        const lines: string[] = [];
        lines.push('Sids Colours - your palette');
        lines.push('');
        lines.push(
            good.length +
                ' colour(s). This page is generated and read-only; the list itself lives in Settings, under sidsColours.palette.'
        );
        lines.push('');
        for (const entry of good) {
            const colour = parseColour(entry.value);
            if (!colour) continue;
            /* Six digits unless there is really an alpha to show: a page
               of `#38bdf8ff` is a page nobody reads. */
            lines.push(toHex(colour, colour.a < 1) + '  ' + entry.name + '   ' + entry.value);
        }
        if (broken.length > 0) {
            lines.push('');
            lines.push('These are in the palette but are not colours, so they are shown as text only:');
            for (const entry of broken) lines.push(entry.value + '  ' + entry.name);
        }
        lines.push('');
        return lines.join('\n');
    }
}
