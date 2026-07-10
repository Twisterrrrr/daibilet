'use client';

import * as React from 'react';

const DEFAULT_TEP_WIDGET_ID = process.env.NEXT_PUBLIC_TEP_WIDGET_ID?.trim() || '14208';
const TEP_WIDGET_SCRIPT_URL = 'https://api.teplohod.info/v1/widget/widget.js';

let widgetScriptPromise: Promise<void> | null = null;

function normalizeTeplohodEventId(value?: string | number | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const match = raw.match(/(?:^tep-)?(\d+)$/i);
  return match ? match[1] : raw;
}

function ensureTeplohodWidgetScript() {
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

export function getTeplohodWidgetIds(event: {
  externalId?: string | number | null;
  widgetProvider?: string | null;
  purchaseUrl?: string | null;
  widgetPayload?: {
    provider?: string | null;
    tepEventId?: string | number | null;
    tepWidgetId?: string | number | null;
  } | null;
}) {
  const provider = String(event.widgetProvider || event.widgetPayload?.provider || '').toUpperCase();
  const purchaseUrl = String(event.purchaseUrl || '').toLowerCase();
  const isTeplohod = provider.includes('TEPLOHOD') || provider.includes('TEP') || purchaseUrl.includes('teplohod.info');
  if (!isTeplohod) return null;

  const tepEventId =
    normalizeTeplohodEventId(event.widgetPayload?.tepEventId ?? event.externalId) ||
    normalizeTeplohodEventId(purchaseUrl.match(/teplohod\.info\/event\/(\d+)/i)?.[1]);
  if (!tepEventId) return null;

  return {
    tepEventId,
    tepWidgetId: event.widgetPayload?.tepWidgetId || DEFAULT_TEP_WIDGET_ID,
  };
}

function TeplohodWidgetEmbed({
  tepEventId,
  tepWidgetId,
}: {
  tepEventId: string;
  tepWidgetId?: string | number | null;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!tepEventId || !containerRef.current) return;
    void ensureTeplohodWidgetScript().catch(() => undefined);
  }, [tepEventId]);

  return (
    <div
      ref={containerRef}
      className="teplohod-info-wrapper hidden"
      data-lang="ru-RU"
      data-id={String(tepWidgetId || DEFAULT_TEP_WIDGET_ID)}
      data-event-id={tepEventId}
    />
  );
}

export function TeplohodWidgetButton({
  tepEventId,
  tepWidgetId,
  label = 'Купить билет',
  className = 'inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-primary/90',
}: {
  tepEventId: string | number;
  tepWidgetId?: string | number | null;
  label?: string;
  className?: string;
}) {
  const containerId = React.useId().replace(/:/g, '');
  const eventId = normalizeTeplohodEventId(tepEventId);
  if (!eventId) return null;

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

  return (
    <div id={containerId}>
      <button type="button" onClick={openWidget} className={className}>
        {label}
      </button>
      <TeplohodWidgetEmbed tepEventId={eventId} tepWidgetId={tepWidgetId} />
    </div>
  );
}
