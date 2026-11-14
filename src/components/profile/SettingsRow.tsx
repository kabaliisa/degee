import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, radius, space, type } from '../../lib/theme';
import { tap, type IconName } from '../ui';

export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      {title ? <Text style={[type.smallBold, styles.groupTitle]}>{title}</Text> : null}
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

// react-native-web reads the "on" thumb colour from this prop; native platforms ignore it.
const webThumb = { activeThumbColor: '#FFFFFF' } as object;

/** One row: icon, label, optional detail, and either a chevron (onPress) or a switch (onToggle). */
export function SettingsRow({ icon, label, detail, value, onToggle, onPress, danger, last }: {
  icon: IconName; label: string; detail?: string; value?: boolean; onToggle?: (v: boolean) => void;
  onPress?: () => void; danger?: boolean; last?: boolean;
}) {
  const isSwitch = onToggle !== undefined;
  const body = (
    <View style={[styles.row, !last && styles.divider]}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.text} />
      <View style={styles.flex}>
        <Text style={[type.body, danger && styles.danger]}>{label}</Text>
        {detail && isSwitch ? <Text style={type.small}>{detail}</Text> : null}
      </View>
      {isSwitch ? (
        <Switch value={value} onValueChange={(v) => { tap(); onToggle(v); }} accessibilityLabel={label}
          trackColor={{ false: colors.surfacePress, true: colors.accent }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surfacePress} {...webThumb} />
      ) : (
        <>
          {detail ? <Text style={type.small}>{detail}</Text> : null}
          {onPress && !danger ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null}
        </>
      )}
    </View>
  );
  if (isSwitch || !onPress) return body;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={detail ? `${label}, ${detail}` : label}
      style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: space.xl },
  groupTitle: { paddingHorizontal: space.lg, marginBottom: space.sm },
  groupBody: { marginHorizontal: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: 14, paddingHorizontal: space.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  flex: { flex: 1 },
  danger: { color: colors.danger },
  pressed: { backgroundColor: colors.surfacePress },
});
