/**
 * Puts the song on the lock screen and wires up the buttons there, on headphones and in the car.
 *
 * Without this a browser tab playing audio is a tab, and the only way to pause it is to find the tab.
 * With it the song has a title, an artist and a cover wherever the phone shows what's playing, which is
 * what makes a PWA feel like a music app rather than a website that happens to make noise.
 */
import { useEffect, useRef } from 'react';
import type { MediaControls, NowPlaying } from './mediaSession';

export type { MediaControls, NowPlaying };

const session = () => (typeof navigator !== 'undefined' ? navigator.mediaSession : undefined);

export function useMediaSession(now: NowPlaying | null, controls: MediaControls): void {
  // Handlers are registered once and read the latest controls and position, so nothing goes stale mid-song.
  const latest = useRef(controls);
  const at = useRef(0);
  useEffect(() => {
    latest.current = controls;
    at.current = now?.positionSec ?? 0;
  });

  useEffect(() => {
    const ms = session();
    if (!ms) return;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => latest.current.play()],
      ['pause', () => latest.current.pause()],
      ['stop', () => latest.current.pause()],
      ['nexttrack', () => latest.current.next()],
      ['previoustrack', () => latest.current.prev()],
      ['seekto', (d) => d.seekTime !== undefined && latest.current.seek(d.seekTime)],
      ['seekforward', (d) => latest.current.seek(at.current + (d.seekOffset ?? 10))],
      ['seekbackward', (d) => latest.current.seek(Math.max(0, at.current - (d.seekOffset ?? 10)))],
    ];
    for (const [action, handler] of handlers) {
      // Not every browser knows every action, and setting an unknown one throws.
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // This browser doesn't offer that button; the rest still work.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          // Nothing to undo.
        }
      }
    };
  }, []);

  const title = now?.title;
  const artist = now?.artist;
  const album = now?.album;
  const artwork = now?.artwork;
  useEffect(() => {
    const ms = session();
    if (!ms) return;
    if (!title) {
      ms.metadata = null;
      return;
    }
    ms.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork: artwork ? [{ src: artwork, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
  }, [title, artist, album, artwork]);

  const isPlaying = now?.isPlaying ?? false;
  useEffect(() => {
    const ms = session();
    if (ms) ms.playbackState = now ? (isPlaying ? 'playing' : 'paused') : 'none';
  }, [now, isPlaying]);

  const duration = now?.durationSec ?? 0;
  const position = now?.positionSec ?? 0;
  useEffect(() => {
    const ms = session();
    if (!ms?.setPositionState || !duration) return;
    try {
      ms.setPositionState({ duration, position: Math.min(position, duration), playbackRate: 1 });
    } catch {
      // A position past the end throws while a song is changing over; the next tick fixes it.
    }
  }, [duration, position]);
}
