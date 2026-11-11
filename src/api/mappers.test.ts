/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromServerProvider, toServerProvider, toWalletTx } from './mappers.ts';

test('providers map both ways', () => {
  assert.equal(toServerProvider('MTN MoMo'), 'MTN_MOMO');
  assert.equal(toServerProvider('Airtel Money'), 'AIRTEL_MONEY');
  assert.equal(fromServerProvider('MTN_MOMO'), 'MTN MoMo');
  assert.equal(fromServerProvider(null), undefined);
});

test('wallet activity becomes a WalletTx', () => {
  const tx = toWalletTx({
    id: 'abc', type: 'GIFT', status: 'COMPLETED', amountUgx: -2000, description: 'Nalu Kizza',
    note: 'Webale!', provider: null, at: '2026-11-11T20:04:00.325Z',
  });
  assert.deepEqual(tx, {
    id: 'abc', at: Date.parse('2026-11-11T20:04:00.325Z'), kind: 'GIFT', amount: -2000, label: 'Nalu Kizza',
    status: 'COMPLETED', note: 'Webale!', provider: undefined,
  });
});

test('pending top-up keeps its provider', () => {
  const tx = toWalletTx({
    id: 'p1', type: 'TOPUP', status: 'PENDING', amountUgx: 5000, description: 'Added money',
    note: null, provider: 'AIRTEL_MONEY', at: '2026-11-11T20:00:00Z',
  });
  assert.equal(tx.provider, 'Airtel Money');
  assert.equal(tx.note, undefined);
});
