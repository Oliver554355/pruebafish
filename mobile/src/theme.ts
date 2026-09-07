// Sistema de diseño único para toda la app: tema oscuro, inspirado en el
// mockup de referencia (fondo azul-negro profundo, tarjetas elevadas,
// badges de categoría a todo color, acentos celestes). Cualquier pantalla
// nueva debe construirse con estos tokens, no con colores sueltos.

export const colors = {
  // Fondos, de más profundo a más elevado.
  bg: '#0B1220',
  surface: '#141B2E',
  surfaceAlt: '#1B2438',
  border: '#263248',

  // Texto.
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textFaint: '#5B6B85',

  // Acento de marca.
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  onPrimary: '#FFFFFF',

  // Semánticos.
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#EAB308',

  overlay: 'rgba(0,0,0,0.55)',
};

// Fuente pixel-art (Press Start 2P) linkeada a mano como asset nativo de
// Android, sin pasar por expo-font -- evita un `expo prebuild` (que rompe
// usesCleartextTraffic/local.properties cada vez que corre). El .ttf vive
// en dos lugares: mobile/assets/fonts/ (trackeado por git, fuente de
// verdad) y android/app/src/main/assets/fonts/ (donde Android realmente
// lo lee, pero esa carpeta esta en .gitignore y se borra en cada prebuild
// -- hay que volver a copiarlo ahi despues de cada `expo prebuild`, igual
// que usesCleartextTraffic/local.properties). fontWeight tiene que quedar
// en 'normal' donde se use esta fuente: con cualquier otro peso, Android
// busca un archivo "PressStart2P-Regular_bold.ttf" que no existe y cae en
// silencio a la fuente del sistema.
export const fonts = {
  pixel: 'PressStart2P-Regular',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '800' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.text },
  bodyMuted: { fontSize: 13, fontWeight: '400' as const, color: colors.textMuted },
  caption: { fontSize: 12, fontWeight: '500' as const, color: colors.textMuted },
};

// Sombra sutil para tarjetas elevadas sobre el fondo oscuro (Android usa
// elevation, iOS usa shadow* -- se ponen los dos).
export const cardShadow = {
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 6,
};

export const card = {
  backgroundColor: colors.surface,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.lg,
  ...cardShadow,
};
