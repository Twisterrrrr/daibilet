'use client';

import * as React from 'react';

import {
  extractTcEventIdFromSession,
  type TcPurchaseTarget,
} from '@/lib/event-purchase';
import {
  FLEXIBLE_SCHEDULE_LABEL,
  formatVacantSeats,
  isFlexibleScheduleSession,
} from '@/lib/event-page-utils';

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

function openTcPurchaseUrl(purchaseUrl?: string | null) {
  const normalized = normalizeTcPurchaseUrl(purchaseUrl);
  if (!normalized) return;
  window.open(normalized, 'tc_widget', 'width=960,height=760,scrollbars=yes,resizable=yes');
}

async function openTcWidget(options: {
  trigger: HTMLButtonElement | null;
  purchaseUrl?: string | null;
}) {
  try {
    await ensureTcWidgetScript();
  } catch {
    openTcPurchaseUrl(options.purchaseUrl);
    return;
  }

  if (options.trigger) {
    options.trigger.click();
    return;
  }

  openTcPurchaseUrl(options.purchaseUrl);
}

function formatSessionLabels(session: {
  startsAt?: string | null;
  dateLabel?: string | null;
  timeLabel?: string | null;
}) {
  if (session.dateLabel && session.timeLabel) {
    const commaIndex = session.dateLabel.indexOf(',');
    return {
      weekday: commaIndex >= 0 ? session.dateLabel.slice(0, commaIndex).trim() : session.dateLabel.trim(),
      date: commaIndex >= 0 ? session.dateLabel.slice(commaIndex + 1).trim() : session.dateLabel.trim(),
      time: session.timeLabel,
    };
  }

  if (session.startsAt) {
    const d = new Date(session.startsAt);
    if (!Number.isNaN(d.getTime())) {
      return {
        weekday: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
        date: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
        time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };
    }
  }

  return {
    weekday: session.dateLabel?.split(',')[0]?.trim() || '—',
    date: session.dateLabel || 'Открытая дата',
    time: session.timeLabel || '',
  };
}

export function TcSessionSlot({
  tcEventId,
  session,
}: {
  tcEventId: string;
  session: {
    startsAt?: string | null;
    dateLabel?: string | null;
    timeLabel?: string | null;
    vacant?: number | null;
    purchaseUrl?: string | null;
  };
}) {
  const hiddenTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const eventId = String(extractTcEventIdFromSession(session) || tcEventId || '').trim();
  const widgetToken = resolveTcWidgetToken(session.purchaseUrl);
  const fmt = formatSessionLabels(session);
  const vacant = session.vacant ?? 0;
  const flexibleSchedule = isFlexibleScheduleSession(session);

  React.useEffect(() => {
    if (!eventId || !widgetToken) return;
    void ensureTcWidgetScript().catch(() => undefined);
  }, [eventId, widgetToken]);

  if (!eventId || !widgetToken) {
    return <StaticSessionRow session={session} purchaseUrl={session.purchaseUrl} />;
  }

  return (
    <>
      <button
        type="button"
        className="tc-session-slot"
        onClick={() => {
          void openTcWidget({ trigger: hiddenTriggerRef.current, purchaseUrl: session.purchaseUrl });
        }}
      >
        <div className="flex items-center gap-3">
          {!flexibleSchedule ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs text-slate-600">
              {fmt.weekday}
            </div>
          ) : null}
          <div className="text-left">
            <p className="text-sm font-medium text-slate-800">
              {flexibleSchedule ? FLEXIBLE_SCHEDULE_LABEL : fmt.date}
            </p>
            {fmt.time && !flexibleSchedule ? <p className="text-xs text-slate-400">{fmt.time}</p> : null}
          </div>
        </div>
        {vacant > 0 ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-600">
            {formatVacantSeats(vacant)}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-500">Распродано</span>
        )}
      </button>
      <button
        ref={hiddenTriggerRef}
        type="button"
        data-tc-event={eventId}
        data-tc-token={widgetToken}
        className="tc-widget-trigger"
        aria-hidden="true"
        tabIndex={-1}
      >
        {fmt.date} {fmt.time}
      </button>
    </>
  );
}

function StaticSessionRow({
  session,
  purchaseUrl,
}: {
  session: {
    startsAt?: string | null;
    dateLabel?: string | null;
    timeLabel?: string | null;
    vacant?: number | null;
  };
  purchaseUrl?: string | null;
}) {
  const fmt = formatSessionLabels(session);
  const vacant = session.vacant ?? 0;
  const flexibleSchedule = isFlexibleScheduleSession(session);
  const content = (
    <>
      <div className="flex items-center gap-3">
        {!flexibleSchedule ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-700">
            {fmt.weekday}
          </div>
        ) : null}
        <div>
          <p className="text-sm font-medium text-slate-900">
            {flexibleSchedule ? FLEXIBLE_SCHEDULE_LABEL : fmt.date}
          </p>
          {fmt.time && !flexibleSchedule ? <p className="text-xs text-slate-500">{fmt.time}</p> : null}
        </div>
      </div>
      {vacant > 0 ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
          {formatVacantSeats(vacant)}
        </span>
      ) : vacant === 0 ? (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">Распродано</span>
      ) : null}
    </>
  );

  if (purchaseUrl) {
    const href = normalizeTcPurchaseUrl(purchaseUrl) || purchaseUrl;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 transition hover:bg-slate-100"
      >
        {content}
      </a>
    );
  }

  return <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">{content}</div>;
}

export function TcWidgetButton({
  tcEventId,
  purchaseUrl,
  purchaseTargets,
  label = 'Купить билет',
  wide = false,
  variant = 'default',
  className,
}: {
  tcEventId: string;
  purchaseUrl?: string | null;
  purchaseTargets?: TcPurchaseTarget[];
  label?: string;
  wide?: boolean;
  variant?: 'default' | 'hero';
  className?: string;
}) {
  const hiddenButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const eventId = String(tcEventId || '').trim();
  const widgetToken = resolveTcWidgetToken(purchaseUrl);

  React.useEffect(() => {
    if (!eventId || !widgetToken) return;
    void ensureTcWidgetScript().catch(() => undefined);
  }, [eventId, widgetToken]);

  const handleClick = () => {
    void openTcWidget({ trigger: hiddenButtonRef.current, purchaseUrl });
  };

  const fallbackLinkClass =
    variant === 'hero'
      ? `inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md shadow-amber-700/30 transition hover:bg-amber-600 active:bg-amber-700 sm:px-6 sm:py-2.5 ${wide ? 'w-full' : ''}`
      : wide
        ? 'flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-700'
        : 'inline-flex min-h-10 items-center justify-center rounded-xl bg-primary-600 px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-700';

  if (!eventId || !widgetToken) {
    if (purchaseUrl) {
      const href = normalizeTcPurchaseUrl(purchaseUrl) || purchaseUrl;
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className || fallbackLinkClass}>
          {label}
        </a>
      );
    }
    return null;
  }

  const sizeClasses =
    variant === 'hero'
      ? `rounded-xl px-5 py-3 text-base font-semibold shadow-md shadow-amber-700/30 sm:px-6 sm:py-2.5 ${wide ? 'w-full' : ''}`
      : wide
        ? 'w-full rounded-xl px-6 py-3.5 text-base font-medium'
        : 'rounded-xl px-6 py-3.5 text-base font-medium';

  const colorClasses =
    variant === 'hero'
      ? 'bg-amber-500 text-white transition hover:bg-amber-600 active:bg-amber-700'
      : 'bg-primary-600 text-white transition hover:bg-primary-700';

  const buttonClassName =
    className ||
    `tc-buy-btn inline-flex min-h-10 items-center justify-center gap-2 ${colorClasses} ${sizeClasses} ${wide ? 'w-full' : ''}`;

  return (
    <>
      <button type="button" className={buttonClassName} onClick={handleClick}>
        {label}
      </button>
      <button
        ref={hiddenButtonRef}
        type="button"
        data-tc-event={eventId}
        data-tc-token={widgetToken}
        className="tc-widget-trigger"
        aria-hidden="true"
        tabIndex={-1}
      >
        {label}
      </button>
    </>
  );
}
