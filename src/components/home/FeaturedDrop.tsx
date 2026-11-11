import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getArtist, type Release } from '../../api';
import { formatUGX } from '../../lib/money';
import { colors, font, radius, space, type } from '../../lib/theme';
import { Art } from '../Art';
import { PlayButton } from '../ui';

/** The one big moment on Home: an exclusive release. */
export function FeaturedDrop({ release, playing, onPlay }: { release: Release; playing: boolean; onPlay: () => void }) {
  const artist = getArtist(release.artistId);
  return (
    <View style={styles.wrap}>
      <Text style={type.small}>New from {artist?.name}</Text>
      <Text style={[type.heading, styles.heading]}>Only on Deegee</Text>
      <Pressable onPress={() => router.push(`/release/${release.id}`)} accessibilityLabel={`${release.title} by ${artist?.name}`} style={styles.card}>
        <Art seed={release.id} colors={release.colors} size={120} />
        <View style={styles.body}>
          <View>
            <Text style={type.title} numberOfLines={2}>{release.title}</Text>
            <Text style={type.small}>{release.type} · {artist?.name}</Text>
          </View>
          <View style={styles.footer}>
            <Text style={styles.price}>{formatUGX(release.priceUGX)}</Text>
            <PlayButton size={44} playing={playing} onPress={onPlay} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: space.lg, marginTop: space.xl },
  heading: { marginBottom: space.md },
  card: { flexDirection: 'row', gap: space.lg, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  body: { flex: 1, justifyContent: 'space-between' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontFamily: font.bold, color: colors.text },
});
