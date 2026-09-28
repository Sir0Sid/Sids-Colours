# Change Log

## 0.1.0

First release.

- Colour squares in the gutter for `#hex`, `#rgb`, `#rrggbbaa`, `rgb()`/`rgba()` and `hsl()`/`hsla()` in every language VS Code does not already cover itself, with an optional switch for the 148 CSS colour names.
- Clicking a square opens the real colour picker, and the chosen colour is written back in the notation the file already used.
- Commands: insert from your own palette, show the palette, insert a typed colour, convert, copy as (including a CSS variable named from the palette), save to the palette, and a WCAG contrast check.
- The palette picker shows each colour as its actual colour, using swatch images drawn at runtime — no bundled assets.
