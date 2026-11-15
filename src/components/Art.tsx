import { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { photoSource } from '../api';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * Generated cover art drawn from Ugandan pattern traditions, so the mock catalogue
 * looks like real releases without image files:
 *  - drum: concentric rings of an engoma skin
 *  - weave: chevrons of a woven mat or basket
 *  - bands: diagonal kitenge-style bands
 *  - sun: a low sun over horizon lines
 * The pattern is chosen from the seed so every release keeps the same artwork.
 */
type Variant = 'drum' | 'weave' | 'bands' | 'sun';
const VARIANTS: Variant[] = ['drum', 'weave', 'bands', 'sun'];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

/**
 * The generated covers stay inside the app's own golds, for a release with no artwork of its own. The
 * server sends a colour pair per release, but those were picked for an older palette, so the pair is
 * chosen here from the seed instead: the same artwork every time, and always of a piece with the rest.
 */
/**
 * A sleeve with no photograph should read as a dark sleeve, not as a flag. These pairs stay close
 * together and close to the background: the pattern arrives as texture caught in low light, and the
 * title above the tile stays the loudest thing on the shelf. Bright gold at this size turned the
 * shelves into test cards and made the releases that do have a photograph look like the odd ones out.
 */
const PAIRS: [string, string][] = [
  ['#241708', '#3E2A10'], // burnt earth
  ['#1C1209', '#36250F'], // near-black, warmed
  ['#2A1C0C', '#45300F'], // clay
  ['#1A1206', '#2E2009'], // the deep one
  ['#221606', '#4A3211'], // ochre
  ['#15100A', '#2B1E0D'], // almost nothing
];
/** How far any stroke is allowed to lift off the base. */
const LIFT = 0.6;

export function Art({ seed, size, round, style, photo = true, uri: imageUri }: {
  seed: string; size: number; round?: boolean; style?: StyleProp<ViewStyle>; photo?: boolean;
  uri?: string | null; // a specific image (e.g. a draft's uploaded cover) instead of the one looked up by seed
}) {
  // Mock photos load from the web on top of the pattern; if offline or a photo fails, the pattern stays.
  const [photoFailed, setPhotoFailed] = useState(false);
  const source = photoFailed ? null : imageUri ? { uri: imageUri } : photo ? photoSource(seed) : null;
  const h = hash(seed);
  const [base, b] = PAIRS[h % PAIRS.length];
  const variant = VARIANTS[h % VARIANTS.length];
  const id = `g${h}`;
  const S = 100;

  let body;
  if (variant === 'drum') {
    const cx = 30 + (h % 40), cy = 35 + ((h >> 3) % 35);
    body = (
      <G>
        {[78, 62, 48, 36, 25, 15].map((r, i) => (
          <Circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={b} strokeWidth={i === 0 ? 5 : 2.5} opacity={LIFT - i * 0.05} />
        ))}
        <Circle cx={cx} cy={cy} r={6} fill={b} opacity={LIFT} />
      </G>
    );
  } else if (variant === 'weave') {
    const rows = Array.from({ length: 9 }, (_, i) => i * 12 - 4);
    body = (
      <G>
        {rows.map((y, i) => (
          <Path key={y} d={`M-5 ${y + 12} L12 ${y} L29 ${y + 12} L46 ${y} L63 ${y + 12} L80 ${y} L97 ${y + 12} L114 ${y}`}
            fill="none" stroke={b} strokeWidth={i % 3 === 0 ? 3.5 : 2} opacity={i % 3 === 0 ? LIFT : LIFT * 0.55} />
        ))}
      </G>
    );
  } else if (variant === 'bands') {
    body = (
      <G transform={`rotate(${-25 - (h % 20)} 50 50)`}>
        {[-30, -8, 14, 36, 58, 80, 102].map((x, i) => (
          <Rect key={x} x={x} y={-40} width={i % 2 ? 6 : 13} height={190} fill={b} opacity={i % 2 ? LIFT * 0.5 : LIFT} />
        ))}
        <Circle cx={70} cy={30} r={5} fill={b} opacity={LIFT} />
        <Circle cx={30} cy={74} r={3.5} fill={b} opacity={LIFT} />
      </G>
    );
  } else {
    body = (
      <G>
        <Circle cx={50 + ((h % 30) - 15)} cy={56} r={28} fill={b} opacity={LIFT} />
        {[62, 70, 77, 83, 88, 92, 95].map((y, i) => (
          <Rect key={y} x={0} y={y} width={S} height={Math.max(1.2, 4 - i * 0.5)} fill={b} opacity={LIFT * 0.8} />
        ))}
      </G>
    );
  }

  return (
    <View style={[{ width: size, height: size, borderRadius: round ? size / 2 : Math.max(4, size * 0.03), overflow: 'hidden' }, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${S} ${S}`}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={b} />
            <Stop offset="1" stopColor={base} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={S} height={S} fill={`url(#${id})`} />
        {body}
      </Svg>
      {source ? (
        <Image source={source} onError={() => setPhotoFailed(true)} accessibilityIgnoresInvertColors
          style={[StyleSheet.absoluteFill, { width: size, height: size }]} resizeMode="cover" />
      ) : null}
    </View>
  );
}
