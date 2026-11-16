import type { ImageSourcePropType } from 'react-native';
import grace from '../../assets/photos/artist-grace.jpg';
import kiwa from '../../assets/photos/artist-kiwa.jpg';
import nalu from '../../assets/photos/artist-nalu.jpg';
import mukasa from '../../assets/photos/artist-mukasa.jpg';
import ssalongo from '../../assets/photos/artist-ssalongo.jpg';
import coverBoda from '../../assets/photos/cover-boda.jpg';
import coverEbyafaayo from '../../assets/photos/cover-ebyafaayo.jpg';
import coverLakwena from '../../assets/photos/cover-lakwena.jpg';
import coverNile from '../../assets/photos/cover-nile.jpg';

/**
 * Real photographs shipped with the app, keyed to the artist or release they belong to.
 *
 * Only artists we actually have a picture of appear here. Everything else returns null and falls back
 * to the generated cover art in Art.tsx — a pattern is honest about being a placeholder in a way that
 * a stand-in face is not, and a fake face attached to a real name and a price is the thing worth
 * avoiding on a storefront.
 *
 * As artists upload their own photos these entries disappear: the server's coverUrl wins first.
 */
const REAL: Record<string, ImageSourcePropType> = {
  a5: mukasa, // Mukasa the MC
  r6: coverBoda, // Boda Diaries
  a4: grace, // Grace Atim
  r5: coverLakwena, // Lakwena
  a3: kiwa, // Kiwa Rebel
  r4: coverNile, // Nile Bounce
  a2: ssalongo, // Ssalongo Beats
  r3: coverEbyafaayo, // Ebyafaayo
  a1: nalu, // Nalu Kizza
  r1: nalu, // Enkuba
  r2: nalu, // Sunday in Ntinda
};

/** The photo for an id, or null when we have none and the generated art should stand in. */
export function placeholderPhoto(id: string): ImageSourcePropType | null {
  return REAL[id] ?? null;
}

/** Whether we hold a real photograph for this id — the home screen leads with one that we do. */
export function hasPhoto(id: string) {
  return id in REAL;
}
