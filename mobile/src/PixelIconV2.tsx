import React from 'react';
import { View } from 'react-native';
import iconSet from './pixelIconSet.json';

// Set de iconos pixel-art de 131 piezas (categorias, pines de mapa, acciones,
// reacciones, estados) generado a partir de SVGs reales via
// scripts/convert-pixel-icons.js -- ver mobile/README para regenerar. Cada
// icono ya trae su propio color/sombreado "insignia con volumen" (fondo +
// contorno + luz/sombra), asi que NO va dentro de un circulo de color como
// los iconos viejos de PixelIcon.tsx: se renderiza solo, a tamano fijo.
const CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

type IconData = { w: number; h: number; palette: string[]; rows: string[] };
const ICONS: Record<string, IconData> = iconSet;

export type PixelIconV2Name = keyof typeof iconSet;

export function PixelIconV2({ name, size }: { name: PixelIconV2Name | string; size: number }) {
  const icon = ICONS[name as string];
  if (!icon) return null;
  const cellW = size / icon.w;
  const cellH = size / icon.h;
  return (
    <View style={{ width: size, height: size }}>
      {icon.rows.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {row.split('').map((ch, x) => (
            <View
              key={x}
              style={{
                width: cellW,
                height: cellH,
                backgroundColor: ch === '.' ? 'transparent' : icon.palette[CHARS.indexOf(ch)],
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// Reconstruye el mismo icono como SVG (rects por corrida de color, no uno
// por pixel) para el mapa: el WebView de Leaflet no puede montar componentes
// RN, pero si acepta HTML/SVG crudo como contenido de un L.divIcon.
export function pixelIconSvgMarkup(name: string, size: number): string {
  const icon = ICONS[name];
  if (!icon) return '';
  const sx = size / icon.w;
  const sy = size / icon.h;
  const rects: string[] = [];
  icon.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') {
        x++;
        continue;
      }
      let runEnd = x + 1;
      while (runEnd < row.length && row[runEnd] === ch) runEnd++;
      const color = icon.palette[CHARS.indexOf(ch)];
      rects.push(
        `<rect x="${(x * sx).toFixed(2)}" y="${(y * sy).toFixed(2)}" width="${((runEnd - x) * sx).toFixed(2)}" height="${sy.toFixed(2)}" fill="${color}"/>`
      );
      x = runEnd;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${(size * icon.h) / icon.w}" viewBox="0 0 ${size} ${(size * icon.h) / icon.w}" shape-rendering="crispEdges">${rects.join('')}</svg>`;
}
