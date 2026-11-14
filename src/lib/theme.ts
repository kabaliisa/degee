// Deegee: warm ivory screens, ink-black type and dark "stage" moments (the player), coral for
// actions and what's playing, and a soft lime only for good news (Owned, Live, growth).
export const colors = {
  bg: '#F8F5EE', // warm ivory
  surface: '#FFFFFF',
  surfaceRaised: '#EFEAE1',
  surfacePress: '#E7E1D6',
  border: '#E7E1D6',
  text: '#101014', // ink black
  textMuted: '#5F5A52',
  textFaint: '#8A8378',
  accent: '#FF633E', // coral: fills, icons, the wordmark
  accentText: '#C2381A', // coral dark enough to read as text on ivory
  accentInk: '#FFFFFF', // text on coral buttons
  lime: '#C8F56A',
  limeInk: '#101014',
  ink: '#101014',
  success: '#2F7D32',
  danger: '#C62828',
  momo: '#FFCB05',
  airtel: '#E40000',
};

/** Colours for the dark "stage" screens (the player) and dark cards. */
export const onDark = {
  bg: '#101014',
  surface: '#1C1C22',
  text: '#FFFFFF',
  textMuted: '#B9B5AD',
  accentText: '#FF8A6B',
};

// One family does almost everything: Plus Jakarta Sans, heavy and geometric for headings, clean for
// reading. The wordmark alone is Nunito Black, for its rounded, friendly letters.
export const font = {
  wordmark: 'Nunito_900Black',
  display: 'PlusJakartaSans_800ExtraBold', // hero and screen titles
  displayBold: 'PlusJakartaSans_700Bold', // section and card headings
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

export const type = {
  hero: { fontFamily: font.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: colors.text },
  display: { fontFamily: font.display, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, color: colors.text },
  title: { fontFamily: font.display, fontSize: 23, lineHeight: 28, letterSpacing: -0.5, color: colors.text },
  heading: { fontFamily: font.display, fontSize: 20, lineHeight: 25, letterSpacing: -0.4, color: colors.text },
  body: { fontFamily: font.medium, fontSize: 15, lineHeight: 21, color: colors.text },
  bodyBold: { fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: colors.text },
  small: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  smallBold: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  tiny: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14, color: colors.textMuted },
};

/** Mix a hex colour toward black (amount 0–1). Used for art-tinted backgrounds. */
export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * (1 - amount));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
/** Mix a hex colour toward white (amount 0–1). Used for light art-tinted backgrounds. */
export function tint(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c + (255 - c) * amount);
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
export function withAlpha(hex: string, alpha: number) {
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

/** Shared layout measurements. */
export const layout = {
  tabScreenBottom: 170, // room for the floating mini player + tab bar on tab screens
  detailScreenBottom: 140, // room for the floating mini player on detail screens
};
