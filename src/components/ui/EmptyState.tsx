import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../../lib/theme';
import type { IconName } from './buttons';

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={44} color={colors.textFaint} />
      <Text style={[type.heading, styles.centered]}>{title}</Text>
      <Text style={[type.small, styles.centered, styles.body]}>{body}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: space.xxl, gap: space.sm },
  centered: { textAlign: 'center' },
  body: { fontSize: 14 },
});
