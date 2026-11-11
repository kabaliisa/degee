/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whatsNew } from './whatsNew.ts';

const releases = [
  { id: 'r1', artistId: 'a1', year: 2026, trackIds: ['t1', 't2'] },
  { id: 'r2', artistId: 'a2', year: 2026, trackIds: ['t3'] },
  { id: 'r3', artistId: 'a3', year: 2025, trackIds: ['t4'] },
  { id: 'r4', artistId: 'a3', year: 2026, trackIds: ['t5'] },
];
const name = (id: string) => ({ a1: 'Nalu', a2: 'Kiwa', a3: 'Grace' })[id] ?? id;

test('new releases overall when you follow nobody', () => {
  const w = whatsNew(releases, [], [], name);
  assert.equal(w.headline, '3 new releases this week');
  assert.equal(w.detail, 'From Nalu, Kiwa and more');
});

test('followed artists come first', () => {
  const w = whatsNew(releases, ['a2'], [], name);
  assert.equal(w.headline, '1 new from your artists');
  assert.equal(w.detail, 'From Kiwa');
});

test('owned releases are not new', () => {
  const w = whatsNew(releases, [], ['t1', 't2', 't3', 't5'], name);
  assert.equal(w.headline, "You're all caught up");
});

test('two artists read naturally', () => {
  const w = whatsNew(releases, [], ['t5'], name);
  assert.equal(w.detail, 'From Nalu and Kiwa');
});
