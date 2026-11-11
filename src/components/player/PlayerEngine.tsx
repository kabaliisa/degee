import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { mediaUrl } from '../../api/catalog';
import { getPlayLink } from '../../api/studio';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

/**
 * Drives playback. Songs you own that have a real recording play it through expo-audio, using a
 * short-lived link from the API. Everything else (previews, and the demo songs with no recording)
 * advances on a timer until the audio pipeline makes real previews. Renders nothing.
 */
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

  // Owned song with a real recording: ask for a play link. If that fails, it falls back to simulated playback.
  useEffect(() => {
    if (!trackId || !hasAudio || !isOwned) return;
    let cancelled = false;
    getPlayLink(trackId)
      .then(({ url }) => { if (!cancelled) setLink({ trackId, url: mediaUrl(url) }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [trackId, hasAudio, isOwned]);

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
