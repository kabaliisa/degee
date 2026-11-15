import type { ImageSourcePropType } from 'react-native';
import portrait1 from '../../assets/photos/portrait-hd-1.jpg';
import portrait2 from '../../assets/photos/portrait-hd-2.jpg';
import portrait3 from '../../assets/photos/portrait-hd-3.jpg';
import group1 from '../../assets/photos/portrait-hd-4.jpg';
import portrait4 from '../../assets/photos/portrait-hd-5.jpg';
import portrait5 from '../../assets/photos/portrait-hd-6.jpg';
import duo1 from '../../assets/photos/portrait-duo.jpg';
import lake from '../../assets/photos/scene-lake.jpg';
import rooftop from '../../assets/photos/scene-rooftop.jpg';
import street from '../../assets/photos/scene-street.jpg';

/**
 * Placeholder photos shipped with the app, for demo artists until they upload their own.
 *
 * They are only used for faces. Every one of them was shot on the same saturated terracotta backdrop,
 * and a grid of them turns a screen into a wall of orange; a release gets the app's own generated cover
 * instead, which is drawn in the app's greens and so always belongs. Artists keep their photographs,
 * because an artist without a face is not an artist.
 */
const PORTRAITS: ImageSourcePropType[] = [portrait1, portrait2, portrait3, portrait4, portrait5, duo1, group1, rooftop, lake, street];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

/** The same artist always gets the same face. Releases get no photo: the generated cover draws instead. */
export function placeholderPhoto(id: string, kind: 'portrait' | 'cover'): ImageSourcePropType | null {
  return kind === 'portrait' ? PORTRAITS[hash(id) % PORTRAITS.length] : null;
}
