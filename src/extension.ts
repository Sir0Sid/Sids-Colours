/* ================================================================
   Sids Colours - activation.

   Two things are wired up here and nothing else: the colour squares
   (one provider, registered per language) and the commands.

   The language list is read from settings and the providers are
   REBUILT when it changes, because a registered provider cannot be
   edited - it has to be disposed and registered again. Without that,
   adding a language in Settings would appear to do nothing until the
   window was reloaded, which is the worst kind of setting: one that
   looks like it works.
   ================================================================ */

import * as path from 'path';
import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { readSettings } from './config';
import { PALETTE_SCHEME, PaletteDocumentProvider } from './palette-document';
import { SwatchProvider } from './swatches';

export function activate(context: vscode.ExtensionContext): void {
    const swatchDir = path.join(context.globalStorageUri.fsPath, 'swatches');

    const palettePage = new PaletteDocumentProvider();
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(PALETTE_SCHEME, palettePage)
    );

    let providers: vscode.Disposable[] = [];
    const buildProviders = (): void => {
        for (const provider of providers) provider.dispose();
        providers = [];
        const settings = readSettings();
        const swatches = new SwatchProvider(() => readSettings().namedColours);
        const selectors: vscode.DocumentFilter[] = [];
        for (const language of settings.languages) {
            selectors.push(language === '*' ? { scheme: 'file' } : { language });
        }
        /* The palette page is not a file, so it needs its own entry. */
        selectors.push({ scheme: PALETTE_SCHEME });
        for (const selector of selectors) {
            providers.push(vscode.languages.registerColorProvider(selector, swatches));
        }
    };
    buildProviders();

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (!event.affectsConfiguration('sidsColours')) return;
            palettePage.refresh();
            buildProviders();
        }),
        {
            dispose: () => {
                for (const provider of providers) provider.dispose();
            },
        }
    );

    registerCommands(context, swatchDir);
}

export function deactivate(): void {
    /* Nothing to undo by hand: every disposable was registered on the
       context, and VS Code disposes those when the extension goes. */
}
