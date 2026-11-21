import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { backdropFor } from '../../lib/backdrop';
import { colors, withAlpha } from '../../lib/theme';

/**
 * The colour the player takes from what is playing: a pool of light behind the artwork over a
 * deeper wash of the same hue, so the cover reads as the source of the light in the room.
 *
 * It fades in rather than appearing, because it is a response to pressing play. When the track
 * changes it fades through rather than cutting, which at a track boundary would read as a flicker.
 */
export function PlayerBackdrop({ ids, artworkColor }: { ids: (string | undefined)[]; artworkColor?: string }) {
  const { glow, floor } = backdropFor(ids, artworkColor);
  const fade = useRef(new Animated.Value(0)).current;
  const key = `${glow}${floor}`;

  useEffect(() => {
    // Out quickly, back in gently: the eye forgives a fast departure and notices a fast arrival.
    fade.setValue(0);
    const run = Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [key, fade]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="none">
      <LinearGradient
        colors={[glow, floor, colors.ink]}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* expo-linear-gradient is linear only, so the pool of light is an SVG ellipse. */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="34%" rx="80%" ry="46%">
            <Stop offset="0" stopColor={glow} stopOpacity={0.95} />
            <Stop offset="0.55" stopColor={glow} stopOpacity={0.35} />
            <Stop offset="1" stopColor={glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50%" cy="34%" rx="100%" ry="52%" fill="url(#glow)" />
      </Svg>
      {/* The foot stays dark whatever the hue, so the seek bar and the thumb keep their contrast. */}
      <LinearGradient
        colors={[withAlpha(colors.ink, 0), withAlpha(colors.ink, 0.55)]}
        locations={[0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
