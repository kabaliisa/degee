import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { colors, radius, space, type } from '../lib/theme';
import { tap } from './ui';

type IconName = keyof typeof Ionicons.glyphMap;

export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: space.xl }}>
      {title ? <Text style={[type.smallBold, { paddingHorizontal: space.lg, marginBottom: space.sm }]}>{title}</Text> : null}
      <View style={{ marginHorizontal: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

/** One row: icon, label, optional detail, and either a chevron (onPress) or a switch (value). */
export function SettingsRow({ icon, label, detail, value, onToggle, onPress, danger, last }: {
  icon: IconName; label: string; detail?: string; value?: boolean; onToggle?: (v: boolean) => void;
  onPress?: () => void; danger?: boolean; last?: boolean;
}) {
  const isSwitch = onToggle !== undefined;
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14, paddingHorizontal: space.lg,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={[type.body, danger && { color: colors.danger }]}>{label}</Text>
        {detail && isSwitch ? <Text style={type.small}>{detail}</Text> : null}
      </View>
      {isSwitch ? (
        <Switch value={value} onValueChange={(v) => { tap(); onToggle(v); }} accessibilityLabel={label}
          trackColor={{ false: colors.surfacePress, true: colors.accent }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surfacePress}
          {...({ activeThumbColor: "#FFFFFF" } as object)} />
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
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" style={({ pressed }) => ({ backgroundColor: pressed ? colors.surfacePress : 'transparent' })}>
      {body}
    </Pressable>
  );
}
