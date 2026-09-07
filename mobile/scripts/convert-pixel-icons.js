// Convierte una carpeta de SVGs pixel-art (rects de 1x1, un <rect> por pixel
// o por corrida de pixels del mismo color) al JSON que consume
// src/PixelIconV2.tsx: { "carpeta/nombre": { w, h, palette: [hex...],
// rows: ["a1.b2...", ...] } } -- cada caracter de `rows` es un indice
// hex (0-9a-f) dentro de `palette`, o '.' si es transparente.
//
// Uso: node scripts/convert-pixel-icons.js <carpeta-svgs> src/pixelIconSet.json
//
// El set actual (131 iconos, en src/pixelIconSet.json) salio de un pack de
// SVGs que el usuario genero en otra conversacion de Claude y subio como
// zip; si se necesita regenerar con iconos nuevos/editados, hay que volver
// a correr este script contra esa carpeta de SVGs.
const fs = require('fs');
const path = require('path');

const SRC_DIR = process.argv[2];
const OUT_FILE = process.argv[3];

function parseSvg(content) {
  const viewBoxMatch = content.match(/viewBox="0 0 (\d+) (\d+)"/);
  const w = parseInt(viewBoxMatch[1], 10);
  const h = parseInt(viewBoxMatch[2], 10);
  const grid = Array.from({ length: h }, () => new Array(w).fill(null));
  const rectRe = /<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="(#[0-9A-Fa-f]{6})"/g;
  let m;
  while ((m = rectRe.exec(content))) {
    const [, x, y, rw, rh, fill] = m;
    const X = parseInt(x, 10), Y = parseInt(y, 10), RW = parseInt(rw, 10), RH = parseInt(rh, 10);
    for (let yy = Y; yy < Y + RH; yy++) {
      for (let xx = X; xx < X + RW; xx++) {
        if (grid[yy] && xx < w) grid[yy][xx] = fill.toUpperCase();
      }
    }
  }
  const palette = [];
  const paletteIndex = new Map();
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  const rows = grid.map((row) =>
    row
      .map((cell) => {
        if (!cell) return '.';
        if (!paletteIndex.has(cell)) {
          paletteIndex.set(cell, palette.length);
          palette.push(cell);
        }
        return chars[paletteIndex.get(cell)];
      })
      .join('')
  );
  return { w, h, palette, rows };
}

function walk(dir, base = '') {
  const out = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(out, walk(full, base ? `${base}/${entry.name}` : entry.name));
    } else if (entry.name.endsWith('.svg')) {
      const key = (base ? `${base}/${entry.name}` : entry.name).replace(/\.svg$/, '');
      const content = fs.readFileSync(full, 'utf8');
      try {
        out[key] = parseSvg(content);
      } catch (e) {
        console.error('FAILED', key, e.message);
      }
    }
  }
  return out;
}

const data = walk(SRC_DIR);
const count = Object.keys(data).length;
fs.writeFileSync(OUT_FILE, JSON.stringify(data));
console.log(`Converted ${count} icons -> ${OUT_FILE}`);
