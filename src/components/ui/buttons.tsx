import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, font, radius, space } from '../../lib/theme';
import { tap } from './haptics';

export type IconName = keyof typeof Ionicons.glyphMap;

/** The signature round play button. */
export function PlayButton({ playing, onPress, size = 56, label }: { playing?: boolean; onPress: () => void; size?: number; label?: string }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label ?? (playing ? 'Pause' : 'Play')}
      style={({ pressed }) => [styles.play, { width: size, height: size, borderRadius: size / 2 }, pressed && styles.playPressed]}>
      <Ionicons name={playing ? 'pause' : 'play'} size={size * 0.46} color={colors.accentInk} style={{ marginLeft: playing ? 0 : size * 0.05 }} />
    </Pressable>
  );
}

export function IconButton({ name, onPress, size = 24, color = colors.textMuted, label, active }: {
  name: IconName; onPress: () => void; size?: number; color?: string; label: string; active?: boolean;
}) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.icon, pressed && styles.dimmed]}>
      <Ionicons name={name} size={size} color={active ? colors.accent : color} />
    </Pressable>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style, small }: {
  label: string; onPress: () => void; variant?: ButtonVariant;
  icon?: IconName; loading?: boolean; disabled?: boolean; style?: ViewStyle; small?: boolean;
}) {
  const fg = variant === 'primary' ? colors.accentInk : colors.text;
  return (
    <Pressable accessibilityRole="button" onPress={() => { tap(); onPress(); }} disabled={disabled || loading}
      style={({ pressed }) => [styles.button, small && styles.buttonSmall, variantStyles[variant], disabled && styles.disabled, pressed && styles.buttonPressed, style]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={small ? 15 : 18} color={fg} /> : null}
      <Text style={[styles.buttonLabel, small && styles.buttonLabelSmall, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceRaised },
  outline: { borderWidth: 1.5, borderColor: colors.text },
  ghost: {},
});

const styles = StyleSheet.create({
  play: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  playPressed: { transform: [{ scale: 0.94 }] },
  icon: { padding: 2 },
  dimmed: { opacity: 0.6 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: 15, paddingHorizontal: space.xl, borderRadius: radius.lg },
  buttonSmall: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill },
  buttonPressed: { transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.45 },
  buttonLabel: { fontFamily: font.display, fontSize: 16 },
  buttonLabelSmall: { fontSize: 13 },
  chip: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  chipActive: { backgroundColor: colors.accent },
  chipLabel: { fontFamily: font.bold, fontSize: 14, color: colors.text },
  chipLabelActive: { color: colors.accentInk },
});
