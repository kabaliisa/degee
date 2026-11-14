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
 * Placeholder photos shipped with the app, in the warm portrait style of the Deegee designs. Used for
 * demo artists and releases until artists upload their own photos and covers.
 */
const PORTRAITS: ImageSourcePropType[] = [portrait1, portrait2, portrait3, portrait4, portrait5, duo1, group1];
// Covers lean on the scenes (a rooftop in Kampala, Lake Victoria, a busy street at night), then the portraits.
const COVERS: ImageSourcePropType[] = [rooftop, portrait3, lake, portrait5, street, duo1, portrait2, group1, portrait1, portrait4];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

/** The same id always gets the same photo: a face for artists, a scene or face for covers. */
export function placeholderPhoto(id: string, kind: 'portrait' | 'cover'): ImageSourcePropType {
  const pool = kind === 'portrait' ? PORTRAITS : COVERS;
  return pool[hash(id) % pool.length];
}
