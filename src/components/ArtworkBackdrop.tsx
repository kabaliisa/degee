import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { photoUrl } from '../api';
import { colors, shade, withAlpha } from '../lib/theme';

/**
 * The cover art, blown up and heavily blurred, as a screen background that fades to black, so each
 * release gets its own colours (as Apple Music does). Before the image loads, or if it can't, the
 * release's own two colours make the gradient instead.
 */
export function ArtworkBackdrop({ seed, colors: [a, b], fadeAt = 0.75, height }: {
  seed: string; colors: [string, string]; fadeAt?: number;
  height?: number; // from the top; fills the parent when omitted
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View pointerEvents="none" style={height ? [styles.top, { height }] : StyleSheet.absoluteFill}>
      <LinearGradient colors={[shade(a, 0.45), shade(b, 0.6), colors.bg]} locations={[0, 0.45, fadeAt]} style={StyleSheet.absoluteFill} />
      {failed ? null : (
        <Image source={{ uri: photoUrl(seed, 160) }} blurRadius={40} resizeMode="cover" onError={() => setFailed(true)}
          style={styles.image} accessibilityIgnoresInvertColors />
      )}
      {/* Darken a little at the top for the status bar and controls, then fade fully to the app's black. */}
      <LinearGradient
        colors={[withAlpha(colors.bg, 0.35), withAlpha(colors.bg, 0.15), withAlpha(colors.bg, 0.55), colors.bg]}
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
  image: { position: 'absolute', top: '-20%', left: '-20%', width: '140%', height: '140%', opacity: 0.85 },
});
