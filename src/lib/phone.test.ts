/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessProvider, normalizeUgPhone } from './phone.ts';

test('normalizes Ugandan mobile numbers', () => {
  assert.equal(normalizeUgPhone('0772 123456'), '+256772123456');
  assert.equal(normalizeUgPhone('+256 701 234 567'), '+256701234567');
  assert.equal(normalizeUgPhone('256751234567'), '+256751234567');
  assert.equal(normalizeUgPhone('0412 345678'), null); // landline
  assert.equal(normalizeUgPhone('077212'), null);
});

test('guesses provider from prefix', () => {
  assert.equal(guessProvider('+256772123456'), 'MTN MoMo');
  assert.equal(guessProvider('+256701234567'), 'Airtel Money');
  assert.equal(guessProvider('+256791234567'), null);
});
