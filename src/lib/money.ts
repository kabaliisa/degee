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
  giftPlatformPct: 5, // Deegee's cut of a gift; the artist gets the rest
  minGift: 500,
  minPayment: 500, // mobile money's smallest payment; anything collected beyond the price stays as Deegee credit
  maxPayment: 2_000_000,
};

export function formatUGX(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

/**
 * What a checkout asks the phone for. Deegee credit is used first; the rest is paid by mobile money,
 * never less than its smallest payment. The server works this out the same way (CheckoutService).
 */
export function amountDue(price: number, credit: number, terms = TERMS): { fromCredit: number; toPay: number } {
  const fromCredit = Math.min(Math.max(credit, 0), price);
  const rest = price - fromCredit;
  return { fromCredit, toPay: rest === 0 ? 0 : Math.max(rest, terms.minPayment) };
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

export type GiftSplit = { total: number; artist: number; platform: number };

/** A gift goes to the artist, not a song, so no songwriter/UPRS share. Rounding favours the artist. */
export function splitGift(total: number, terms = TERMS): GiftSplit {
  if (!Number.isInteger(total) || total < terms.minGift) throw new Error(`gift must be at least UGX ${terms.minGift}`);
  const platform = Math.floor((total * terms.giftPlatformPct) / 100);
  return { total, artist: total - platform, platform };
}

const ZERO: SaleSplit = { total: 0, uprs: 0, songwritersDirect: 0, artist: 0, platform: 0 };
const addSplits = (a: SaleSplit, b: SaleSplit): SaleSplit => ({
  total: a.total + b.total,
  uprs: a.uprs + b.uprs,
  songwritersDirect: a.songwritersDirect + b.songwritersDirect,
  artist: a.artist + b.artist,
  platform: a.platform + b.platform,
});

/**
 * Split a whole-release sale. The release price is shared across its songs in proportion
 * to their single prices (the last song takes the rounding remainder), then each song's
 * share is split by its own songwriters.
 */
export function splitRelease(price: number, songs: { priceUGX: number; writers: Songwriter[] }[], terms = TERMS): SaleSplit {
  if (songs.length === 0) return splitSale(price, [], terms);
  const listTotal = songs.reduce((s, t) => s + t.priceUGX, 0);
  let remaining = price;
  return songs.reduce<SaleSplit>((acc, t, i) => {
    const part = i === songs.length - 1 ? remaining : Math.floor((price * t.priceUGX) / listTotal);
    remaining -= part;
    return addSplits(acc, splitSale(part, t.writers, terms));
  }, ZERO);
}
