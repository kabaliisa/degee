/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatUGX, splitGift, splitSale } from './money.ts';

const sum = (s: ReturnType<typeof splitSale>) => s.uprs + s.songwritersDirect + s.artist + s.platform;

test('UPRS member writer: song share goes to UPRS', () => {
  const s = splitSale(2000, [{ name: 'A', sharePct: 100, society: 'UPRS' }]);
  assert.equal(s.uprs, 200);
  assert.equal(s.songwritersDirect, 0);
  assert.equal(s.artist, 1440);
  assert.equal(s.platform, 360);
  assert.equal(sum(s), 2000);
});

test('writer in no society: song share paid directly, nothing to UPRS', () => {
  const s = splitSale(2000, [{ name: 'A', sharePct: 100, society: null }]);
  assert.equal(s.uprs, 0);
  assert.equal(s.songwritersDirect, 200);
  assert.equal(sum(s), 2000);
});

test('co-written: split per writer', () => {
  const s = splitSale(3000, [
    { name: 'A', sharePct: 50, society: 'UPRS' },
    { name: 'B', sharePct: 50, society: null },
  ]);
  assert.equal(s.uprs, 150);
  assert.equal(s.songwritersDirect, 150);
  assert.equal(sum(s), 3000);
});

test('foreign society writer is collected by UPRS', () => {
  const s = splitSale(1000, [{ name: 'K', sharePct: 100, society: 'FOREIGN' }]);
  assert.equal(s.uprs, 100);
});

test('odd amounts never lose a shilling', () => {
  for (const total of [1, 7, 999, 1501, 4999]) {
    const s = splitSale(total, [
      { name: 'A', sharePct: 33, society: 'UPRS' },
      { name: 'B', sharePct: 67, society: null },
    ]);
    assert.equal(sum(s), total);
  }
});

test('rejects bad input', () => {
  assert.throws(() => splitSale(10.5, []));
  assert.throws(() => splitSale(1000, [{ name: 'A', sharePct: 90 }]));
});

test('formatUGX', () => {
  assert.equal(formatUGX(2000), 'UGX 2,000');
});

test('gift: artist gets 95%, no songwriter share, nothing lost', () => {
  const g = splitGift(5000);
  assert.equal(g.artist, 4750);
  assert.equal(g.platform, 250);
  const odd = splitGift(1999);
  assert.equal(odd.artist + odd.platform, 1999);
  assert.throws(() => splitGift(100));
});
