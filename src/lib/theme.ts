// Deegee palette: warm night-time party feel — dark earth background, drum-skin amber accent.
export const colors = {
  bg: '#14110F',
  surface: '#1F1A17',
  surfaceRaised: '#2A231F',
  border: '#3A302A',
  text: '#F7EFE6',
  textMuted: '#B8A99A',
  textFaint: '#7D6F63',
  accent: '#F2A541',
  accentInk: '#1B1208',
  success: '#7BC67E',
  danger: '#F07167',
  momo: '#FFCB05',
  airtel: '#E40000',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

export const type = {
  display: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.5, color: colors.text },
  title: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.textMuted },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const, color: colors.textFaint },
};
