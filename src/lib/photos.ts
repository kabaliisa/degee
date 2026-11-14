import type { ImageSourcePropType } from 'react-native';
import portraitHd1 from '../../assets/photos/portrait-hd-1.jpg';
import portrait1 from '../../assets/photos/portrait-1.jpg';
import portrait5 from '../../assets/photos/portrait-5.jpg';
import portrait6 from '../../assets/photos/portrait-6.jpg';
import scene1 from '../../assets/photos/scene-1.jpg';

/**
 * Placeholder photos shipped with the app, in the warm portrait style of the Deegee designs. Used for
 * demo artists and releases until artists upload their own photos and covers.
 */
const PORTRAITS: ImageSourcePropType[] = [portraitHd1, portrait5, portrait6, portrait1];
const COVERS: ImageSourcePropType[] = [portraitHd1, scene1, portrait5, portrait6, portrait1];

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
