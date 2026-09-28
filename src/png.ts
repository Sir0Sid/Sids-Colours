/* ================================================================
   Sids Colours - tiny PNG writer.

   Why this exists at all: a VS Code quick pick cannot colour a row of
   text. The only way to show a LIST OF COLOURS as colours is to hand
   each row an image, so the palette picker needs a small PNG per
   colour. Node already has zlib built in, so a PNG is about sixty
   lines and no dependency at all - which is worth it, because a
   palette picker that reads

       Sky      #38bdf8
       Coral    #fb7185

   is a list of words, and the same list with the colour beside it is
   the thing the extension is for.

   Nothing here imports `vscode`: it is plain node, so the images it
   produces can be written to disk and looked at.
   ================================================================ */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { Rgba } from './colors';

const CRC_TABLE: number[] = (() => {
    const table: number[] = [];
    for (let n = 0; n < 256; n++) {
        let value = n;
        for (let bit = 0; bit < 8; bit++) {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }
        table[n] = value >>> 0;
    }
    return table;
})();

function crc32(buffer: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([length, body, crc]);
}

/** An 8-bit RGBA PNG, pixel by pixel. */
export function pngBuffer(
    width: number,
    height: number,
    pixel: (x: number, y: number) => number[]
): Buffer {
    const raw = Buffer.alloc(height * (1 + width * 4));
    let at = 0;
    for (let y = 0; y < height; y++) {
        raw[at++] = 0; // filter: none
        for (let x = 0; x < width; x++) {
            const parts = pixel(x, y);
            raw[at++] = parts[0] & 0xff;
            raw[at++] = parts[1] & 0xff;
            raw[at++] = parts[2] & 0xff;
            raw[at++] = parts[3] & 0xff;
        }
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8; // bit depth
    header[9] = 6; // colour type: RGBA
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header),
        chunk('IDAT', zlib.deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

function clamp01(value: number): number {
    return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Signed distance to a rounded rectangle centred on 0,0 - negative inside. */
function distanceToRoundedRect(
    x: number,
    y: number,
    halfWidth: number,
    halfHeight: number,
    radius: number
): number {
    const dx = Math.abs(x) - (halfWidth - radius);
    const dy = Math.abs(y) - (halfHeight - radius);
    const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
    const inside = Math.min(Math.max(dx, dy), 0);
    return outside + inside - radius;
}

function shade(colour: Rgba, amount: number): Rgba {
    return {
        r: Math.round(colour.r * (1 - amount)),
        g: Math.round(colour.g * (1 - amount)),
        b: Math.round(colour.b * (1 - amount)),
        a: colour.a,
    };
}

/**
 * One colour as a swatch: a rounded square of the colour itself with a
 * darker rim, so a pale colour is still visible on a pale background
 * and a dark one on a dark background.
 */
export function swatchPng(colour: Rgba, size = 32): Buffer {
    const margin = 2;
    const half = (size - margin * 2) / 2;
    const radius = Math.max(2, Math.round(half * 0.4));
    const rim = 1.6;
    const edge = shade(colour, 0.35);
    return pngBuffer(size, size, (x, y) => {
        const distance = distanceToRoundedRect(
            x - size / 2 + 0.5,
            y - size / 2 + 0.5,
            half,
            half,
            radius
        );
        const coverage = clamp01(0.5 - distance);
        if (coverage <= 0) return [0, 0, 0, 0];
        const inner = distance > -rim ? edge : colour;
        // The swatch keeps the colour's own alpha: a half-transparent
        // colour is shown half transparent, not flattened into a lie.
        return [
            inner.r,
            inner.g,
            inner.b,
            Math.round(coverage * 255 * clamp01(colour.a)),
        ];
    });
}

/** Colour -> written swatch file, cached by value so a palette of ten
 *  colours does not rewrite ten images every time it is opened. */
const written = new Map<string, string>();

export function ensureSwatch(dir: string, colour: Rgba, key: string): string | null {
    const cached = written.get(key);
    if (cached) return cached;
    try {
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, 'swatch-' + key.replace(/[^a-z0-9]/gi, '') + '.png');
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, swatchPng(colour));
        }
        written.set(key, file);
        return file;
    } catch {
        /* A picture beside a colour is a nicety; if the disk says no,
           the palette still works with names and hexes. */
        return null;
    }
}
