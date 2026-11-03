'use client';

import * as React from 'react';

import { trackSelectTickets } from '@/lib/catalog-analytics';
import {
  buildTeplohodPurchaseUrl,
  extractTeplohodEventId,
  isTrustedTeplohodPurchaseUrl,
  normalizeTeplohodEventId as normalizeProviderEventId,
} from '@/lib/external-provider-purchase';
import {
  beginPurchaseOpening,
  completePurchaseOpening,
  failPurchaseOpening,
  isPurchaseOpeningActive,
} from '@/components/PurchaseOpeningFeedback.client';

const DEFAULT_TEP_WIDGET_ID = process.env.NEXT_PUBLIC_TEP_WIDGET_ID?.trim() || '14460';
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
/* Keep Teplohod Fancybox above Next chrome + purchase opening shell (z-99990) */
.fancyboxtkt-container,
.fancyboxtkt-bg,
.fancyboxtkt-inner,
.fancyboxtkt-slide,
.fancyboxtkt-content,
.fancybox-container,
.fancybox-bg,
.fancybox-inner,
.fancybox-slide,
.fancybox-content,
.fancybox__container,
.fancybox__backdrop {
  z-index: 2147483000 !important;
}
`;

/** Vendor may use custom fancyboxtkt-* or stock fancybox-* class names. */
const TEP_FANCYBOX_ROOT =
  '.fancyboxtkt-container, .fancyboxtkt-slide, .fancyboxtkt-bg, .fancybox-container, .fancybox-slide, .fancybox-bg';
const TEP_FANCYBOX_IFRAME =
  '.fancyboxtkt-container iframe, .fancyboxtkt-slide iframe, .fancybox-container iframe, .fancybox-slide iframe, iframe[src*="account.teplohod.info"], iframe[src*="teplohod.info/order"], iframe[data-src*="account.teplohod.info"]';

/**
 * Teplohod widget.js is an IIFE: `TI_Tickets` is NOT on window.
 * Readiness = script tag loaded + (optional) buy-link markup injected by the vendor.
 */
let widgetScriptPromise: Promise<void> | null = null;
let bootstrapPromise: Promise<boolean> | null = null;

function normalizeTeplohodEventId(value?: string | number | null) {
  return normalizeProviderEventId(value);
}

function extractTeplohodEventIdFromUrl(url: string) {
  return extractTeplohodEventId(url);
}

function isTeplohodScriptInjected() {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.querySelector(
      'script[data-daibilet-teplohod-widget="true"], script[src*="teplohod.info/v1/widget/widget.js"]',
    ),
  );
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

function findTeplohodBuyButton(wrapperId?: string | null) {
  if (typeof document === 'undefined') return null;
  if (wrapperId) {
    let safeId = wrapperId;
    try {
      safeId = CSS.escape(wrapperId);
    } catch {
      safeId = wrapperId.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
    }
    const scoped = document.querySelector<HTMLElement>(
      `#${safeId} .ti-tickets-event-tickets-buy, #${safeId}__embed .ti-tickets-event-tickets-buy`,
    );
    if (scoped) return scoped;
  }
  return null;
}

/**
 * Vendor script self-inits inside an IIFE. We only ensure the script tag is present;
 * re-scan stuck wrappers so late-mounted embeds get another pass when possible.
 */
export function bootstrapTeplohodWidgets() {
  if (typeof window === 'undefined') return Promise.resolve(false);

  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    await ensureTeplohodWidgetScript();
    resetStuckTeplohodContainers();
    // Script auto-binds .teplohod-info-wrapper; nothing public to call.
    return isTeplohodScriptInjected();
  })().finally(() => {
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

/** True when Teplohod Fancybox / account checkout iframe is already on screen. */
export function isTeplohodCheckoutOpen() {
  if (typeof document === 'undefined') return false;
  if (document.body.classList.contains('fancyboxtkt-active')) return true;
  if (document.body.classList.contains('fancybox-active')) return true;
  return Boolean(document.querySelector(`${TEP_FANCYBOX_ROOT}, ${TEP_FANCYBOX_IFRAME}`));
}

function waitForTeplohodCheckout(timeoutMs = 5000) {
  return new Promise<boolean>((resolve) => {
    if (isTeplohodCheckoutOpen()) {
      resolve(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (isTeplohodCheckoutOpen()) {
        observer.disconnect();
        resolve(true);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.setTimeout(() => {
      observer.disconnect();
      resolve(isTeplohodCheckoutOpen());
    }, timeoutMs);
  });
}

/** Prefetch/load vendor widget.js once. Does not wait for private TI_Tickets (IIFE). */
export function ensureTeplohodWidgetScript() {
  if (typeof document === 'undefined') return Promise.resolve();

  if (isTeplohodScriptInjected()) {
    return widgetScriptPromise || Promise.resolve();
  }

  widgetScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TEP_WIDGET_SCRIPT_URL;
    script.async = true;
    script.dataset.daibiletTeplohodWidget = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('teplohod widget script failed'));
    document.body.appendChild(script);
  });

  return widgetScriptPromise;
}

/** Idle/hover prefetch for landings - same as TC mount preload. */
export function prefetchTeplohodWidgetScript() {
  if (typeof document !== 'undefined' && !document.querySelector('link[data-daibilet-tep-preload="true"]')) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = TEP_WIDGET_SCRIPT_URL;
    link.dataset.daibiletTepPreload = 'true';
    document.head.appendChild(link);
  }
  return ensureTeplohodWidgetScript().catch(() => undefined);
}

function waitForTeplohodBuyButton(wrapperId: string, timeoutMs = 4000) {
  return new Promise<HTMLElement | null>((resolve) => {
    const existing = findTeplohodBuyButton(wrapperId);
    if (existing) {
      resolve(existing);
      return;
    }

    const deadline = Date.now() + timeoutMs;
    const root = document.getElementById(wrapperId) || document.body;
    const observer = new MutationObserver(() => {
      const button = findTeplohodBuyButton(wrapperId);
      if (button) {
        observer.disconnect();
        resolve(button);
      } else if (Date.now() >= deadline) {
        observer.disconnect();
        resolve(null);
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    window.setTimeout(() => {
      observer.disconnect();
      resolve(findTeplohodBuyButton(wrapperId));
    }, timeoutMs);
  });
}

type TeplohodWidgetPayload = {
  provider?: string | null;
  tepEventId?: string | number | null;
  tepWidgetId?: string | number | null;
} | null;

export function getTeplohodWidgetIds(event: {
  id?: string | null;
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
  const purchaseUrl = String(event.purchaseUrl || event.widgetUrl || '');
  const fromEntityId = String(event.id || '').match(/^evt_tep_(\d+)$/i)?.[1];
  const isTeplohod =
    provider.includes('TEPLOHOD') ||
    provider.includes('TEP') ||
    isTrustedTeplohodPurchaseUrl(purchaseUrl) ||
    Boolean(fromEntityId);
  if (!isTeplohod) return null;

  const tepEventId =
    normalizeTeplohodEventId(payload?.tepEventId ?? event.externalId) ||
    normalizeTeplohodEventId(fromEntityId) ||
    extractTeplohodEventIdFromUrl(purchaseUrl);
  if (!tepEventId) return null;

  return {
    tepEventId,
    tepWidgetId: payload?.tepWidgetId || DEFAULT_TEP_WIDGET_ID,
  };
}

export function getTeplohodWidgetIdsFromSession(session: {
  id?: string | null;
  purchaseProvider?: string | null;
  offerSourceCode?: string | null;
  purchaseUrl?: string | null;
  widgetUrl?: string | null;
  externalId?: string | number | null;
}) {
  const purchaseUrl = session.widgetUrl || session.purchaseUrl || null;
  const fromId = String(session.id || '').match(/^evt_tep_(\d+)$/i)?.[1];
  return getTeplohodWidgetIds({
    id: session.id,
    externalId: session.externalId ?? fromId,
    widgetProvider: session.purchaseProvider || session.offerSourceCode,
    purchaseProvider: session.purchaseProvider,
    offerSourceCode: session.offerSourceCode,
    purchaseUrl,
    widgetUrl: session.widgetUrl,
  });
}

export function resolveTeplohodCheckoutUrl(options: {
  purchaseUrl?: string | null;
  tepEventId?: string | number | null;
  tepWidgetId?: string | number | null;
}) {
  const eventId =
    normalizeTeplohodEventId(options.tepEventId) || extractTeplohodEventIdFromUrl(String(options.purchaseUrl || ''));
  if (!eventId) return null;

  return buildTeplohodPurchaseUrl({ eventId, widgetId: options.tepWidgetId || DEFAULT_TEP_WIDGET_ID });
}

/** Open the provider checkout during the original tap, with a same-tab fallback if popups are blocked. */
export function openTeplohodCheckoutFallback(checkoutUrl?: string | null) {
  const href = String(checkoutUrl || '').trim();
  if (!isTrustedTeplohodPurchaseUrl(href)) return false;
  const popup = window.open(href, '_blank');
  if (popup) popup.opener = null;
  else window.location.assign(href);
  return true;
}

export function TeplohodWidgetEmbed({
  tepEventId,
  externalEventId,
  tepWidgetId,
  wrapperId = 'teplohod-widget',
  purchaseUrl,
  showFallbackButton = true,
}: {
  tepEventId?: string | number | null;
  externalEventId?: string | number | null;
  tepWidgetId?: string | number | null;
  wrapperId?: string;
  purchaseUrl?: string | null;
  showFallbackButton?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [needsFallback, setNeedsFallback] = React.useState(false);
  const eventId = normalizeTeplohodEventId(tepEventId ?? externalEventId);
  const checkoutUrl = resolveTeplohodCheckoutUrl({
    purchaseUrl,
    tepEventId: eventId,
    tepWidgetId,
  });

  React.useEffect(() => {
    if (!eventId || !containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;
    const waitForMarkup = (attempt = 0) => {
      if (cancelled) return;
      if (containerHasWidgetMarkup(container)) {
        setNeedsFallback(false);
        return;
      }
      if (attempt > 0 && attempt % 8 === 0) {
        void bootstrapTeplohodWidgets();
      }
      if (attempt >= 40) {
        setNeedsFallback(true);
        return;
      }
      window.setTimeout(() => waitForMarkup(attempt + 1), 200);
    };

    void ensureTeplohodWidgetScript()
      .then(() => bootstrapTeplohodWidgets())
      .then(() => waitForMarkup())
      .catch(() => {
        if (!cancelled) setNeedsFallback(true);
      });

    return () => {
      cancelled = true;
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
          Купить билет
        </a>
      ) : null}
      {!needsFallback && showFallbackButton && checkoutUrl ? (
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-primary-700"
        >
          Если форма не открылась — перейти к покупке напрямую
        </a>
      ) : null}
    </div>
  );
}

export function openTeplohodWidget(wrapperId = 'teplohod-widget', expectedEventId?: string | null) {
  const button = findTeplohodBuyButton(wrapperId);
  const expectedId = normalizeTeplohodEventId(expectedEventId);
  const actualId = document.getElementById(wrapperId)?.querySelector<HTMLElement>('.teplohod-info-wrapper')?.dataset.eventId;
  if (!button || (expectedId && actualId !== expectedId)) return false;
  button.click();
  return true;
}

export type OpenTeplohodPurchaseResult = 'widget' | 'popup' | 'none';

export async function openTeplohodPurchase(options: {
  wrapperId?: string;
  purchaseUrl?: string | null;
}): Promise<OpenTeplohodPurchaseResult> {
  const wrapperId = options.wrapperId || 'teplohod-widget';

  // Already visible (retry / race) → success, do not click again or dismiss.
  if (isTeplohodCheckoutOpen()) return 'widget';

  let button = findTeplohodBuyButton(wrapperId);
  if (!button) {
    if (options.purchaseUrl) {
      return openTeplohodCheckoutFallback(options.purchaseUrl) ? 'popup' : 'none';
    }
    try {
      await ensureTeplohodWidgetScript();
      await bootstrapTeplohodWidgets();
    } catch {
      // Script failed — last resort popup below.
    }
    // Embed XHR waterfall on large landings: wait briefly for this card's buy-link.
    button = findTeplohodBuyButton(wrapperId) || (await waitForTeplohodBuyButton(wrapperId, 4500));
  }

  if (button) {
    // Single click only — a second click can toggle/close Fancybox.
    button.click();
    if (await waitForTeplohodCheckout(5000)) return 'widget';
  } else {
    openTeplohodWidget(wrapperId);
    if (await waitForTeplohodCheckout(5000)) return 'widget';
  }

  // Late paint after timeout observer disconnect.
  if (isTeplohodCheckoutOpen()) return 'widget';

  // Popup only when nothing is visible. Never dismiss an open Fancybox.
  return 'none';
}

/** One animation frame after React commit - enough for lazy-mounted embed DOM. */
function waitForEmbedPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function TeplohodWidgetButton({
  tepEventId,
  tepWidgetId,
  label = 'Купить билет',
  disabled = false,
  className = 'inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-primary/90',
  purchaseUrl,
  lazyEmbed = true,
}: {
  tepEventId: string | number;
  tepWidgetId?: string | number | null;
  label?: string;
  disabled?: boolean;
  className?: string;
  purchaseUrl?: string | null;
  /** When true (default), hidden embed mounts on first click only - avoids N× widget/embed XHR on landings. */
  lazyEmbed?: boolean;
}) {
  const containerId = React.useId().replace(/:/g, '');
  const embedWrapperId = `${containerId}__embed`;
  const [busy, setBusy] = React.useState(false);
  const [embedMounted, setEmbedMounted] = React.useState(!lazyEmbed);
  const embedMountedRef = React.useRef(!lazyEmbed);
  const eventId = normalizeTeplohodEventId(tepEventId);
  const checkoutUrl = resolveTeplohodCheckoutUrl({
    purchaseUrl,
    tepEventId: eventId,
    tepWidgetId,
  });

  React.useEffect(() => {
    if (!eventId || lazyEmbed) return;
    void prefetchTeplohodWidgetScript();
  }, [eventId, lazyEmbed]);

  if (!eventId) return null;

  const ensureEmbedMounted = async () => {
    if (!lazyEmbed || embedMountedRef.current) return;
    embedMountedRef.current = true;
    setEmbedMounted(true);
    await waitForEmbedPaint();
  };

  if (disabled) {
    return (
      <button type="button" disabled className={className}>
        {label}
      </button>
    );
  }

  const handleClick = () => {
    if (busy || isPurchaseOpeningActive()) return;

    if (!findTeplohodBuyButton(containerId) && checkoutUrl) {
      trackSelectTickets({
        eventId,
        provider: 'teplohod',
        source: 'teplohod_widget_button',
      });
      openTeplohodCheckoutFallback(checkoutUrl);
      return;
    }

    const run = async () => {
      await ensureEmbedMounted();
      // Scope to outer host id (contains `#…__embed .teplohod-info-wrapper`).
      const result = await openTeplohodPurchase({
        wrapperId: containerId,
        purchaseUrl: checkoutUrl,
      });
      if (result === 'widget' || result === 'popup' || isTeplohodCheckoutOpen()) {
        completePurchaseOpening();
        return;
      }
      failPurchaseOpening({
        message: 'Открываем страницу покупки поставщика… Не вышло автоматически. Откройте её по ссылке или повторите.',
        fallbackUrl: checkoutUrl || null,
        onRetry: () => {
          void run();
        },
      });
    };

    setBusy(true);
    beginPurchaseOpening({
      message: 'Открываем страницу покупки поставщика…',
      fallbackUrl: checkoutUrl || null,
      onRetry: () => {
        void run();
      },
    });
    trackSelectTickets({
      eventId,
      provider: 'teplohod',
      source: 'teplohod_widget_button',
    });
    void run().finally(() => {
      window.setTimeout(() => setBusy(false), 400);
    });
  };

  return (
    <>
      {embedMounted ? (
        <div
          id={containerId}
          className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
          aria-hidden="true"
        >
          <TeplohodWidgetEmbed
            tepEventId={eventId}
            tepWidgetId={tepWidgetId}
            wrapperId={embedWrapperId}
            purchaseUrl={checkoutUrl}
            showFallbackButton={false}
          />
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleClick}
        onPointerEnter={() => {
          void ensureEmbedMounted();
          void prefetchTeplohodWidgetScript();
        }}
        onFocus={() => {
          void ensureEmbedMounted();
          void prefetchTeplohodWidgetScript();
        }}
        className={`${className}${busy ? ' pointer-events-none opacity-80' : ''}`}
        aria-busy={busy}
        disabled={busy}
      >
        {busy ? 'Открываем…' : label}
      </button>
    </>
  );
}
