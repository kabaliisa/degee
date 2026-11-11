import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Release } from '../../api';
import { colors, font, radius, space, type } from '../../lib/theme';
import { Art } from '../Art';
import { Equalizer } from '../ui';

/** Two columns of compact tiles at the top of Home. Tap opens, long-press plays. */
export function QuickPickGrid({ releases, playingReleaseId, onPlay }: {
  releases: Release[]; playingReleaseId?: string; onPlay: (releaseId: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {releases.slice(0, 6).map((r) => (
        <View key={r.id} style={styles.cell}>
          <Pressable onPress={() => router.push(`/release/${r.id}`)} onLongPress={() => onPlay(r.id)} accessibilityLabel={r.title}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
            <Art seed={r.id} colors={r.colors} size={56} style={styles.art} />
            <Text numberOfLines={2} style={styles.title}>{r.title}</Text>
            {playingReleaseId === r.id ? <View style={styles.eq}><Equalizer playing /></View> : null}
          </Pressable>
        </View>
      ))}
      {releases.length === 0 ? <Text style={[type.small, styles.empty]}>Nothing here yet. Songs you buy show up under Owned.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg - 4, marginTop: space.lg },
  cell: { width: '50%', padding: 4 },
  tile: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceRaised },
  tilePressed: { backgroundColor: colors.surfacePress },
  art: { borderRadius: 0 },
  title: { flex: 1, paddingHorizontal: space.sm, fontFamily: font.bold, fontSize: 13, color: colors.text },
  eq: { paddingRight: space.sm },
  empty: { padding: space.sm },
});
