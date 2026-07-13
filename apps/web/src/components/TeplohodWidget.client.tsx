'use client';

import * as React from 'react';

const DEFAULT_TEP_WIDGET_ID = process.env.NEXT_PUBLIC_TEP_WIDGET_ID?.trim() || '14208';
const TEP_WIDGET_SCRIPT_URL = 'https://api.teplohod.info/v1/widget/widget.js';

const TEP_WIDGET_CSS = `
.teplohod-info-wrapper .ti-tickets-event-tickets-buy {
  display: flex !important;
  width: 100% !important;
  min-height: 2.75rem !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.5rem !important;
  border: 0 !important;
  border-radius: 0.75rem !important;
  background: #2563eb !important;
  padding: 0.75rem 1rem !important;
  color: #fff !important;
  cursor: pointer !important;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  line-height: 1.25rem !important;
  text-decoration: none !important;
  box-shadow: 0 12px 24px rgb(37 99 235 / 0.24) !important;
}
.teplohod-info-wrapper .ti-tickets-event-tickets-buy:hover {
  background: #1d4ed8 !important;
}
.teplohod-info-wrapper .ti-tickets-widget {
  max-width: 100% !important;
}
.teplohod-info-wrapper #deleted-block,
.teplohod-info-wrapper .ti-tickets-event-tickets-buy-closed {
  display: none !important;
}
/* Keep Teplohod Fancybox above Next layout chrome */
.fancyboxtkt-container,
.fancyboxtkt-bg {
  z-index: 100000 !important;
}
`;

type TeplohodWidgetWindow = Window & {
  TI_Tickets?: {
    init?: () => void;
    widget?: {
      init?: () => void;
      prefetch?: () => Promise<unknown>;
    };
  };
};

let widgetScriptPromise: Promise<void> | null = null;
let bootstrapPromise: Promise<boolean> | null = null;

function normalizeTeplohodEventId(value?: string | number | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const match = raw.match(/(?:^tep-)?(\d+)$/i);
  return match ? match[1] : raw;
}

function resetStuckTeplohodContainers() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.teplohod-info-wrapper').forEach((element) => {
    const hasMarkup = element.querySelector('.ti-tickets-event-tickets-buy, .ti-tickets-widget, iframe');
    if (!hasMarkup) {
      element.removeAttribute('data-state');
    }
  });
}

/** Full Teplohod bootstrap: prefetch cache + widget init (required after SPA navigation). */
export function bootstrapTeplohodWidgets() {
  if (typeof window === 'undefined') return Promise.resolve(false);

  const tickets = (window as TeplohodWidgetWindow).TI_Tickets;
  if (!tickets?.init) return Promise.resolve(false);

  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = new Promise<boolean>((resolve) => {
    resetStuckTeplohodContainers();
    try {
      tickets.init!();
      window.setTimeout(() => resolve(true), 0);
    } catch {
      resolve(false);
    }
  }).finally(() => {
    window.setTimeout(() => {
      bootstrapPromise = null;
    }, 400);
  });

  return bootstrapPromise;
}

function containerHasWidgetMarkup(container: HTMLElement | null) {
  if (!container) return false;
  return Boolean(container.querySelector('.ti-tickets-event-tickets-buy, .ti-tickets-widget, iframe'));
}

function waitForTeplohodFancyboxContent(timeoutMs = 5000) {
  return new Promise<boolean>((resolve) => {
    const hasContent = () => {
      const frame = document.querySelector('.fancyboxtkt-container iframe, .fancyboxtkt-slide iframe');
      return Boolean(frame);
    };
    if (hasContent()) {
      resolve(true);
      return;
    }

    const deadline = Date.now() + timeoutMs;
    const observer = new MutationObserver(() => {
      if (hasContent()) {
        observer.disconnect();
        resolve(true);
      } else if (Date.now() >= deadline) {
        observer.disconnect();
        resolve(false);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => {
      observer.disconnect();
      resolve(hasContent());
    }, timeoutMs);
  });
}

function waitForTeplohodApi(timeoutMs = 8000) {
  return new Promise<void>((resolve, reject) => {
    const ready = () => Boolean((window as TeplohodWidgetWindow).TI_Tickets?.init);
    if (ready()) {
      resolve();
      return;
    }
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      if (ready()) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error('teplohod widget not ready'));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

export function ensureTeplohodWidgetScript() {
  if (typeof document === 'undefined') return Promise.resolve();

  const existing = document.querySelector(
    'script[data-daibilet-teplohod-widget="true"]',
  ) as HTMLScriptElement | null;
  if (existing) {
    widgetScriptPromise = widgetScriptPromise || waitForTeplohodApi();
    return widgetScriptPromise;
  }

  widgetScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TEP_WIDGET_SCRIPT_URL;
    script.async = true;
    script.dataset.daibiletTeplohodWidget = 'true';
    script.onload = () => {
      waitForTeplohodApi().then(resolve, reject);
    };
    script.onerror = () => reject(new Error('teplohod widget script failed'));
    document.body.appendChild(script);
  });

  return widgetScriptPromise;
}

type TeplohodWidgetPayload = {
  provider?: string | null;
  tepEventId?: string | number | null;
  tepWidgetId?: string | number | null;
} | null;

export function getTeplohodWidgetIds(event: {
  externalId?: string | number | null;
  widgetProvider?: string | null;
  purchaseProvider?: string | null;
  offerSourceCode?: string | null;
  purchaseUrl?: string | null;
  widgetUrl?: string | null;
  widgetPayload?: TeplohodWidgetPayload | Record<string, unknown> | null;
}) {
  const payload = event.widgetPayload as TeplohodWidgetPayload;
  const provider = String(
    event.widgetProvider || event.purchaseProvider || event.offerSourceCode || payload?.provider || '',
  ).toUpperCase();
  const purchaseUrl = String(event.purchaseUrl || event.widgetUrl || '').toLowerCase();
  const isTeplohod = provider.includes('TEPLOHOD') || provider.includes('TEP') || purchaseUrl.includes('teplohod.info');
  if (!isTeplohod) return null;

  const tepEventId =
    normalizeTeplohodEventId(payload?.tepEventId ?? event.externalId) ||
    normalizeTeplohodEventId(purchaseUrl.match(/[?&]event_id=(\d+)/i)?.[1]) ||
    normalizeTeplohodEventId(purchaseUrl.match(/teplohod\.info\/event\/(\d+)/i)?.[1]);
  if (!tepEventId) return null;

  return {
    tepEventId,
    tepWidgetId: payload?.tepWidgetId || DEFAULT_TEP_WIDGET_ID,
  };
}

function resolveTeplohodCheckoutUrl(options: {
  purchaseUrl?: string | null;
  tepEventId?: string | number | null;
  tepWidgetId?: string | number | null;
}) {
  const eventId =
    normalizeTeplohodEventId(options.tepEventId) ||
    normalizeTeplohodEventId(String(options.purchaseUrl || '').match(/[?&]event_id=(\d+)/i)?.[1]) ||
    normalizeTeplohodEventId(String(options.purchaseUrl || '').match(/teplohod\.info\/event\/(\d+)/i)?.[1]);
  if (!eventId) return options.purchaseUrl || null;

  const widgetId = String(options.tepWidgetId || DEFAULT_TEP_WIDGET_ID).trim() || DEFAULT_TEP_WIDGET_ID;
  const url = new URL('https://account.teplohod.info/order/event-order');
  url.searchParams.set('widget_id', widgetId);
  url.searchParams.set('event_id', eventId);
  return url.toString();
}

function isTeplohodFancyboxOpen() {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.querySelector(
      '.fancyboxtkt-container, .fancyboxtkt-slide, .fancyboxtkt-bg, iframe.ti-tickets-event-tickets-buy-iframe, body.fancyboxtkt-active',
    ),
  );
}

/**
 * Do NOT auto-open account.teplohod in a new tab from the buy click —
 * that kills the Fancybox modal UX. Fallback is a visible link only when
 * the widget button never mounts.
 */
export function TeplohodWidgetEmbed({
  tepEventId,
  tepWidgetId,
  wrapperId = 'teplohod-widget',
  purchaseUrl,
  showFallbackButton = true,
}: {
  tepEventId: string | number;
  tepWidgetId?: string | number | null;
  wrapperId?: string;
  purchaseUrl?: string | null;
  showFallbackButton?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [needsFallback, setNeedsFallback] = React.useState(false);
  const eventId = normalizeTeplohodEventId(tepEventId);
  const checkoutUrl = resolveTeplohodCheckoutUrl({ purchaseUrl, tepEventId: eventId, tepWidgetId });

  React.useEffect(() => {
    if (!eventId || !containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;
    let timeoutId = 0;

    const observer = new MutationObserver(() => {
      if (containerHasWidgetMarkup(container)) {
        setNeedsFallback(false);
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    void ensureTeplohodWidgetScript()
      .then(() => bootstrapTeplohodWidgets())
      .then(() => {
        if (cancelled) return;
        // Second init after paint — Teplohod sometimes skips empty containers on first pass.
        window.requestAnimationFrame(() => {
          if (!cancelled) void bootstrapTeplohodWidgets();
        });
        // Only show external checkout link if Teplohod never paints its buy button.
        timeoutId = window.setTimeout(() => {
          if (!cancelled && !containerHasWidgetMarkup(container)) {
            setNeedsFallback(true);
          }
        }, 8000);
      })
      .catch(() => {
        if (!cancelled) setNeedsFallback(true);
      });

    return () => {
      cancelled = true;
      observer.disconnect();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [eventId, tepWidgetId, checkoutUrl]);

  if (!eventId) return null;

  return (
    <div className="mt-4" id={wrapperId}>
      <style dangerouslySetInnerHTML={{ __html: TEP_WIDGET_CSS }} />
      <div
        ref={containerRef}
        className="teplohod-info-wrapper"
        data-lang="ru-RU"
        data-id={String(tepWidgetId || DEFAULT_TEP_WIDGET_ID)}
        data-event-id={eventId}
      />
      {needsFallback && showFallbackButton && checkoutUrl ? (
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center rounded-xl bg-primary-600 px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-700"
        >
          Купить билет на teplohod.info
        </a>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-slate-500">Выберите дату и категорию билета в виджете Teplohod.info.</p>
    </div>
  );
}

export function openTeplohodWidget(wrapperId = 'teplohod-widget') {
  const tryClick = (attempt = 0) => {
    const button = document.querySelector<HTMLElement>(`#${wrapperId} .ti-tickets-event-tickets-buy`);
    if (button) {
      button.click();
      return true;
    }
    if (attempt < 24) window.setTimeout(() => tryClick(attempt + 1), 150);
    return false;
  };

  void ensureTeplohodWidgetScript()
    .then(() => bootstrapTeplohodWidgets())
    .finally(() => window.setTimeout(() => tryClick(), 150));
}

export function openTeplohodPurchase(options: {
  wrapperId?: string;
  purchaseUrl?: string | null;
  tepEventId?: string | number | null;
  tepWidgetId?: string | number | null;
}) {
  const wrapperId = options.wrapperId || 'teplohod-widget';
  const checkoutUrl = resolveTeplohodCheckoutUrl({
    purchaseUrl: options.purchaseUrl,
    tepEventId: options.tepEventId,
    tepWidgetId: options.tepWidgetId,
  });

  void ensureTeplohodWidgetScript()
    .then(() => bootstrapTeplohodWidgets())
    .finally(async () => {
      openTeplohodWidget(wrapperId);
      const hasContent = await waitForTeplohodFancyboxContent(6000);
      if (hasContent || isTeplohodFancyboxOpen()) return;

      // Fancybox never appeared — last resort external checkout (not while modal is mounting).
      const button = document.querySelector<HTMLElement>(`#${wrapperId} .ti-tickets-event-tickets-buy`);
      if (!button && checkoutUrl) {
        window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      }
    });
}

export function TeplohodWidgetButton({
  tepEventId,
  tepWidgetId,
  label = 'Купить билет',
  className = 'inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-primary/90',
  purchaseUrl,
}: {
  tepEventId: string | number;
  tepWidgetId?: string | number | null;
  label?: string;
  className?: string;
  purchaseUrl?: string | null;
}) {
  const containerId = React.useId().replace(/:/g, '');
  const eventId = normalizeTeplohodEventId(tepEventId);
  if (!eventId) return null;

  const handleClick = () => {
    openTeplohodPurchase({
      wrapperId: containerId,
      purchaseUrl,
      tepEventId: eventId,
      tepWidgetId,
    });
  };

  return (
    <>
      <div
        id={containerId}
        className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
        aria-hidden="true"
      >
        <TeplohodWidgetEmbed
          tepEventId={eventId}
          tepWidgetId={tepWidgetId}
          wrapperId={containerId}
          purchaseUrl={purchaseUrl}
          showFallbackButton={false}
        />
      </div>
      <button type="button" onClick={handleClick} className={className}>
        {label}
      </button>
    </>
  );
}
