import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, StyleSheet } from 'react-native';
import { mediaUrl } from '../../api/catalog';
import { colors } from '../../lib/theme';
import { tap } from '../ui';

/** A small play/pause button for an uploaded recording, so artists and reviewers can listen back. */
export function AudioPreview({ url, label }: { url: string; label: string }) {
  const player = useAudioPlayer({ uri: mediaUrl(url) });
  const { playing } = useAudioPlayerStatus(player);
  const toggle = () => {
    tap();
    if (playing) player.pause();
    else player.play();
  };
  return (
    <Pressable onPress={toggle} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${playing ? 'Pause' : 'Play'} ${label}`} style={styles.button}>
      <Ionicons name={playing ? 'pause' : 'play'} size={16} color={colors.accentInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
