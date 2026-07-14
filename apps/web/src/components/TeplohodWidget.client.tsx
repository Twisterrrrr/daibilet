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
`;

let widgetScriptPromise: Promise<void> | null = null;

function normalizeTeplohodEventId(value?: string | number | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const match = raw.match(/(?:^tep-)?(\d+)$/i);
  return match ? match[1] : raw;
}

export function ensureTeplohodWidgetScript() {
  if (typeof document === 'undefined') return Promise.resolve();
  if (document.querySelector('script[data-daibilet-teplohod-widget="true"]')) {
    return widgetScriptPromise || Promise.resolve();
  }

  widgetScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TEP_WIDGET_SCRIPT_URL;
    script.defer = true;
    script.dataset.daibiletTeplohodWidget = 'true';
    script.onload = () => resolve();
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

export function getTeplohodWidgetIdsFromSession(session: {
  id?: string | null;
  purchaseProvider?: string | null;
  offerSourceCode?: string | null;
  purchaseUrl?: string | null;
  widgetUrl?: string | null;
}) {
  const purchaseUrl = session.widgetUrl || session.purchaseUrl || null;
  const fromId = String(session.id || '').match(/^evt_tep_(\d+)$/i)?.[1];
  return getTeplohodWidgetIds({
    externalId: fromId,
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

export function TeplohodWidgetEmbed({
  tepEventId,
  externalEventId,
  tepWidgetId,
  wrapperId = 'teplohod-widget',
}: {
  tepEventId?: string | number | null;
  externalEventId?: string | number | null;
  tepWidgetId?: string | number | null;
  wrapperId?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const eventId = normalizeTeplohodEventId(tepEventId ?? externalEventId);

  React.useEffect(() => {
    if (!eventId || !containerRef.current) return;
    void ensureTeplohodWidgetScript().catch(() => {
      // Ошибки загрузки не валят страницу; кнопка fallback рендерится выше по дереву.
    });
  }, [eventId]);

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

  void ensureTeplohodWidgetScript().finally(() => window.setTimeout(() => tryClick(), 150));
}

export function TeplohodWidgetButton({
  tepEventId,
  tepWidgetId,
  label = 'Купить билет',
  disabled = false,
  className = 'inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-primary/90',
}: {
  tepEventId: string | number;
  tepWidgetId?: string | number | null;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const containerId = React.useId().replace(/:/g, '');

  const openWidget = () => {
    const tryClick = (attempt = 0) => {
      const button = document.querySelector<HTMLElement>(`#${containerId} .ti-tickets-event-tickets-buy`);
      if (button) {
        button.click();
        return;
      }
      if (attempt < 24) window.setTimeout(() => tryClick(attempt + 1), 150);
    };

    void ensureTeplohodWidgetScript().finally(() => window.setTimeout(() => tryClick(), 100));
  };

  if (disabled) {
    return (
      <button type="button" disabled className={className}>
        {label}
      </button>
    );
  }

  return (
    <>
      <div id={containerId} className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0" aria-hidden="true">
        <TeplohodWidgetEmbed tepEventId={tepEventId} tepWidgetId={tepWidgetId} />
      </div>
      <button type="button" className={className} onClick={openWidget}>
        {label}
      </button>
    </>
  );
}
