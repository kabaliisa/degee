import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../../lib/theme';

/**
 * A coiled mat, wound from the corner — the way an ebibo basket or a sitting mat is made, and near
 * enough a record groove to earn its place on a music card.
 *
 * It is drawn bold and few rather than fine and many: a fine grid at this size stops being cloth and
 * becomes graph paper. Each ring is fainter than the last, so the pattern arrives at the corner and
 * leaves before it reaches the words.
 */
export function Kitenge({ size = 120 }: { size?: number }) {
  const rings = [22, 36, 50, 64, 78, 92, 106, 120];
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" pointerEvents="none">
      <G>
        {rings.map((r, i) => (
          <Circle
            key={r}
            cx={120}
            cy={0}
            r={r}
            fill="none"
            stroke={colors.accent}
            strokeWidth={i % 2 ? 1.2 : 2.6}
            opacity={Math.max(0.05, 0.34 - i * 0.035)}
          />
        ))}
      </G>
    </Svg>
  );
}
