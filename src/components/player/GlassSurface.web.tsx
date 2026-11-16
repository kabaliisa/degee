import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * The frosted pane behind the mini player, on the web.
 *
 * `backdrop-filter` and not `filter`: the first blurs what is painted behind the element, the second
 * blurs the element's own contents. We want the page softened and the artwork, type and controls on
 * top of it perfectly sharp.
 *
 * The saturation lift is what keeps a blurred photograph from going muddy grey — blurring averages
 * colour away, and 140% puts back roughly what the averaging took.
 */
const GLASS = 'blur(24px) saturate(140%)';

/**
 * Every engine that matters supports this now, but Firefox shipped it late and a user can still turn
 * it off, so we ask rather than assume. When the answer is no the player falls back to a flat tint,
 * which is why MiniPlayer reads this to decide how dense that tint should be.
 */
export const GLASS_IS_BLURRED =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'));

export function GlassSurface({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      pointerEvents="none"
      style={[
        style,
        GLASS_IS_BLURRED
          ? // Cast: these are real CSS properties that React Native Web passes through, but they are
            // not in the native ViewStyle type, which has no notion of a backdrop.
            ({ backdropFilter: GLASS, WebkitBackdropFilter: GLASS } as unknown as ViewStyle)
          : null,
      ]}
    />
  );
}
