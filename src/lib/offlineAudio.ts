/**
 * Saving songs to the device, so a bought song plays with no connection and no data.
 *
 * This is the native build, where it does nothing yet: on a phone the file would go to the filesystem
 * rather than a browser cache, which is its own job (#43). The web build in offlineAudio.web.ts is the
 * real one, and it is what the PWA uses.
 */
export const canSaveSongs = false;

export async function saveSong(_trackId: string, _url: string): Promise<void> {}

/** A URL that plays the saved copy, or null if this song isn't saved. */
export async function savedSongUrl(_trackId: string): Promise<string | null> {
  return null;
}

export async function removeSong(_trackId: string): Promise<void> {}

export async function removeAllSongs(): Promise<void> {}

export async function listSavedSongs(): Promise<string[]> {
  return [];
}

/** Roughly how much room the saved songs take, in bytes. */
export async function savedSongsBytes(): Promise<number> {
  return 0;
}
