/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseAudioFocus, takeAudioFocus } from './audioFocus.ts';

test('starting one player stops the other', () => {
  const main = {}, preview = {};
  const stopped: string[] = [];
  takeAudioFocus(main, () => stopped.push('main'));
  takeAudioFocus(preview, () => stopped.push('preview'));
  assert.deepEqual(stopped, ['main']);
  takeAudioFocus(main, () => stopped.push('main'));
  assert.deepEqual(stopped, ['main', 'preview']);
});

test('the same player taking focus again does not stop itself, and released focus stops nobody', () => {
  const main = {}, other = {};
  let stops = 0;
  takeAudioFocus(main, () => stops++);
  takeAudioFocus(main, () => stops++);
  releaseAudioFocus(main);
  takeAudioFocus(other, () => {});
  assert.equal(stops, 0);
  releaseAudioFocus(other);
});
