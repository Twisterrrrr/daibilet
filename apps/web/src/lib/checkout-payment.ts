type PaymentState = {
  status: string;
  payment: { status: string | null };
};

export function checkoutPaymentSettled(order: PaymentState): boolean {
  // Timestamps and ticket numbers can remain after a refund; use current statuses.
  return ['CONFIRMED', 'FULFILLED', 'CANCELLED', 'CANCELED', 'FAILED', 'EXPIRED', 'REFUNDED']
    .includes(order.status.toUpperCase()) ||
    ['SUCCEEDED', 'CANCELED', 'CANCELLED', 'FAILED', 'REFUNDED'].includes(String(order.payment.status).toUpperCase());
}

export function watchCheckoutPayment(options: {
  read: (signal: AbortSignal) => Promise<PaymentState>;
  onSettled: () => void;
  onTimeout: () => void;
  intervalMs?: number;
  requestTimeoutMs?: number;
  maxDurationMs?: number;
}): () => void {
  let stopped = false;
  let nextPoll: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  const deadline = setTimeout(() => {
    stop();
    options.onTimeout();
  }, options.maxDurationMs ?? 30 * 60_000);

  function stop() {
    stopped = true;
    clearTimeout(deadline);
    clearTimeout(nextPoll);
    request?.abort();
  }

  async function poll() {
    if (stopped) return;
    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(() => controller.abort(), options.requestTimeoutMs ?? 8000);
    try {
      const aborted = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('checkout_poll_aborted')), { once: true });
      });
      const order = await Promise.race([options.read(controller.signal), aborted]);
      if (!stopped && checkoutPaymentSettled(order)) {
        stop();
        options.onSettled();
      }
    } catch {
      // A transport failure is not a failed payment. Retry without creating an order.
    } finally {
      clearTimeout(timeout);
      if (!stopped) nextPoll = setTimeout(() => void poll(), options.intervalMs ?? 2000);
    }
  }

  void poll();
  return stop;
}
