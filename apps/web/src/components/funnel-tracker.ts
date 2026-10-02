'use client';

import * as React from 'react';

export type FunnelKind = 'event_view' | 'widget_open' | 'widget_session' | 'order_created';

const VISITOR_KEY = 'daibilet_visitor_id';
const MAX_QUEUE = 20;

/**
 * Purchase funnel tracking.
 *
 * Exists because the store only ever saw finished orders: a visitor who opened
 * a vendor widget and left left no trace, so the drop-off could only be guessed
 * at. `widget_session` is the one step we cannot see - seat selection runs
 * inside the Ticketscloud / Teplohod widget - so its absence means unmeasurable,
 * not zero.
 *
 * Fire-and-forget by design. Nothing here may block or break a purchase path,
 * so every failure is swallowed and the queue is dropped rather than retried.
 */

function randomId(): string {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

function readVisitorId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const minted = randomId();
    window.localStorage.setItem(VISITOR_KEY, minted);
    return minted;
  } catch {
    // Private mode or blocked storage: events still fire, just not stitched.
    return null;
  }
}

function post(kind: FunnelKind, payload: { ref?: string | null; provider?: string | null }): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({
      kind,
      ref: payload.ref ?? null,
      provider: payload.provider ?? null,
      visitorId: readVisitorId(),
      occurredAt: new Date().toISOString(),
    });
    // keepalive so the event survives a navigation away from the event page.
    void fetch('/api/funnel', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* tracking must never break the page */
  }
}

/** Fire from a click handler on the buy button, before the widget is opened. */
export function trackWidgetOpen(ref?: string | null, provider?: string | null): void {
  post('widget_open', { ref, provider });
}

export function trackEventView(ref?: string | null): void {
  post('event_view', { ref });
}

export function trackWidgetSession(ref?: string | null, provider?: string | null): void {
  post('widget_session', { ref, provider });
}

/** One-shot event_view per mount, guarded so React strict mode does not double-count. */
export function FunnelEventView({ ref }: { ref?: string | null }): null {
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEventView(ref);
  }, [ref]);
  return null;
}