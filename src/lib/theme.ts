// Black, gold and red — Uganda's own colours. The page is a near-black with a little warmth in it, so
// the photography of artists belongs on it rather than being tolerated by it. Gold is the money colour
// and carries every action: Buy, prices, the song that is playing. Red appears only as a short rule
// under a heading, the way a flag shows a stripe: never a fill, never a button, never more than a mark.
export const colors = {
  bg: '#0A0A09',
  surface: '#17120D', // cards
  surfaceRaised: '#211810', // the player, lifted rows
  surfacePress: '#2B2016',
  border: '#2A2018',
  text: '#F7F4EF', // warm white
  textMuted: '#A49A8C',
  textFaint: '#6F675C',
  accent: '#F0A519', // gold
  accentText: '#F0A519', // gold reads cleanly as type on this black, so it needs no lighter twin
  accentInk: '#140E04', // type on a gold fill
  accentSoft: '#2A1E08', // gold held back: tinted fills, the pill around an icon
  flag: '#F41F1E', // the rule under a heading, and the dot on the bell
  owned: '#211810', // owning something is quiet; buying is the loud one
  ownedInk: '#F0A519',
  ink: '#070706', // the darkest layer: the tab bar, a scrim
  success: '#54C27A',
  danger: '#FF5A4F', // not the flag red, so an error never reads as a heading rule
  momo: '#FFCB05', // MTN's own yellow
  airtel: '#E40000', // Airtel's own red
};

/** The app is dark throughout; these stay for the few places that still ask for them by name. */
export const onDark = {
  bg: colors.ink,
  surface: colors.surfaceRaised,
  text: colors.text,
  textMuted: colors.textMuted,
  accentText: colors.accent,
};

// Poppins throughout: geometric, round, and even in colour, which is what lets a heading sit tight
// against a photograph without looking busy.
export const font = {
  wordmark: 'Poppins_700Bold',
  display: 'Poppins_700Bold', // hero and screen titles
  displayBold: 'Poppins_700Bold',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_600SemiBold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

export const type = {
  hero: { fontFamily: font.display, fontSize: 36, lineHeight: 42, letterSpacing: -0.8, color: colors.text },
  display: { fontFamily: font.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: colors.text },
  title: { fontFamily: font.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: colors.text },
  heading: { fontFamily: font.display, fontSize: 19, lineHeight: 25, letterSpacing: -0.2, color: colors.text },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.text },
  bodyBold: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22, color: colors.text },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  smallBold: { fontFamily: font.semibold, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  tiny: { fontFamily: font.medium, fontSize: 11, lineHeight: 15, color: colors.textMuted },
  /** An artist's name, spaced out the way a sleeve credits one. */
  caps: { fontFamily: font.medium, fontSize: 11, lineHeight: 16, letterSpacing: 2.4, color: colors.textMuted },
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
