# Sids Colours

Pick, convert, insert and check colours — from the command palette, or by clicking the square in the gutter. It also carries three colour themes for the whole editor.

VS Code has a colour decorator built in, but it only understands CSS, SCSS and LESS. In a PHP file, a JSON theme, a Markdown note, a shell script or a config file a colour is just text: nothing tells you what it looks like, and nothing lets you change it by eye. Sids Colours fills that gap, and adds the commands you want once colours are visible.

## The square in the gutter

Wherever a colour is written — `#38bdf8`, `#abc`, `#38bdf8cc`, `rgb(56, 189, 248)`, `hsl(198, 93%, 60%)` — a colour square appears beside it.

- Click the square and the **real picker** opens.
- Pick a colour and it is written back **in the shape the file already used**: an `hsl()` stays `hsl()`, a hex stays a hex. The format you had is the first choice offered, so the default action never rewrites your file's style.
- Works in PHP, JavaScript, TypeScript, JSON, HTML, Markdown, YAML, Python, SQL, shell, XML, Twig, plain text and more — the list is a setting.
- **CSS, SCSS, LESS and SASS are deliberately not included**: VS Code already draws its own square there, and a second provider would draw it twice.

## Commands (Ctrl+Shift+P, then type "Sids Colours")

| Command | What it does |
| --- | --- |
| **Insert a Colour From My Palette** | A list of your own colours, each shown as its actual colour, not just its name. `Ctrl+Alt+C`. |
| **Show My Palette** | Opens your palette as a read-only tab, with the real colours in the editor. |
| **Insert a Colour (type or preset)** | Type any colour — hex, `rgb()`, `hsl()` or a CSS name — into the file at the caret. |
| **Convert the Colour Here** | Turns the colour under the caret into another form. The label in the list **is** the text you get. `Ctrl+Alt+Shift+C`. |
| **Copy the Colour Here As…** | Puts it on the clipboard as hex, hex with alpha, `rgb()`, `hsl()`, a CSS variable declaration, a PHP string or a JSON string. |
| **Check Contrast (readability)** | The WCAG ratio of two colours, the level it passes, and which of black or white reads best on it. |
| **Save the Colour Here to My Palette** | Adds the colour under the caret to your palette in Settings. |

The last four are also on the editor's right-click menu.

Two habits worth knowing:

- A command acts on the colour **you are pointing at** — the selection if you have one, otherwise the colour under the caret on that line. If there is no colour there, it says so instead of guessing.
- After inserting a colour, the new text stays selected, so its square is one click away if you want it different.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `sidsColours.palette` | ten colours | Your colours, as `name` and `value` pairs. Used by the palette commands and as the name for a CSS variable you copy. |
| `sidsColours.languages` | 22 languages | Which languages get the colour square. Add any language id, or `"*"` for every file. |
| `sidsColours.namedColours` | `false` | Also treat CSS colour names (`red`, `cornflowerblue`, `transparent`) as colours. Off by default, because the word "white" in a sentence is not a colour. |
| `sidsColours.insertFormat` | `hex` | The form written into the file when you insert a colour: `hex`, `rgb` or `hsl`. |

## Themes

Three colour themes for the whole editor, installed with the extension — choose them from **Preferences: Color Theme** (`Ctrl+K Ctrl+T`):

| Theme | Base | What it is |
| --- | --- | --- |
| **Sids Colours: Soft Blue** | dark | Muted steel and slate blues, calm and low-contrast. |
| **Sids Colours: Dark Teal** | dark | Near-black surfaces with a deep teal accent. |
| **Sids Colours: Bright Teal** | dark | High-contrast teal, `#00ffea` on the accents. |

All three began as hand-written workbench colour files, and **every workbench colour in them is unchanged** — the window, the sidebar, the activity bar, the tabs, the editor, the status bar and the lists are exactly as they were written.

What was added is the **syntax colours**. Those files name the surfaces and no token colours at all, and a theme with no `tokenColors` renders every language flat: one colour of text, no syntax. Each theme's token block is built from that theme's own accent and is marked inside the file as an addition — delete the block and the original file is untouched.

One change to the original files is worth knowing about, because it is not cosmetic: **Bright Teal declared `"type": "light"` while every surface in it is dark.** That setting decides which of VS Code's defaults every colour the theme does *not* name inherits from, so a light base would have dropped light-mode inputs, dropdowns and scrollbars into a dark editor. It now says `dark`, and the file itself carries that note.

## Notes, honestly

- Nothing is sent anywhere. There is no telemetry, no network call, and no account. All the colour maths is local.
- The contrast command reports the WCAG ratio (4.5:1 passes AA for normal text, 7:1 passes AAA, 3:1 is large text only). It does not tell you whether a colour is *good*, only whether it is readable.
- A colour provider runs on every edit, so files over 400,000 characters are skipped rather than turned into a stutter.
- Files with an unfamiliar extension still work: add that language id (or `"*"`) to `sidsColours.languages`.

## Install

- **From the Marketplace**: search for **Sids Colours** in the Extensions view.
- **From a file**: download the `.vsix` and run *Extensions: Install from VSIX…* from the command palette.
- **From source**: `git clone https://github.com/Sir0Sid/Sids-Colours.git`, then `npm install && npm run compile`, then press <kbd>F5</kbd> in VS Code to launch an Extension Development Host with the extension loaded.

## Building and publishing

The source lives at <https://github.com/Sir0Sid/Sids-Colours>, and the publisher id is `Sir0Sid`.

```bash
npm install
npm run compile        # tsc
npm run package        # writes sids-colours-<version>.vsix
```

To publish to the Marketplace you need that publisher account and a Personal Access Token with the **Marketplace → Manage** scope, and then:

```bash
npx @vscode/vsce login Sir0Sid
npx @vscode/vsce publish
```

The `publisher` field in `package.json` (and `repository`, `homepage` and `bugs`) must match the real account. The workflow in `.github/workflows/publish.yml` publishes automatically when a release is published, using a `VSCE_PAT` repository secret, and attaches the packaged `.vsix` to the release.

## License

MIT.
