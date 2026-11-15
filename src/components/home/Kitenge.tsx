import Svg, { G, Line, Rect } from 'react-native-svg';
import { colors, withAlpha } from '../../lib/theme';

/** A corner of woven cloth, in gold thread. Decoration with a reason: it is what a kitenge does. */
export function Kitenge({ size = 110 }: { size?: number }) {
  const gold = withAlpha(colors.accent, 0.5);
  const faint = withAlpha(colors.accent, 0.2);
  const step = size / 7;
  const lines = Array.from({ length: 8 }, (_, i) => i * step);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} pointerEvents="none">
      <G>
        {lines.map((v, i) => (
          <Line key={`v${i}`} x1={v} y1={0} x2={v} y2={size} stroke={i % 2 ? faint : gold} strokeWidth={i % 3 === 0 ? 1.6 : 0.9} />
        ))}
        {lines.map((v, i) => (
          <Line key={`h${i}`} x1={0} y1={v} x2={size} y2={v} stroke={i % 2 ? gold : faint} strokeWidth={i % 3 === 0 ? 1.6 : 0.9} />
        ))}
        {lines.slice(0, 5).map((v, i) => (
          <Rect key={`r${i}`} x={v + step / 3} y={v + step / 3} width={step / 2.4} height={step / 2.4} fill={i % 2 ? gold : faint} />
        ))}
      </G>
    </Svg>
  );
}
