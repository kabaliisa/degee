// Deegee: black, white and one blue. Blue is reserved for actions and "now playing";
// everything else is black, white and greys.
export const colors = {
  bg: '#000000',
  surface: '#141414',
  surfaceRaised: '#1F1F1F',
  surfacePress: '#2A2A2A',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textMuted: '#A7A7A7',
  textFaint: '#6E6E6E',
  accent: '#2F7BFF',
  accentInk: '#FFFFFF',
  success: '#2F7BFF',
  danger: '#FF5A4E',
  momo: '#FFCB05',
  airtel: '#E40000',
};

export const font = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { xs: 4, sm: 6, md: 10, lg: 16, pill: 999 };

export const type = {
  hero: { fontFamily: font.display, fontSize: 44, lineHeight: 46, letterSpacing: -1.2, color: colors.text },
  display: { fontFamily: font.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: colors.text },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, color: colors.text },
  heading: { fontFamily: font.displayBold, fontSize: 21, lineHeight: 26, letterSpacing: -0.3, color: colors.text },
  body: { fontFamily: font.medium, fontSize: 15, lineHeight: 20, color: colors.text },
  bodyBold: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: colors.text },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: colors.textMuted },
  smallBold: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, color: colors.textMuted },
  tiny: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14, color: colors.textMuted },
};

/** Mix a hex colour toward black (amount 0–1). Used for art-tinted backgrounds. */
export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * (1 - amount));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
export function withAlpha(hex: string, alpha: number) {
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}
