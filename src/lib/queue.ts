// Pure queue rules for the player: shuffling and what comes next. Kept free of React so they're unit tested.

export type Repeat = 'off' | 'all' | 'one';

/** The next repeat mode when the button is tapped: off → all → one → off (as in Spotify and Apple Music). */
export const nextRepeat = (r: Repeat): Repeat => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off');

/** A shuffled copy with `firstId` kept at the front, so the song you chose plays first. */
export function shuffleKeepingFirst(ids: string[], firstId: string | undefined, random: () => number = Math.random): string[] {
  const rest = ids.filter((id) => id !== firstId);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return firstId !== undefined && ids.includes(firstId) ? [firstId, ...rest] : rest;
}

/**
 * Where to go after the current song. `auto` is true when the song ended by itself (repeat-one replays it);
 * pressing Next always moves on. Returns null when playback should stop.
 */
export function nextIndex(index: number, length: number, repeat: Repeat, auto: boolean): number | null {
  if (length === 0) return null;
  if (auto && repeat === 'one') return index;
  if (index + 1 < length) return index + 1;
  return repeat === 'off' ? null : 0;
}
