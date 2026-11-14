import type { ImageSourcePropType } from 'react-native';
import portrait1 from '../../assets/photos/portrait-hd-1.jpg';
import portrait2 from '../../assets/photos/portrait-hd-2.jpg';
import portrait3 from '../../assets/photos/portrait-hd-3.jpg';
import group1 from '../../assets/photos/portrait-hd-4.jpg';
import portrait4 from '../../assets/photos/portrait-hd-5.jpg';
import scene1 from '../../assets/photos/scene-1.jpg';

/**
 * Placeholder photos shipped with the app, in the warm portrait style of the Deegee designs. Used for
 * demo artists and releases until artists upload their own photos and covers.
 */
const PORTRAITS: ImageSourcePropType[] = [portrait1, portrait2, portrait3, portrait4, group1];
const COVERS: ImageSourcePropType[] = [portrait3, portrait2, scene1, portrait1, group1, portrait4];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

/** The same id always gets the same photo: a face for artists, a face or scene for covers. */
export function placeholderPhoto(id: string, kind: 'portrait' | 'cover'): ImageSourcePropType {
  const pool = kind === 'portrait' ? PORTRAITS : COVERS;
  return pool[hash(id) % pool.length];
}
