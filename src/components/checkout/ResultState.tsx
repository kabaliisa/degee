import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../../lib/theme';
import type { IconName } from '../ui';

/** Full-screen confirmation or waiting state used by checkout, add money and gifts. */
export function ResultState({ icon, iconColor = colors.accent, title, body, children, footnote }: {
  icon: IconName; iconColor?: string; title: string; body: string; children?: ReactNode; footnote?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={62} color={iconColor} />
      <Text style={type.title}>{title}</Text>
      <Text style={[type.body, styles.body]}>{body}</Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
      {footnote ? <Text style={[type.small, styles.footnote]}>{footnote}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  body: { color: colors.textMuted, textAlign: 'center' },
  actions: { alignSelf: 'stretch', marginTop: space.lg, gap: space.sm },
  footnote: { marginTop: space.xl },
});
