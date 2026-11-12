/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextIndex, nextRepeat, shuffleKeepingFirst } from './queue.ts';

test('repeat cycles off → all → one → off', () => {
  assert.equal(nextRepeat('off'), 'all');
  assert.equal(nextRepeat('all'), 'one');
  assert.equal(nextRepeat('one'), 'off');
});

test('shuffle keeps the chosen song first and every song once', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = shuffleKeepingFirst(ids, 'c', random);
  assert.equal(out[0], 'c');
  assert.deepEqual([...out].sort(), ids);
  assert.notDeepEqual(out, ['c', 'a', 'b', 'd', 'e']); // actually shuffled with this seed
});

test('next song: moves on, stops at the end, or wraps with repeat all', () => {
  assert.equal(nextIndex(0, 3, 'off', true), 1);
  assert.equal(nextIndex(2, 3, 'off', true), null);
  assert.equal(nextIndex(2, 3, 'all', true), 0);
  assert.equal(nextIndex(0, 1, 'all', false), 0); // a single on repeat: Next replays it
});

test('repeat one replays when the song ends, but Next still moves on', () => {
  assert.equal(nextIndex(1, 3, 'one', true), 1);
  assert.equal(nextIndex(1, 3, 'one', false), 2);
  assert.equal(nextIndex(2, 3, 'one', false), 0);
});
