import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

/**
 * Drives playback. Tracks with an audioUrl play through expo-audio (and stop at the
 * 30-second preview limit for non-owners). Mock tracks without audio advance on a timer
 * so the whole flow can be tested before the backend exists. Renders nothing.
 */
export function PlayerEngine() {
  const owns = useWallet((s) => s.owns);
  const trackId = usePlayer((s) => s.queue[s.index]);
  const audioUrl = usePlayer((s) => s.current()?.audioUrl);
  const isOwned = useWallet((s) => (trackId ? s.ownedTracks.includes(trackId) : false));
  const isPlaying = usePlayer((s) => s.isPlaying);
  const limit = usePlayer((s) => s.limitSec());
  const tick = usePlayer((s) => s.tick);
  const next = usePlayer((s) => s.next);
  const setPreview = usePlayer((s) => s.setPreview);

  const audio = useAudioPlayer(audioUrl ? { uri: audioUrl } : null);
  const { currentTime, didJustFinish } = useAudioPlayerStatus(audio);

  // Buying the playing track mid-preview unlocks the full song immediately.
  useEffect(() => {
    if (trackId) setPreview(!isOwned);
  }, [trackId, isOwned, setPreview]);

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
