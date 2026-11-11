/**
 * A fresh Idempotency-Key for one money action. Create it once per checkout screen, not per tap,
 * so a double tap or a retry after a dropped connection can never charge twice.
 */
export function newIdempotencyKey(): string {
  let key = '';
  while (key.length < 24) key += Math.random().toString(36).slice(2);
  return key.slice(0, 24);
}
