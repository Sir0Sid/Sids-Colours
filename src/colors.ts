/* ================================================================
   Sids Colours - the colour maths, and nothing else.

   No `vscode` import anywhere in this file, on purpose: it is plain
   TypeScript that node can run on its own, so every parse, conversion
   and contrast figure can be checked without opening an editor.
   Whatever the extension claims about a colour is decided here.
   ================================================================ */

/** A colour, in the only form the maths needs: channels 0-255, alpha 0-1. */
export interface Rgba {
    r: number;
    g: number;
    b: number;
    a: number;
}

/** How a colour was WRITTEN where it was found. Used to write a new
 *  value back in the same shape the file already uses - a hex stays
 *  hex, an `hsl()` stays `hsl()`. */
export type Notation = 'hex' | 'hex8' | 'rgb' | 'rgba' | 'hsl' | 'hsla' | 'name';

/** A colour found in text, by character offsets. */
export interface ColourMatch {
    start: number;
    end: number;
    text: string;
    colour: Rgba;
    notation: Notation;
}

/** The shapes a colour can be copied or written out as. */
export type CopyFormat = 'hex' | 'hex8' | 'rgb' | 'hsl' | 'cssvar' | 'php' | 'json';

/**
 * The CSS colour names, all 148 of them.
 *
 * Generated from the published list rather than typed, because a
 * mistyped hex in a table like this is the worst kind of wrong: it
 * looks like a colour, it reports as a colour, and nothing anywhere
 * says it is the wrong one.
 */
const NAMED_HEX: Record<string, string> = Object.fromEntries(
    ('aliceblue=f0f8ff,antiquewhite=faebd7,aqua=00ffff,aquamarine=7fffd4,azure=f0ffff,beige=f5f5dc,'
    + 'bisque=ffe4c4,black=000000,blanchedalmond=ffebcd,blue=0000ff,blueviolet=8a2be2,brown=a52a2a,'
    + 'burlywood=deb887,cadetblue=5f9ea0,chartreuse=7fff00,chocolate=d2691e,coral=ff7f50,'
    + 'cornflowerblue=6495ed,cornsilk=fff8dc,crimson=dc143c,cyan=00ffff,darkblue=00008b,darkcyan=008b8b,'
    + 'darkgoldenrod=b8860b,darkgray=a9a9a9,darkgreen=006400,darkgrey=a9a9a9,darkkhaki=bdb76b,'
    + 'darkmagenta=8b008b,darkolivegreen=556b2f,darkorange=ff8c00,darkorchid=9932cc,darkred=8b0000,'
    + 'darksalmon=e9967a,darkseagreen=8fbc8f,darkslateblue=483d8b,darkslategray=2f4f4f,'
    + 'darkslategrey=2f4f4f,darkturquoise=00ced1,darkviolet=9400d3,deeppink=ff1493,deepskyblue=00bfff,'
    + 'dimgray=696969,dimgrey=696969,dodgerblue=1e90ff,firebrick=b22222,floralwhite=fffaf0,'
    + 'forestgreen=228b22,fuchsia=ff00ff,gainsboro=dcdcdc,ghostwhite=f8f8ff,gold=ffd700,'
    + 'goldenrod=daa520,gray=808080,green=008000,greenyellow=adff2f,grey=808080,honeydew=f0fff0,'
    + 'hotpink=ff69b4,indianred=cd5c5c,indigo=4b0082,ivory=fffff0,khaki=f0e68c,lavender=e6e6fa,'
    + 'lavenderblush=fff0f5,lawngreen=7cfc00,lemonchiffon=fffacd,lightblue=add8e6,lightcoral=f08080,'
    + 'lightcyan=e0ffff,lightgoldenrodyellow=fafad2,lightgray=d3d3d3,lightgreen=90ee90,lightgrey=d3d3d3,'
    + 'lightpink=ffb6c1,lightsalmon=ffa07a,lightseagreen=20b2aa,lightskyblue=87cefa,'
    + 'lightslategray=778899,lightslategrey=778899,lightsteelblue=b0c4de,lightyellow=ffffe0,lime=00ff00,'
    + 'limegreen=32cd32,linen=faf0e6,magenta=ff00ff,maroon=800000,mediumaquamarine=66cdaa,'
    + 'mediumblue=0000cd,mediumorchid=ba55d3,mediumpurple=9370db,mediumseagreen=3cb371,'
    + 'mediumslateblue=7b68ee,mediumspringgreen=00fa9a,mediumturquoise=48d1cc,mediumvioletred=c71585,'
    + 'midnightblue=191970,mintcream=f5fffa,mistyrose=ffe4e1,moccasin=ffe4b5,navajowhite=ffdead,'
    + 'navy=000080,oldlace=fdf5e6,olive=808000,olivedrab=6b8e23,orange=ffa500,orangered=ff4500,'
    + 'orchid=da70d6,palegoldenrod=eee8aa,palegreen=98fb98,paleturquoise=afeeee,palevioletred=db7093,'
    + 'papayawhip=ffefd5,peachpuff=ffdab9,peru=cd853f,pink=ffc0cb,plum=dda0dd,powderblue=b0e0e6,'
    + 'purple=800080,rebeccapurple=663399,red=ff0000,rosybrown=bc8f8f,royalblue=4169e1,'
    + 'saddlebrown=8b4513,salmon=fa8072,sandybrown=f4a460,seagreen=2e8b57,seashell=fff5ee,sienna=a0522d,'
    + 'silver=c0c0c0,skyblue=87ceeb,slateblue=6a5acd,slategray=708090,slategrey=708090,snow=fffafa,'
    + 'springgreen=00ff7f,steelblue=4682b4,tan=d2b48c,teal=008080,thistle=d8bfd8,tomato=ff6347,'
    + 'turquoise=40e0d0,violet=ee82ee,wheat=f5deb3,white=ffffff,whitesmoke=f5f5f5,yellow=ffff00,'
    + 'yellowgreen=9acd32')
        .split(',')
        .map((pair) => pair.split('='))
        .map((parts) => [parts[0], parts[1]] as [string, string]),
);

/** Every name, for the settings/tests to be able to ask. */
export function colourNames(): string[] {
    return Object.keys(NAMED_HEX);
}

function clamp(value: number, low: number, high: number): number {
    return value < low ? low : value > high ? high : value;
}

function round(value: number, places: number): number {
    const factor = Math.pow(10, places);
    return Math.round(value * factor) / factor;
}

/* ── Reading a colour ────────────────────────────────────────────── */

function parseHex(text: string): Rgba | null {
    let hex = text.slice(1);
    if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
    if (hex.length === 3 || hex.length === 4) {
        hex = hex
            .split('')
            .map((character) => character + character)
            .join('');
    }
    if (hex.length === 6) hex += 'ff';
    if (hex.length !== 8) return null;
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
    };
}

function parseAlpha(part: string): number {
    const value = parseFloat(part);
    if (Number.isNaN(value)) return 1;
    const alpha = part.trim().endsWith('%') ? value / 100 : value;
    return clamp(alpha, 0, 1);
}

function parseChannel(part: string): number {
    const value = parseFloat(part);
    if (Number.isNaN(value)) return NaN;
    return clamp(part.trim().endsWith('%') ? value * 2.55 : value, 0, 255);
}

function parseRgbArgs(args: string): Rgba | null {
    const parts = args.split(/[,\s/]+/).filter((part) => part !== '');
    if (parts.length < 3) return null;
    const r = parseChannel(parts[0]);
    const g = parseChannel(parts[1]);
    const b = parseChannel(parts[2]);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return {
        r: Math.round(r),
        g: Math.round(g),
        b: Math.round(b),
        a: parts.length > 3 ? parseAlpha(parts[3]) : 1,
    };
}

export function hslToRgb(hue: number, saturation: number, lightness: number): Rgba {
    const h = ((hue % 360) + 360) % 360;
    const s = clamp(saturation, 0, 1);
    const l = clamp(lightness, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rgb: number[];
    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    return {
        r: Math.round((rgb[0] + m) * 255),
        g: Math.round((rgb[1] + m) * 255),
        b: Math.round((rgb[2] + m) * 255),
        a: 1,
    };
}

export function rgbToHsl(colour: Rgba): { h: number; s: number; l: number } {
    const r = colour.r / 255;
    const g = colour.g / 255;
    const b = colour.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const spread = max - min;
    let h = 0;
    let s = 0;
    if (spread !== 0) {
        s = l > 0.5 ? spread / (2 - max - min) : spread / (max + min);
        if (max === r) h = (g - b) / spread + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / spread + 2;
        else h = (r - g) / spread + 4;
        h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function parseHslArgs(args: string): Rgba | null {
    const parts = args.split(/[,\s/]+/).filter((part) => part !== '');
    if (parts.length < 3) return null;
    const h = parseFloat(parts[0].replace(/deg$/i, ''));
    const s = parseFloat(parts[1]);
    const l = parseFloat(parts[2]);
    if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) return null;
    const colour = hslToRgb(h, s / 100, l / 100);
    colour.a = parts.length > 3 ? parseAlpha(parts[3]) : 1;
    return colour;
}

/**
 * Anything a colour is ever written as: hex in 3, 4, 6 or 8 digits,
 * `rgb()`/`rgba()`, `hsl()`/`hsla()`, the 148 CSS names, and
 * `transparent`. Returns null for everything else, which is the
 * important half - a colour parser that guesses is worse than one that
 * refuses.
 */
export function parseColour(input: string): Rgba | null {
    const text = input.trim();
    if (text === '') return null;
    if (text.startsWith('#')) return parseHex(text);
    const call = /^(rgba?|hsla?)\(([^)]*)\)$/i.exec(text);
    if (call) {
        return call[1].toLowerCase().startsWith('rgb')
            ? parseRgbArgs(call[2])
            : parseHslArgs(call[2]);
    }
    const lower = text.toLowerCase();
    if (lower === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const named = NAMED_HEX[lower];
    return named ? parseHex('#' + named) : null;
}

/* ── Writing a colour back out ───────────────────────────────────── */

function channel(n: number): string {
    return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
}

export function toHex(colour: Rgba, withAlpha = false): string {
    const base = '#' + channel(colour.r) + channel(colour.g) + channel(colour.b);
    if (!withAlpha) return base;
    return base + channel(colour.a * 255);
}

export function toRgb(colour: Rgba): string {
    const r = Math.round(colour.r);
    const g = Math.round(colour.g);
    const b = Math.round(colour.b);
    if (colour.a >= 1) return `rgb(${r}, ${g}, ${b})`;
    return `rgba(${r}, ${g}, ${b}, ${round(colour.a, 2)})`;
}

export function toHsl(colour: Rgba): string {
    const hsl = rgbToHsl(colour);
    if (colour.a >= 1) return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${round(colour.a, 2)})`;
}

/** `My Colour Name` becomes `my-colour-name`, for a CSS variable. */
export function slug(text: string): string {
    return (
        text
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'colour'
    );
}

export function formatColour(colour: Rgba, format: CopyFormat, name = 'colour'): string {
    const opaque = colour.a >= 1;
    switch (format) {
        case 'hex':
            return toHex(colour, opaque ? false : true);
        case 'hex8':
            return toHex(colour, true);
        case 'rgb':
            return toRgb(colour);
        case 'hsl':
            return toHsl(colour);
        case 'cssvar':
            return `--${slug(name)}: ${toHex(colour, opaque ? false : true)};`;
        case 'php':
            return `'${toHex(colour, opaque ? false : true)}'`;
        case 'json':
            return `"${toHex(colour, opaque ? false : true)}"`;
        default:
            return toHex(colour, true);
    }
}

/** The label shown next to a format in the picker is the format's own output,
 *  so there is nothing to believe: you read what you are about to get. */
export const COPY_FORMATS: { id: CopyFormat; label: string }[] = [
    { id: 'hex', label: 'Hex' },
    { id: 'hex8', label: 'Hex with alpha' },
    { id: 'rgb', label: 'rgb()' },
    { id: 'hsl', label: 'hsl()' },
    { id: 'cssvar', label: 'CSS variable' },
    { id: 'php', label: 'PHP string' },
    { id: 'json', label: 'JSON string' },
];

/* ── Finding colours in a file ───────────────────────────────────── */

const NUMBER = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)';
const HEX_PATTERN = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b/g;
const FUNCTION_PATTERN = new RegExp(
    '(rgba?|hsla?)\\(\\s*' +
        NUMBER +
        '(?:%|deg)?\\s*(?:,|\\s)\\s*' +
        NUMBER +
        '%?\\s*(?:,|\\s)\\s*' +
        NUMBER +
        '%?\\s*(?:(?:,|/)\\s*' +
        NUMBER +
        '%?\\s*)?\\)',
    'gi'
);
const WORD_PATTERN = /[a-zA-Z]{3,}/g;

/**
 * How a piece of text was written. This is the question the picker
 * asks about the colour already in the file, because the shape that
 * was there is the shape to write back.
 */
export function notationOfText(text: string): Notation {
    const trimmed = text.trim();
    if (trimmed.startsWith('#')) {
        const digits = trimmed.length - 1;
        return digits === 8 || digits === 4 ? 'hex8' : 'hex';
    }
    const call = /^([a-z]+)/i.exec(trimmed);
    if (call) {
        const fn = call[1].toLowerCase();
        if (fn === 'rgb' || fn === 'rgba' || fn === 'hsl' || fn === 'hsla') return fn;
    }
    return 'name';
}

/**
 * Every colour in a piece of text, in order, as character offsets.
 *
 * `named` is off by default in the settings and is off by default
 * here: the word "white" in a sentence is not a colour, and a square
 * under it is noise dressed as information.
 */
export function findColours(text: string, named = false): ColourMatch[] {
    const found: ColourMatch[] = [];

    const push = (start: number, end: number) => {
        const raw = text.slice(start, end);
        const colour = parseColour(raw);
        if (!colour) return;
        found.push({ start, end, text: raw, colour, notation: notationOfText(raw) });
    };

    FUNCTION_PATTERN.lastIndex = 0;
    for (let m = FUNCTION_PATTERN.exec(text); m !== null; m = FUNCTION_PATTERN.exec(text)) {
        push(m.index, m.index + m[0].length);
    }

    HEX_PATTERN.lastIndex = 0;
    for (let m = HEX_PATTERN.exec(text); m !== null; m = HEX_PATTERN.exec(text)) {
        push(m.index, m.index + m[0].length);
    }

    if (named) {
        WORD_PATTERN.lastIndex = 0;
        for (let m = WORD_PATTERN.exec(text); m !== null; m = WORD_PATTERN.exec(text)) {
            const word = m[0].toLowerCase();
            if (word === 'transparent' || Object.prototype.hasOwnProperty.call(NAMED_HEX, word)) {
                push(m.index, m.index + m[0].length);
            }
        }
    }

    found.sort((a, b) => a.start - b.start || a.end - b.end);

    /* A named colour can sit inside nothing, but a hex can sit inside a
       longer run of hex characters that the pattern already refused -
       and two matches can never share a character. Drop the overlaps
       rather than let a caller draw the same square twice. */
    const clean: ColourMatch[] = [];
    let cursor = -1;
    for (const match of found) {
        if (match.start < cursor) continue;
        clean.push(match);
        cursor = match.end;
    }
    return clean;
}

/** The colour the caret is inside, if it is inside one. */
export function matchAt(matches: ColourMatch[], offset: number): ColourMatch | null {
    for (const match of matches) {
        if (offset >= match.start && offset <= match.end) return match;
    }
    return null;
}

/** The name this colour already has in the palette, if it has one. */
export function paletteNameFor(
    palette: { name: string; value: string }[],
    colour: Rgba
): string | null {
    const wanted = toHex(colour, true);
    for (const entry of palette) {
        const parsed = parseColour(entry.value);
        if (parsed && toHex(parsed, true) === wanted) return entry.name;
    }
    return null;
}

/* ── Readability: the WCAG contrast ratio ────────────────────────── */

export function relativeLuminance(colour: Rgba): number {
    const linear = (value: number): number => {
        const channelValue = value / 255;
        return channelValue <= 0.03928
            ? channelValue / 12.92
            : Math.pow((channelValue + 0.055) / 1.055, 2.4);
    };
    return (
        0.2126 * linear(colour.r) + 0.7152 * linear(colour.g) + 0.0722 * linear(colour.b)
    );
}

export function contrastRatio(a: Rgba, b: Rgba): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const lighter = Math.max(la, lb);
    const darker = Math.min(la, lb);
    return round((lighter + 0.05) / (darker + 0.05), 2);
}

export interface ContrastVerdict {
    ratio: number;
    /** The strictest WCAG level the pair passes. */
    level: 'AAA' | 'AA' | 'AA large only' | 'fails';
    bigTextOnly: boolean;
    readable: boolean;
}

export function contrastVerdict(ratio: number): ContrastVerdict {
    const level: ContrastVerdict['level'] =
        ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large only' : 'fails';
    return {
        ratio,
        level,
        bigTextOnly: ratio >= 3 && ratio < 4.5,
        readable: ratio >= 4.5,
    };
}

/** Which of black or white reads better on this colour. */
export function readableTextOn(background: Rgba): Rgba {
    const black: Rgba = { r: 0, g: 0, b: 0, a: 1 };
    const white: Rgba = { r: 255, g: 255, b: 255, a: 1 };
    return contrastRatio(background, black) >= contrastRatio(background, white) ? black : white;
}
