import { useState } from 'react';
import { ApiError } from '../api/client';
import type { CheckoutItem, Order, PayWith } from '../api/checkout';
import { newIdempotencyKey } from '../lib/ids';
import { useWallet } from '../store/wallet';

/**
 * form: choosing how to pay. waiting: the PIN prompt is on their phone. done: paid and delivered.
 * slow: no answer after two minutes (it still completes if they approve). credited: paid, but it couldn't
 * be completed, so the money is kept as Deegee credit.
 */
export type CheckoutStage = 'form' | 'waiting' | 'done' | 'slow' | 'credited';

/** Runs one checkout from the Pay button to the result. Shared by buying music and sending gifts. */
export function useCheckout() {
  const startCheckout = useWallet((s) => s.startCheckout);
  const awaitOrder = useWallet((s) => s.awaitOrder);
  // One key per attempt, so a retry after a dropped connection can never charge twice.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [stage, setStage] = useState<CheckoutStage>('form');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const settle = (o: Order) => {
    setOrder(o);
    if (o.status === 'COMPLETED') return setStage('done');
    if (o.status === 'CREDITED') return setStage('credited');
    if (o.status === 'WAITING') return setStage('slow');
    // Declined: that attempt is finished, so trying again is a new one.
    setIdempotencyKey(newIdempotencyKey());
    setError('The payment wasn’t approved, so nothing was charged. You can try again.');
    setStage('form');
  };

  const pay = async (item: CheckoutItem, payWith: PayWith | null) => {
    setError(null);
    setBusy(true);
    try {
      const started = await startCheckout(item, payWith, idempotencyKey);
      setBusy(false);
      if (started.status !== 'WAITING') return settle(started);
      setOrder(started);
      setStage('waiting');
      settle(await awaitOrder(started));
    } catch (e) {
      setBusy(false);
      setStage('form');
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    }
  };

  return { stage, order, error, busy, pay, setError };
}
