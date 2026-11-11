import { View, type ViewStyle } from 'react-native';
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

export function Art({ seed, colors: [a, b], size, round, style }: {
  seed: string; colors: [string, string]; size: number; round?: boolean; style?: ViewStyle;
}) {
  const h = hash(seed);
  const variant = VARIANTS[h % VARIANTS.length];
  const id = `g${h}`;
  const S = 100;

  let body;
  if (variant === 'drum') {
    const cx = 30 + (h % 40), cy = 35 + ((h >> 3) % 35);
    body = (
      <G>
        {[78, 62, 48, 36, 25, 15].map((r, i) => (
          <Circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={i % 2 ? b : a} strokeWidth={i === 0 ? 10 : 5} opacity={0.9 - i * 0.08} />
        ))}
        <Circle cx={cx} cy={cy} r={8} fill={a} />
      </G>
    );
  } else if (variant === 'weave') {
    const rows = Array.from({ length: 9 }, (_, i) => i * 12 - 4);
    body = (
      <G>
        {rows.map((y, i) => (
          <Path key={y} d={`M-5 ${y + 12} L12 ${y} L29 ${y + 12} L46 ${y} L63 ${y + 12} L80 ${y} L97 ${y + 12} L114 ${y}`}
            fill="none" stroke={i % 3 === 0 ? a : b} strokeWidth={i % 3 === 0 ? 6 : 3} opacity={i % 3 === 0 ? 1 : 0.55} />
        ))}
      </G>
    );
  } else if (variant === 'bands') {
    body = (
      <G transform={`rotate(${-25 - (h % 20)} 50 50)`}>
        {[-30, -8, 14, 36, 58, 80, 102].map((x, i) => (
          <Rect key={x} x={x} y={-40} width={i % 2 ? 7 : 15} height={190} fill={i % 2 ? b : a} opacity={i % 2 ? 0.6 : 0.95} />
        ))}
        <Circle cx={70} cy={30} r={6} fill={a} />
        <Circle cx={30} cy={74} r={4} fill={a} />
      </G>
    );
  } else {
    body = (
      <G>
        <Circle cx={50 + ((h % 30) - 15)} cy={56} r={30} fill={a} />
        {[62, 70, 77, 83, 88, 92, 95].map((y, i) => (
          <Rect key={y} x={0} y={y} width={S} height={Math.max(1.5, 5 - i * 0.6)} fill={`url(#${id})`} />
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
            <Stop offset="1" stopColor="#000000" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={S} height={S} fill={`url(#${id})`} />
        {body}
      </Svg>
    </View>
  );
}
