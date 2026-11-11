import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { mediaUrl } from '../../api/catalog';
import { releaseAudioFocus, takeAudioFocus } from '../../lib/audioFocus';
import { getPlayLink } from '../../api/studio';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

/**
 * Drives playback. Songs with a real recording play through expo-audio, using a short-lived link
 * from the API when you may hear them in full (you bought it, or it's your own song). Everything else (previews, and the demo songs with no recording)
 * advances on a timer until the audio pipeline makes real previews. Renders nothing.
 */
const MAIN_PLAYER = {}; // identity for audio focus

export function PlayerEngine() {
  const owns = useWallet((s) => s.owns);
  const trackId = usePlayer((s) => s.queue[s.index]);
  const hasAudio = usePlayer((s) => s.current()?.hasAudio ?? false);
  const isOwned = useWallet((s) => (trackId ? s.ownedTracks.includes(trackId) : false));
  const [link, setLink] = useState<{ trackId: string; url: string } | null>(null);
  const audioUrl = link && link.trackId === trackId ? link.url : undefined;
  const isPlaying = usePlayer((s) => s.isPlaying);
  const limit = usePlayer((s) => s.limitSec());
  const tick = usePlayer((s) => s.tick);
  const next = usePlayer((s) => s.next);
  const setPreview = usePlayer((s) => s.setPreview);

  const audio = useAudioPlayer(audioUrl ? { uri: audioUrl } : null);
  const { currentTime, didJustFinish } = useAudioPlayerStatus(audio);

  // A music app should play with the iPhone's silent switch on, keep going when the screen locks,
  // and pause other apps' audio (as Spotify does).
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
  }, []);

  // A song with a real recording: ask the server for a play link. It decides who may hear it in full
  // (buyers, the song's own artist, admins); anyone else gets a refusal and hears the simulated preview.
  useEffect(() => {
    if (!trackId || !hasAudio) return;
    let cancelled = false;
    getPlayLink(trackId)
      .then(({ url }) => { if (!cancelled) setLink({ trackId, url: mediaUrl(url) }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [trackId, hasAudio, isOwned]); // isOwned: buying mid-preview asks again and unlocks the full song

  // Full song if you own it or the server gave a link (e.g. you're the artist); otherwise a preview.
  const canPlayFull = isOwned || audioUrl !== undefined;
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
    if (!audioUrl) return;
    if (isPlaying) audio.play();
    else audio.pause();
  }, [audio, audioUrl, isPlaying]);

  // Real audio: report position and stop at the preview limit or the end of the song.
  useEffect(() => {
    if (!audioUrl || !isPlaying) return;
    usePlayer.setState({ positionSec: Math.floor(currentTime) });
    if (currentTime >= limit || didJustFinish) next(owns);
  }, [audioUrl, isPlaying, currentTime, didJustFinish, limit, next, owns]);

  // Mock audio: advance once a second.
  useEffect(() => {
    if (!trackId || audioUrl || !isPlaying) return;
    const id = setInterval(() => tick(owns), 1000);
    return () => clearInterval(id);
  }, [trackId, audioUrl, isPlaying, tick, owns]);

  return null;
}
