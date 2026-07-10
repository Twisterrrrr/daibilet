'use client';

import * as React from 'react';

const TC_WIDGET_SCRIPT_URL = 'https://ticketscloud.com/static/scripts/widget/tcwidget.js';
const TC_WIDGET_TOKEN = process.env.NEXT_PUBLIC_TC_WIDGET_TOKEN?.trim() || '';

type TcWidgetWindow = Window & {
  tcBuyTicketClickCallbackBinded?: boolean;
  ticketsCloudWidget?: { init?: () => void };
};

export function extractTcWidgetTokenFromPurchaseUrl(purchaseUrl?: string | null): string {
  if (!purchaseUrl) return '';
  try {
    const token = new URL(purchaseUrl).searchParams.get('token');
    return token ? decodeURIComponent(token).trim() : '';
  } catch {
    return '';
  }
}

function normalizeTcWidgetToken(token?: string | null): string {
  const trimmed = String(token || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('r:') ? trimmed.slice(2) : trimmed;
}

export function resolveTcWidgetToken(purchaseUrl?: string | null): string {
  return normalizeTcWidgetToken(TC_WIDGET_TOKEN || extractTcWidgetTokenFromPurchaseUrl(purchaseUrl));
}

export function normalizeTcPurchaseUrl(purchaseUrl?: string | null): string | null {
  if (!purchaseUrl) return null;
  try {
    const url = new URL(purchaseUrl);
    if (!/ticketscloud/i.test(url.hostname)) return purchaseUrl;
    const token = url.searchParams.get('token');
    if (token?.startsWith('r:')) url.searchParams.set('token', token.slice(2));
    if (url.hostname === 'ticketscloud.org') url.hostname = 'ticketscloud.com';
    return url.toString();
  } catch {
    return purchaseUrl;
  }
}

export function getTcWidgetIds(event: {
  externalId?: string | number | null;
  widgetProvider?: string | null;
  widgetPayload?: { provider?: string | null; tcEventId?: string | number | null } | null;
  purchaseUrl?: string | null;
}) {
  const provider = String(event.widgetProvider || event.widgetPayload?.provider || '').toUpperCase();
  const purchaseUrl = String(event.purchaseUrl || '');
  const isTc =
    provider.includes('TC') ||
    provider.includes('TICKETSCLOUD') ||
    /ticketscloud/i.test(purchaseUrl);
  if (!isTc) return null;

  const tcEventId = String(event.widgetPayload?.tcEventId ?? event.externalId ?? '').trim();
  if (!tcEventId) return null;
  return { tcEventId };
}

let widgetScriptPromise: Promise<void> | null = null;

function isTcWidgetReady() {
  if (typeof window === 'undefined') return false;
  const w = window as TcWidgetWindow;
  return Boolean(w.tcBuyTicketClickCallbackBinded || w.ticketsCloudWidget);
}

function ensureTcWidgetScript() {
  if (typeof document === 'undefined') return Promise.resolve();
  if (isTcWidgetReady()) return Promise.resolve();
  if (document.querySelector('script[data-daibilet-tc-widget="true"]')) {
    return widgetScriptPromise || Promise.resolve();
  }

  widgetScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TC_WIDGET_SCRIPT_URL;
    script.defer = true;
    script.dataset.daibiletTcWidget = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('tcwidget.js failed'));
    document.body.appendChild(script);
  });
  return widgetScriptPromise;
}

export function TcWidgetButton({
  tcEventId,
  purchaseUrl,
  label = 'Купить билет',
  className = 'inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-primary/90',
}: {
  tcEventId: string;
  purchaseUrl?: string | null;
  label?: string;
  className?: string;
}) {
  const hiddenButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const widgetToken = resolveTcWidgetToken(purchaseUrl);

  React.useEffect(() => {
    if (!tcEventId || !widgetToken) return;
    void ensureTcWidgetScript().catch(() => undefined);
  }, [tcEventId, widgetToken]);

  const handleClick = () => {
    void (async () => {
      try {
        await ensureTcWidgetScript();
        hiddenButtonRef.current?.click();
      } catch {
        const href = normalizeTcPurchaseUrl(purchaseUrl);
        if (href) window.open(href, 'tc_widget', 'width=960,height=760,scrollbars=yes,resizable=yes');
      }
    })();
  };

  if (!widgetToken) {
    const href = normalizeTcPurchaseUrl(purchaseUrl);
    if (!href) return null;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <>
      <button type="button" data-tc-event={tcEventId} data-tc-token={widgetToken} ref={hiddenButtonRef} className="hidden" aria-hidden />
      <button type="button" onClick={handleClick} className={className}>
        {label}
      </button>
    </>
  );
}
