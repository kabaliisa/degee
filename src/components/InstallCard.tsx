import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useInstall } from '../lib/install';
import { colors, radius, space, type } from '../lib/theme';
import { Button } from './ui';

/**
 * Asks once to put Deegee on the home screen. Android can do it in a tap; on an iPhone only Safari's
 * share sheet can, so there we say how. Renders nothing when it's already installed or has been waved away.
 */
export function InstallCard() {
  const { canInstall, showIosHint, install, dismiss } = useInstall();
  if (!canInstall && !showIosHint) return null;
  return (
    <View style={styles.card}>
      <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Not now" hitSlop={10} style={styles.close}>
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
      <Ionicons name="phone-portrait-outline" size={24} color={colors.accent} />
      <Text style={type.bodyBold}>Keep Deegee on your home screen</Text>
      <Text style={[type.small, styles.body]}>
        {canInstall
          ? 'It opens like an app, works offline, and uses less data than coming back through the browser.'
          : 'Tap Share at the bottom of Safari, then “Add to Home Screen”. It then opens like an app and works offline.'}
      </Text>
      {canInstall ? <Button small label="Add to home screen" icon="add" onPress={install} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: space.lg, marginTop: space.xl, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, gap: space.xs },
  close: { position: 'absolute', top: space.md, right: space.md, zIndex: 1 },
  body: { paddingRight: space.lg },
  action: { alignSelf: 'flex-start', marginTop: space.sm },
});
