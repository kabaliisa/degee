/**
 * The colour the player screen takes from whatever is playing.
 *
 * Only the HUE comes from the artwork. Saturation and lightness are fixed here, which is what keeps
 * the gold seek bar and the white thumb readable whoever is playing: an artist whose photograph is
 * pale yellow would otherwise get a screen nobody can read, and we would hear about it from them
 * rather than find it ourselves.
 *
 * The hues below were measured from the photographs in assets/photos -- the most saturated colour
 * weighted by how much of the picture it covers, ignoring the near-black background that every
 * studio shot has and that says nothing about the subject. When artists upload their own photographs
 * this moves to the server, which can do the same measurement at upload time.
 */

const PHOTO_HUE: Record<string, number> = {
  a1: 356, r1: 356, r2: 356, // Nalu Kizza -- red dress under stage light
  a2: 198, r3: 198, // Ssalongo Beats -- cool blue
  a3: 15, r4: 15, // Kiwa Rebel -- warm brick
  a4: 195, r5: 195, // Grace Atim -- teal
  a5: 344, r6: 344, // Mukasa the MC -- magenta
};

/** Hue of a colour the generated artwork already uses, for anyone without a photograph. */
function hueOfHex(hex: string): number | undefined {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return undefined;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return undefined; // a grey has no hue to borrow
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return ((h * 60) % 360 + 360) % 360;
}

function hsvHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const x = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(x * 255).toString(16).padStart(2, '0');
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

export type Backdrop = { glow: string; floor: string };

/** A neutral warm dark, for a track whose art gives us nothing to go on. */
const NEUTRAL: Backdrop = { glow: '#4A3A33', floor: '#15100E' };

/**
 * @param ids anything that might identify the artwork -- track id, release id, artist id. The first
 *            one we have a hue for wins, so a track falls back to its release and then its artist.
 * @param artworkColor a colour from the generated artwork, used when there is no photograph.
 */
export function backdropFor(ids: (string | undefined)[], artworkColor?: string): Backdrop {
  let hue: number | undefined;
  for (const id of ids) {
    if (id && PHOTO_HUE[id] !== undefined) { hue = PHOTO_HUE[id]; break; }
  }
  if (hue === undefined && artworkColor) hue = hueOfHex(artworkColor);
  if (hue === undefined) return NEUTRAL;
  return { glow: hsvHex(hue, 0.5, 0.46), floor: hsvHex(hue, 0.34, 0.11) };
}
