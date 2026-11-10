import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { usePlayer } from '../store/player';
import { useWallet } from '../store/wallet';

/**
 * Drives playback. Tracks with an audioUrl play through expo-audio (and stop at the
 * 30-second preview limit for non-owners). Mock tracks without audio advance on a timer
 * so the whole flow can be tested before the backend exists.
 */
export function PlayerEngine() {
  const owns = useWallet((s) => s.owns);
  const ownedTracks = useWallet((s) => s.ownedTracks);
  const { isPlaying, positionSec, tick, setPreview, next } = usePlayer();
  const track = usePlayer((s) => s.current());
  const limit = usePlayer((s) => s.limitSec());

  const audio = useAudioPlayer(track?.audioUrl ? { uri: track.audioUrl } : null);
  const status = useAudioPlayerStatus(audio);

  // Buying the playing track mid-preview unlocks the full song immediately.
  useEffect(() => {
    if (track) setPreview(!owns(track.id));
  }, [ownedTracks, track?.id]);

  // Real audio: mirror play/pause and enforce the preview limit.
  useEffect(() => {
    if (!track?.audioUrl) return;
    if (isPlaying) audio.play();
    else audio.pause();
  }, [isPlaying, track?.audioUrl]);

  useEffect(() => {
    if (!track?.audioUrl || !isPlaying) return;
    usePlayer.setState({ positionSec: Math.floor(status.currentTime) });
    if (status.currentTime >= limit || status.didJustFinish) next(owns);
  }, [status.currentTime, status.didJustFinish]);

  // Mock audio: advance once a second.
  useEffect(() => {
    if (!track || track.audioUrl || !isPlaying) return;
    const id = setInterval(() => tick(owns), 1000);
    return () => clearInterval(id);
  }, [track?.id, isPlaying]);

  void positionSec;
  return null;
}
