import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { photoSource } from '../api';
import { colors, onDark, shade, tint, withAlpha } from '../lib/theme';

/**
 * The cover art, blown up and heavily blurred, as a screen background that fades into the page, so each
 * release gets its own colours (as Apple Music does). Light pages get a soft wash that fades to ivory;
 * the dark player gets a deep one that fades to ink. Before the image loads, or if it can't, the
 * release's own two colours make the gradient instead.
 */
export function ArtworkBackdrop({ seed, colors: [a, b], fadeAt = 0.75, height, tone = 'light' }: {
  seed: string; colors: [string, string]; fadeAt?: number; tone?: 'light' | 'dark';
  height?: number; // from the top; fills the parent when omitted
}) {
  const [failed, setFailed] = useState(false);
  const dark = tone === 'dark';
  const end = dark ? onDark.bg : colors.bg;
  const base = dark ? [shade(a, 0.45), shade(b, 0.6), end] : [tint(a, 0.55), tint(b, 0.7), end];
  const veil = dark ? [0.35, 0.15, 0.55] : [0.45, 0.3, 0.7];
  return (
    <View pointerEvents="none" style={height ? [styles.top, { height }] : StyleSheet.absoluteFill}>
      <LinearGradient colors={base as [string, string, string]} locations={[0, 0.45, fadeAt]} style={StyleSheet.absoluteFill} />
      {failed ? null : (
        <Image source={photoSource(seed)} blurRadius={40} resizeMode="cover" onError={() => setFailed(true)}
          style={[styles.image, { opacity: dark ? 0.85 : 0.6 }]} accessibilityIgnoresInvertColors />
      )}
      {/* A veil at the top for the status bar and controls, then fade fully into the page. */}
      <LinearGradient
        colors={[withAlpha(end, veil[0]), withAlpha(end, veil[1]), withAlpha(end, veil[2]), end]}
        locations={[0, 0.3, fadeAt * 0.8, fadeAt]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  // Larger than the area on every side so the blurred edges never show (the gradient fades it to black
  // before its bottom edge); a small image is enough once it's this blurred.
  image: { position: 'absolute', top: '-20%', left: '-20%', width: '140%', height: '140%' },
});
