import React from 'react';
import { View } from 'react-native';
import { GLYPHS, GlyphName } from './pixelIcons';

// Renderiza un glifo pixel-art como grilla de Views (sin SVG ni libreria de
// iconos): cada caracter de GLYPHS[name] es una celda cuadrada, pintada con
// `color` si es "X" o transparente si es ".".
export function PixelIcon({
  name,
  size,
  color,
}: {
  name: GlyphName;
  size: number;
  color: string;
}) {
  const glyph = GLYPHS[name];
  const cell = size / glyph.length;
  return (
    <View style={{ width: size, height: size }}>
      {glyph.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {row.split('').map((ch, x) => (
            <View
              key={x}
              style={{
                width: cell,
                height: cell,
                backgroundColor: ch === 'X' ? color : 'transparent',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
