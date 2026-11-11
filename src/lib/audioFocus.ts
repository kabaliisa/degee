/**
 * Only one thing plays at a time. Whatever starts playing takes the focus, and whoever had it is told to stop
 * (the main player, or a listen-back button in the studio or review queue).
 */
type Holder = { owner: object; stop: () => void };

let current: Holder | null = null;

export function takeAudioFocus(owner: object, stop: () => void) {
  if (current && current.owner !== owner) current.stop();
  current = { owner, stop };
}

export function releaseAudioFocus(owner: object) {
  if (current?.owner === owner) current = null;
}
