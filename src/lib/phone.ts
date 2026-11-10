export type Provider = 'MTN MoMo' | 'Airtel Money';

// Ugandan mobile numbers: 07XXXXXXXX or +2567XXXXXXXX. MTN: 076/077/078/039, Airtel: 070/074/075/020.
export function normalizeUgPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const local = digits.startsWith('256') ? digits.slice(3) : digits.startsWith('0') ? digits.slice(1) : digits;
  return /^7\d{8}$/.test(local) ? `+256${local}` : null;
}
export function guessProvider(e164: string): Provider | null {
  const p = e164.slice(4, 6);
  if (['76', '77', '78'].includes(p)) return 'MTN MoMo';
  if (['70', '74', '75'].includes(p)) return 'Airtel Money';
  return null;
}
