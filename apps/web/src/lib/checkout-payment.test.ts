import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildAdmissionCheckoutIdempotencyKey,
  isPendingCheckoutOrderStatus,
  isTerminalCheckoutOrderStatus,
  pickCheckoutConfirmation,
  pollCheckoutOrderUntilTerminal,
} from './checkout-payment.ts';

describe('checkout-payment', () => {
  it('reuses the same idempotency key for the same checkout payload', () => {
    const a = buildAdmissionCheckoutIdempotencyKey({
      admissionProductSlug: 'phase-g-test-museum-entry',
      admissionOfferId: 'offer-1',
      quantity: 1,
      email: 'Buyer@Example.com',
      confirmationMode: 'embedded',
    });
    const b = buildAdmissionCheckoutIdempotencyKey({
      admissionProductSlug: 'phase-g-test-museum-entry',
      admissionOfferId: 'offer-1',
      quantity: 1,
      email: 'buyer@example.com',
      confirmationMode: 'embedded',
    });
    assert.equal(a, b);
    assert.match(a, /embedded$/);
  });

  it('changes idempotency key when confirmation mode differs', () => {
    const embedded = buildAdmissionCheckoutIdempotencyKey({
      admissionProductSlug: 'phase-g-test-museum-entry',
      admissionOfferId: 'offer-1',
      quantity: 1,
      email: 'buyer@example.com',
      confirmationMode: 'embedded',
    });
    const redirect = buildAdmissionCheckoutIdempotencyKey({
      admissionProductSlug: 'phase-g-test-museum-entry',
      admissionOfferId: 'offer-1',
      quantity: 1,
      email: 'buyer@example.com',
      confirmationMode: 'redirect',
    });
    assert.notEqual(embedded, redirect);
  });

  it('detects terminal and pending statuses', () => {
    assert.equal(isTerminalCheckoutOrderStatus('CONFIRMED'), true);
    assert.equal(isTerminalCheckoutOrderStatus('canceled'), true);
    assert.equal(isTerminalCheckoutOrderStatus('PENDING'), false);
    assert.equal(isPendingCheckoutOrderStatus('PENDING'), true);
    assert.equal(isPendingCheckoutOrderStatus('CONFIRMED'), false);
  });

  it('falls back to redirect when confirmationToken is missing', () => {
    const picked = pickCheckoutConfirmation({
      confirmationMode: 'embedded',
      confirmationToken: null,
      confirmationUrl: 'https://yookassa.ru/checkout/pay',
    });
    assert.equal(picked.confirmationMode, 'redirect');
    assert.equal(picked.confirmationToken, null);
    assert.equal(picked.confirmationUrl, 'https://yookassa.ru/checkout/pay');
  });

  it('prefers embedded when confirmationToken is present', () => {
    const picked = pickCheckoutConfirmation({
      confirmationMode: 'embedded',
      confirmationToken: 'ct_test',
      confirmationUrl: null,
    });
    assert.equal(picked.confirmationMode, 'embedded');
    assert.equal(picked.confirmationToken, 'ct_test');
  });

  it('polls sequentially, is abortable, and stops on terminal state', async () => {
    const calls: string[] = [];
    let ticks = 0;
    const controller = new AbortController();

    const result = await pollCheckoutOrderUntilTerminal({
      publicCode: '1234567',
      intervalMs: 1,
      requestTimeoutMs: 50,
      maxDurationMs: 5_000,
      signal: controller.signal,
      now: () => {
        ticks += 1;
        return ticks;
      },
      sleep: async () => {
        calls.push('sleep');
      },
      lookup: async (code) => {
        calls.push(`lookup:${code}`);
        if (calls.filter((row) => row.startsWith('lookup:')).length >= 2) {
          return { found: true, status: 'CONFIRMED' };
        }
        return { found: true, status: 'PENDING' };
      },
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.reason, 'terminal');
      assert.equal(result.lookup.status, 'CONFIRMED');
    }
    assert.deepEqual(
      calls.filter((row) => row.startsWith('lookup:')),
      ['lookup:1234567', 'lookup:1234567'],
    );
    assert.ok(calls.includes('sleep'));
  });

  it('keeps pending and retries after a transport error', async () => {
    let attempts = 0;
    const result = await pollCheckoutOrderUntilTerminal({
      publicCode: '999',
      intervalMs: 1,
      requestTimeoutMs: 50,
      maxDurationMs: 5_000,
      now: (() => {
        let t = 0;
        return () => {
          t += 1;
          return t;
        };
      })(),
      sleep: async () => undefined,
      lookup: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('network');
        return { found: true, status: 'CONFIRMED' };
      },
    });

    assert.equal(result.ok, true);
    assert.equal(attempts, 2);
  });

  it('result-page style: pending lookup later becomes CONFIRMED without failing', async () => {
    const statuses = ['PENDING', 'PENDING', 'CONFIRMED'];
    let index = 0;
    const updates: string[] = [];

    const result = await pollCheckoutOrderUntilTerminal({
      publicCode: 'pending-then-ok',
      intervalMs: 1,
      requestTimeoutMs: 50,
      maxDurationMs: 5_000,
      now: (() => {
        let t = 0;
        return () => {
          t += 1;
          return t;
        };
      })(),
      sleep: async () => undefined,
      onUpdate: (lookup) => {
        if (lookup.status) updates.push(String(lookup.status));
      },
      lookup: async () => {
        const status = statuses[Math.min(index, statuses.length - 1)];
        index += 1;
        return { found: true, status };
      },
    });

    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.lookup.status, 'CONFIRMED');
    assert.deepEqual(updates, ['PENDING', 'PENDING', 'CONFIRMED']);
  });

  it('stops polling when aborted before terminal state', async () => {
    const controller = new AbortController();
    let lookups = 0;
    const resultPromise = pollCheckoutOrderUntilTerminal({
      publicCode: 'abort-me',
      intervalMs: 5,
      requestTimeoutMs: 50,
      maxDurationMs: 5_000,
      signal: controller.signal,
      sleep: async (_ms, signal) => {
        controller.abort();
        if (signal?.aborted) {
          const err = new Error('aborted');
          err.name = 'AbortError';
          throw err;
        }
      },
      lookup: async () => {
        lookups += 1;
        return { found: true, status: 'PENDING' };
      },
    });

    const result = await resultPromise;
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'aborted');
    assert.ok(lookups >= 1);
  });
});
