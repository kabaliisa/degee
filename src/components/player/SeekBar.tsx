import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDuration } from '../../lib/format';
import { colors, type, withAlpha } from '../../lib/theme';

/** Progress bar with a thumb; tap anywhere to seek. Shows elapsed and total (or preview) time. */
export function SeekBar({ positionSec, limitSec, isPreview, onSeek }: {
  positionSec: number; limitSec: number; isPreview: boolean; onSeek: (sec: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const pct = limitSec ? Math.min(1, positionSec / limitSec) : 0;
  return (
    <View>
      <Pressable onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel="Seek" accessibilityRole="adjustable"
        onPress={(e) => { if (width) onSeek(Math.round((e.nativeEvent.locationX / width) * limitSec)); }} style={styles.hit}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        </View>
        <View style={[styles.thumb, { left: Math.max(0, pct * width - 6) }]} />
      </Pressable>
      <View style={styles.times}>
        <Text style={type.tiny}>{formatDuration(positionSec)}</Text>
        <Text style={type.tiny}>{isPreview ? `Preview ${formatDuration(limitSec)}` : formatDuration(limitSec)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 22, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: withAlpha(colors.text, 0.22) },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.text },
  thumb: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.text },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
});
