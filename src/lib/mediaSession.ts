/**
 * Lock screen and headphone controls. Native builds get these from expo-audio's own background mode,
 * so this does nothing; mediaSession.web.ts is the real one, and it is what makes a PWA usable with
 * the screen off.
 */
export type NowPlaying = {
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  durationSec: number;
  positionSec: number;
  isPlaying: boolean;
};

export type MediaControls = {
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
};

export function useMediaSession(_now: NowPlaying | null, _controls: MediaControls): void {}
