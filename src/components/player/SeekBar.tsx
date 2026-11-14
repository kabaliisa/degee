import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { formatDuration } from '../../lib/format';
import { colors, onDark, type, withAlpha } from '../../lib/theme';

/**
 * Progress bar with a thumb. Tap anywhere to jump, or drag the thumb: the time follows your finger and
 * the song moves when you let go. Shows elapsed and total (or preview) time.
 */
export function SeekBar({ positionSec, limitSec, isPreview, onSeek, dark }: {
  positionSec: number; limitSec: number; isPreview: boolean; onSeek: (sec: number) => void; dark?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const [dragSec, setDragSec] = useState<number | null>(null); // where the finger is while dragging

  // Rebuilt only when the bar's size or the song changes; while dragging, only the finger position changes.
  const pan = useMemo(() => {
    const secAt = (x: number) => (width ? Math.round(Math.max(0, Math.min(1, x / width)) * limitSec) : 0);
    // Measured from where the finger first touched, so sliding off the bar doesn't make it jump.
    const start = { x: 0 }; // per gesture handler, not React state: it changes many times a second
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        start.x = e.nativeEvent.locationX;
        setDragSec(secAt(start.x));
      },
      onPanResponderMove: (_, g) => setDragSec(secAt(start.x + g.dx)),
      onPanResponderRelease: (_, g) => {
        onSeek(secAt(start.x + g.dx));
        setDragSec(null);
      },
      onPanResponderTerminate: () => setDragSec(null),
    });
  }, [width, limitSec, onSeek]);

  const shown = dragSec ?? positionSec;
  const pct = limitSec ? Math.min(1, shown / limitSec) : 0;
  const nudge = (by: number) => onSeek(Math.max(0, Math.min(limitSec, positionSec + by)));

  return (
    <View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.hit} {...pan.panHandlers}
        accessible accessibilityLabel="Song position" accessibilityRole="adjustable"
        accessibilityValue={{ min: 0, max: limitSec, now: positionSec, text: formatDuration(positionSec) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 10 : -10)}>
        <View pointerEvents="none" style={[styles.track, dark && styles.trackDark]}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        </View>
        <View pointerEvents="none" style={[styles.thumb, dragSec !== null && styles.thumbActive, { left: Math.max(0, pct * width - (dragSec !== null ? 9 : 6)) }]} />
      </View>
      <View style={styles.times}>
        <Text style={[type.tiny, dark && styles.timeDark]}>{formatDuration(shown)}</Text>
        <Text style={[type.tiny, dark && styles.timeDark]}>{isPreview ? `Preview ${formatDuration(limitSec)}` : formatDuration(limitSec)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 32, justifyContent: 'center' }, // taller than it looks, so it's easy to grab
  track: { height: 4, borderRadius: 2, backgroundColor: withAlpha(colors.text, 0.18) },
  trackDark: { backgroundColor: withAlpha(onDark.text, 0.22) },
  timeDark: { color: onDark.textMuted },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  thumb: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  thumbActive: { width: 18, height: 18, borderRadius: 9 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
});
