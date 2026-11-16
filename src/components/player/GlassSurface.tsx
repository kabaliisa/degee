import { BlurView } from 'expo-blur';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * The frosted pane behind the mini player, on iOS and Android.
 *
 * Whatever is painted behind this view is blurred; the view's own children are not, which is the
 * whole point — the artwork and the type on top have to stay sharp. Nothing here may carry an opaque
 * background: a blur can only sample what is behind it, so a colour of its own is all it would ever
 * see. The tint goes on top, in MiniPlayer.
 *
 * `intensity` is a 0-100 scale rather than a radius. 70 lands near the 24px the design asks for.
 */
export function GlassSurface({ style }: { style?: StyleProp<ViewStyle> }) {
  return <BlurView intensity={70} tint="dark" style={style} pointerEvents="none" />;
}

/** Native blur is always there, so the tint never has to stand in for it. */
export const GLASS_IS_BLURRED = true;
