// All money in Deegee is whole Ugandan shillings (integers). No decimals, no floats.

export type Songwriter = {
  name: string;
  sharePct: number; // share of the song (composition), all writers sum to 100
  society?: 'UPRS' | 'FOREIGN' | null; // collecting society, if any
};

export type SaleSplit = {
  total: number;
  uprs: number; // songwriter shares owed to UPRS (members + foreign-society writers)
  songwritersDirect: number; // songwriter shares paid directly to non-member writers
  artist: number;
  platform: number;
};

// Placeholders until the UPRS licence and artist terms are signed.
export const TERMS = {
  songSharePct: 10, // % of each sale that belongs to the song (composition)
  platformPctOfRest: 20, // platform keeps 20% of what remains; artist gets the rest
  minTopUp: 1000,
  maxTopUp: 2_000_000,
};

export function formatUGX(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

/**
 * Split one sale. The song share is divided per songwriter: writers in UPRS
 * (or a foreign society UPRS represents) go to UPRS; writers in no society are
 * paid directly. Rounding remainders go to the artist so the parts always sum
 * to the total.
 */
export function splitSale(total: number, writers: Songwriter[], terms = TERMS): SaleSplit {
  if (!Number.isInteger(total) || total < 0) throw new Error('total must be whole UGX');
  const shareSum = writers.reduce((s, w) => s + w.sharePct, 0);
  if (writers.length > 0 && shareSum !== 100) throw new Error('songwriter shares must sum to 100');

  const songShare = Math.floor((total * terms.songSharePct) / 100);
  let uprs = 0;
  let direct = 0;
  for (const w of writers) {
    const part = Math.floor((songShare * w.sharePct) / 100);
    if (w.society) uprs += part;
    else direct += part;
  }
  // No writer data → treat the whole song share as owed to UPRS (safe default).
  if (writers.length === 0) uprs = songShare;

  const rest = total - uprs - direct;
  const platform = Math.floor((rest * terms.platformPctOfRest) / 100);
  const artist = rest - platform;
  return { total, uprs, songwritersDirect: direct, artist, platform };
}
