import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { checkoutPaymentSettled, watchCheckoutPayment } from './checkout-payment.ts';

const pending = { status: 'PENDING_PAYMENT', payment: { status: 'PENDING' } };

test('only terminal backend status completes checkout; authorization is not payment', () => {
  assert.equal(checkoutPaymentSettled(pending), false);
  assert.equal(checkoutPaymentSettled({ status: 'PENDING_PAYMENT', payment: { status: 'WAITING_FOR_CAPTURE' } }), false);
  for (const status of ['SUCCEEDED', 'CANCELED', 'CANCELLED', 'REFUNDED']) {
    assert.equal(checkoutPaymentSettled({ ...pending, payment: { status } }), true);
  }
  assert.equal(checkoutPaymentSettled({ ...pending, status: 'CONFIRMED' }), true);
});

test('polling retries transport errors sequentially and stops on confirmation', async () => {
  let reads = 0;
  let active = 0;
  let peak = 0;
  let finished = 0;
  let resolve!: () => void;
  const done = new Promise<void>((r) => { resolve = r; });
  const stop = watchCheckoutPayment({
    intervalMs: 1,
    maxDurationMs: 1000,
    read: async () => {
      peak = Math.max(peak, ++active);
      reads++;
      await delay(5);
      active--;
      if (reads === 1) throw new Error('network');
      return reads < 3 ? pending : { ...pending, status: 'CONFIRMED' };
    },
    onSettled: () => { finished++; resolve(); },
    onTimeout: resolve,
  });
  try {
    await done;
    await delay(15);
    assert.equal(reads, 3);
    assert.equal(peak, 1);
    assert.equal(finished, 1);
  } finally { stop(); }
});

test('unmount aborts an in-flight poll and never navigates', async () => {
  let signal!: AbortSignal;
  let settle!: (value: typeof pending) => void;
  let completed = false;
  const stop = watchCheckoutPayment({
    read: (s) => { signal = s; return new Promise((r) => { settle = r; }); },
    onSettled: () => { completed = true; },
    onTimeout: () => { completed = true; },
  });
  stop();
  settle({ ...pending, status: 'CONFIRMED' });
  await delay(5);
  assert.equal(signal.aborted, true);
  assert.equal(completed, false);
});

test('hung requests abort; overall deadline stops polling without marking payment failed', async () => {
  const signals: AbortSignal[] = [];
  let settled = false;
  let resolve!: () => void;
  const done = new Promise<void>((r) => { resolve = r; });
  const stop = watchCheckoutPayment({
    intervalMs: 1,
    requestTimeoutMs: 5,
    maxDurationMs: 40,
    read: (signal) => { signals.push(signal); return new Promise(() => {}); },
    onSettled: () => { settled = true; },
    onTimeout: resolve,
  });
  try {
    await done;
    const count = signals.length;
    await delay(10);
    assert.ok(count >= 1);
    assert.equal(signals.length, count);
    assert.ok(signals.every((signal) => signal.aborted));
    assert.equal(settled, false);
  } finally { stop(); }
});
