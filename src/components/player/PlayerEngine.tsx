import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Image, Platform } from 'react-native';
import { getArtist } from '../../api';
import { mediaUrl, photoSource } from '../../api/catalog';
import { releaseAudioFocus, takeAudioFocus } from '../../lib/audioFocus';
import { getPlayLink } from '../../api/studio';
import { useMediaSession } from '../../lib/mediaSession';
import { savedSongUrl } from '../../lib/offlineAudio';
import { usePlayer } from '../../store/player';
import { useOffline } from '../../store/offline';
import { useWallet } from '../../store/wallet';

/**
 * Drives playback through expo-audio. If you may hear a song in full (you bought it, or it's your own),
 * it plays the light stream from a short-lived link the API gives. Otherwise it plays the song's public
 * 30-second preview. Demo songs with no recording advance on a timer instead. Renders nothing.
 */
const MAIN_PLAYER = {}; // identity for audio focus

export function PlayerEngine() {
  const owns = useWallet((s) => s.owns);
  const trackId = usePlayer((s) => s.queue[s.index]);
  const hasAudio = usePlayer((s) => s.current()?.hasAudio ?? false);
  const isOwned = useWallet((s) => (trackId ? s.ownedTracks.includes(trackId) : false));
  const [link, setLink] = useState<{ trackId: string; url: string } | null>(null);
  const fullUrl = link && link.trackId === trackId ? link.url : undefined;
  const previewPath = usePlayer((s) => s.current()?.previewUrl ?? null);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const limit = usePlayer((s) => s.limitSec());
  const tick = usePlayer((s) => s.tick);
  const next = usePlayer((s) => s.next);
  const setPreview = usePlayer((s) => s.setPreview);
  const isSavedOffline = useOffline((s) => (trackId ? s.saved.includes(trackId) : false));
  const [offline, setOffline] = useState<{ trackId: string; url: string } | null>(null);

  // A saved song plays from the device: no play link, no data, and it works with no connection at all.
  useEffect(() => {
    if (!trackId || !isSavedOffline) return;
    let cancelled = false;
    savedSongUrl(trackId).then((url) => { if (url && !cancelled) setOffline({ trackId, url }); }).catch(() => {});
    return () => { cancelled = true; };
  }, [trackId, isSavedOffline]);
  const offlineUrl = offline && offline.trackId === trackId ? offline.url : undefined;

  // Full song if allowed; otherwise the preview clip (which is itself 30 seconds long). An owner waits a moment
  // for their link rather than hearing the preview first.
  const previewUrl = previewPath ? mediaUrl(previewPath) : undefined;
  const audioUrl = offlineUrl ?? fullUrl ?? (isOwned ? undefined : previewUrl);
  const audio = useAudioPlayer(audioUrl ? { uri: audioUrl } : null);
  const { currentTime, didJustFinish } = useAudioPlayerStatus(audio);

  // A music app should play with the iPhone's silent switch on, keep going when the screen locks,
  // and pause other apps' audio (as Spotify does).
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
  }, []);

  // A song with a real recording: ask the server for a play link. It decides who may hear it in full
  // (buyers, the song's own artist, admins); anyone else gets a refusal and hears the preview.
  useEffect(() => {
    if (!trackId || !hasAudio || offlineUrl) return; // a saved song needs no link
    let cancelled = false;
    getPlayLink(trackId)
      .then(({ url }) => { if (!cancelled) setLink({ trackId, url: mediaUrl(url) }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [trackId, hasAudio, isOwned, offlineUrl]); // isOwned: buying mid-preview asks again and unlocks the full song

  // Full song if you own it or the server gave a link (e.g. you're the artist); otherwise a preview.
  const canPlayFull = isOwned || fullUrl !== undefined || offlineUrl !== undefined;
  useEffect(() => {
    if (trackId) setPreview(!canPlayFull);
  }, [trackId, canPlayFull, setPreview]);

  // One thing plays at a time: starting the main player stops a studio listen-back button, and vice versa.
  useEffect(() => {
    if (!isPlaying) return releaseAudioFocus(MAIN_PLAYER);
    takeAudioFocus(MAIN_PLAYER, () => usePlayer.setState({ isPlaying: false }));
  }, [isPlaying]);

  // Real audio: mirror play/pause.
  useEffect(() => {
    if (audioUrl && isPlaying) audio.play();
    else audio.pause(); // also when the queue is cleared, e.g. on sign-out
  }, [audio, audioUrl, isPlaying]);

  // Real audio: jump when the seek bar is dragged or "previous" restarts the song.
  const seekRequest = usePlayer((s) => s.seekRequest);
  useEffect(() => {
    if (seekRequest === null) return;
    if (audioUrl) {
      audio.seekTo(seekRequest).catch(() => {});
      if (usePlayer.getState().isPlaying) audio.play(); // a finished recording needs a fresh play() to start again
    }
    usePlayer.setState({ seekRequest: null });
  }, [audio, audioUrl, seekRequest]);

  // Real audio: report position and stop at the preview limit or the end of the song.
  useEffect(() => {
    if (!audioUrl || !isPlaying) return;
    usePlayer.setState({ positionSec: Math.floor(currentTime) });
    if (currentTime >= limit || didJustFinish) next(owns, true);
  }, [audioUrl, isPlaying, currentTime, didJustFinish, limit, next, owns]);

  // Mock audio: advance once a second.
  useEffect(() => {
    if (!trackId || audioUrl || !isPlaying) return;
    const id = setInterval(() => tick(owns), 1000);
    return () => clearInterval(id);
  }, [trackId, audioUrl, isPlaying, tick, owns]);

  // The lock screen, headphone buttons and car stereo. On the web this is the only way to control
  // playback once the phone is locked; native builds already have it and the hook does nothing there.
  const track = usePlayer((s) => s.current());
  const position = usePlayer((s) => s.positionSec);
  const prev = usePlayer((s) => s.prev);
  useMediaSession(
    track
      ? {
          title: track.title,
          artist: getArtist(track.artistId)?.name ?? 'Deegee',
          artwork: artworkUrl(track.releaseId),
          durationSec: limit,
          positionSec: position,
          isPlaying,
        }
      : null,
    {
      play: () => usePlayer.setState({ isPlaying: true }),
      pause: () => usePlayer.setState({ isPlaying: false }),
      next: () => next(owns),
      prev: () => prev(owns),
      seek: (sec) => usePlayer.getState().seek(sec),
    },
  );
  return null;
}

/**
 * The cover as a plain URL, which is what the lock screen needs. Uploaded covers arrive as { uri };
 * bundled placeholders come back from the bundler as a URL or a module, depending on the platform.
 */
function artworkUrl(releaseId: string): string | undefined {
  const source: unknown = photoSource(releaseId);
  if (typeof source === 'string') return source;
  if (source && typeof source === 'object' && 'uri' in source) {
    const uri = (source as { uri?: string }).uri;
    if (uri) return uri;
  }
  const resolve = (Image as { resolveAssetSource?: (s: unknown) => { uri?: string } }).resolveAssetSource;
  return resolve?.(source)?.uri ?? FALLBACK_ART;
}

/** The app icon, so the lock screen is never blank. */
const FALLBACK_ART = Platform.OS === 'web' ? '/icon-512.png' : undefined;
