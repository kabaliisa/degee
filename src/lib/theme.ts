// Deegee runs black and green. The page is a near-black that leans very slightly green, so warm
// photographs of artists sit on it without a colour fight. Panels lift off it in charcoal; the dark
// headers carry a deep forest wash so a screen still has a top and a body rather than being one black
// sheet. Green is the money colour and is spent only where money is: prices, Buy, Owned, paid out.
export const colors = {
  bg: '#0A0C0A', // near-black, a touch of green in it
  surface: '#121613', // cards, rows, inputs
  surfaceRaised: '#1A201B',
  surfacePress: '#232A24',
  border: '#232A24',
  text: '#F1F3EE', // warm off-white, not a clinical white
  textMuted: '#99A398',
  textFaint: '#6A7369',
  accent: '#2FD96B', // the one green: actions and prices
  accentText: '#58E88A', // lighter, for green set as text on the dark
  accentInk: '#06130B', // text on a green fill
  accentSoft: '#123520', // deep forest: tinted fills and the header wash
  lime: '#2FD96B', // kept for the owned state, now the same green
  limeInk: '#06130B',
  ink: '#070907', // the darkest layer: headers, the player, the tab bar
  success: '#2FD96B',
  danger: '#FF6B6B', // reds have to be lighter to read on black
  momo: '#FFCB05', // MTN's own yellow
  airtel: '#E40000', // Airtel's own red
};

/** Was the exception for dark screens; now the app is dark, so these line up with the main palette. */
export const onDark = {
  bg: colors.ink,
  surface: '#161C17',
  text: colors.text,
  textMuted: colors.textMuted,
  accentText: colors.accentText,
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
