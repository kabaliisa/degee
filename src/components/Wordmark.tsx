import { StyleSheet, Text, type TextStyle } from 'react-native';
import { colors, font } from '../lib/theme';

/** The "deegee" wordmark: lowercase, rounded and coral. */
export function Wordmark({ size = 30, style }: { size?: number; style?: TextStyle }) {
  return (
    <Text accessibilityRole="header" accessibilityLabel="Deegee" style={[styles.mark, { fontSize: size, letterSpacing: -size * 0.04, lineHeight: size * 1.15 }, style]}>
      deegee
    </Text>
  );
}

const styles = StyleSheet.create({
  mark: { fontFamily: font.wordmark, color: colors.accent },
});
