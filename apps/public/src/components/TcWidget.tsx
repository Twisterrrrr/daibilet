import * as React from 'react';

import { formatSessionTime, parseSessionStartsAt, resolveSessionTimeZoneForSession } from '@/lib/datetime';
import { FLEXIBLE_SCHEDULE_LABEL, isFlexibleScheduleSession } from '@/lib/event-card-meta';
import { formatVacantSeats } from '@/lib/pluralize';

const TC_WIDGET_SCRIPT_URL = 'https://ticketscloud.com/static/scripts/widget/tcwidget.js';
const TC_WIDGET_TOKEN_FROM_ENV =
  ((import.meta as ImportMeta & { env?: { VITE_TC_WIDGET_TOKEN?: string } }).env?.VITE_TC_WIDGET_TOKEN as
    | string
    | undefined) || '';

export function extractTcWidgetTokenFromPurchaseUrl(purchaseUrl?: string | null): string {
  if (!purchaseUrl) return '';
  try {
    const token = new URL(purchaseUrl).searchParams.get('token');
    return token ? decodeURIComponent(token).trim() : '';
  } catch {
    return '';
  }
}

/** tcwidget.js принимает только JWT; префикс r: используется лишь в purchaseUrl. */
function normalizeTcWidgetToken(token?: string | null): string {
  const trimmed = String(token || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('r:') ? trimmed.slice(2) : trimmed;
}

export function resolveTcWidgetToken(purchaseUrl?: string | null): string {
  const raw = TC_WIDGET_TOKEN_FROM_ENV.trim() || extractTcWidgetTokenFromPurchaseUrl(purchaseUrl);
  return normalizeTcWidgetToken(raw);
}

/** Прямое открытие purchaseUrl: убираем r: у token и нормализуем хост виджета. */
export function normalizeTcPurchaseUrl(purchaseUrl?: string | null): string | null {
  if (!purchaseUrl) return null;
  try {
    const url = new URL(purchaseUrl);
    if (!/ticketscloud/i.test(url.hostname)) return purchaseUrl;

    const token = url.searchParams.get('token');
    if (token) {
      const decoded = decodeURIComponent(token);
      if (decoded.startsWith('r:')) {
        url.searchParams.set('token', decoded.slice(2));
      }
    }

    if (url.hostname === 'ticketscloud.org') {
      url.hostname = 'ticketscloud.com';
    }

    return url.toString();
  } catch {
    return purchaseUrl;
  }
}

export function isTcPurchaseUrl(purchaseUrl?: string | null): boolean {
  if (!purchaseUrl) return false;
  try {
    return /ticketscloud/i.test(new URL(purchaseUrl).hostname);
  } catch {
    return /ticketscloud/i.test(purchaseUrl);
  }
}

type TcWidgetWindow = Window & {
  tcBuyTicketClickCallbackBinded?: boolean;
  ticketsCloudWidget?: { init?: () => void };
};

function isTcWidgetReady() {
  if (typeof window === 'undefined') return false;
  const w = window as TcWidgetWindow;
  return Boolean(w.tcBuyTicketClickCallbackBinded || w.ticketsCloudWidget);
}

function waitForTcWidgetReady(timeoutMs = 8000) {
  return new Promise<void>((resolve, reject) => {
    if (isTcWidgetReady()) {
      resolve();
      return;
    }

    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      if (isTcWidgetReady()) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error('tc widget not ready'));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

let widgetScriptPromise: Promise<void> | null = null;

function ensureTcWidgetScript() {
  if (typeof document === 'undefined') return Promise.resolve();

  const waitLoaded = (script: HTMLScriptElement) =>
    new Promise<void>((resolve, reject) => {
      if (isTcWidgetReady()) {
        resolve();
        return;
      }

      const finish = () => waitForTcWidgetReady().then(resolve, reject);

      if (document.readyState !== 'loading') {
        void finish();
        return;
      }

      script.addEventListener('load', () => void finish(), { once: true });
      script.addEventListener('error', () => reject(new Error('tcwidget.js failed to load')), { once: true });
    });

  const existingScript = document.querySelector('script[src*="tcwidget.js"]') as HTMLScriptElement | null;
  if (existingScript) {
    widgetScriptPromise = widgetScriptPromise || waitLoaded(existingScript);
    return widgetScriptPromise;
  }

  if (document.querySelector('script[data-daibilet-tc-widget="true"]')) {
    return widgetScriptPromise || waitForTcWidgetReady();
  }

  widgetScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TC_WIDGET_SCRIPT_URL;
    script.defer = true;
    script.dataset.daibiletTcWidget = 'true';
    script.onload = () => {
      waitForTcWidgetReady().then(resolve, reject);
    };
    script.onerror = () => reject(new Error('tcwidget.js failed to load'));
    document.body.appendChild(script);
  });

  return widgetScriptPromise;
}

function openTcPurchaseUrl(purchaseUrl?: string | null) {
  const normalized = normalizeTcPurchaseUrl(purchaseUrl);
  if (!normalized) return false;
  const popup = window.open(normalized, 'tc_widget', 'width=960,height=760,scrollbars=yes,resizable=yes');
  return Boolean(popup);
}

function isTcWidgetVisible() {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.querySelector('.tc-widget-frame_popup') ||
      document.getElementById('tc-widget-overlay') ||
      document.querySelector('.tc-widget-container iframe') ||
      document.querySelector('iframe[src*="ticketscloud"]'),
  );
}

function waitForTcWidgetVisible(timeoutMs = 1400) {
  return new Promise<boolean>((resolve) => {
    if (isTcWidgetVisible()) {
      resolve(true);
      return;
    }

    const deadline = Date.now() + timeoutMs;
    const observer = new MutationObserver(() => {
      if (isTcWidgetVisible()) {
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
      resolve(isTcWidgetVisible());
    }, timeoutMs);
  });
}

function dismissTcWidget() {
  if (typeof document === 'undefined') return;

  const iframe = document.querySelector<HTMLIFrameElement>('.tc-widget-frame_popup');
  if (iframe?.classList.contains('tc-widget-frame_popup')) {
    const popupShell = iframe.parentNode?.parentNode?.parentNode;
    if (popupShell instanceof Element) popupShell.remove();
  }

  document.getElementById('tc-widget-overlay')?.remove();
  document.getElementById('ticketscloud-loader')?.remove();

  const body = document.body;
  if (body.hasAttribute('data-overflow')) {
    body.style.overflow = body.getAttribute('data-overflow') || '';
    body.removeAttribute('data-overflow');
  }

  document.querySelectorAll('.tc-widget-container').forEach((node) => node.remove());
}

async function openTcWidgetWithFallback(targets: TcPurchaseTarget[]) {
  const normalizedTargets = targets.filter((target) => target.tcEventId);
  if (!normalizedTargets.length) return;

  if (normalizedTargets.length === 1) {
    await openTcWidget({
      trigger: createTcWidgetTrigger(normalizedTargets[0]),
      purchaseUrl: normalizedTargets[0].purchaseUrl,
    });
    return;
  }

  try {
    await ensureTcWidgetScript();
  } catch {
    openTcPurchaseUrl(normalizedTargets.find((target) => target.purchaseUrl)?.purchaseUrl);
    return;
  }

  dismissTcWidget();
  for (let index = 0; index < normalizedTargets.length; index += 1) {
    if (index > 0) dismissTcWidget();
    const trigger = createTcWidgetTrigger(normalizedTargets[index]);
    trigger.click();
    const visible = await waitForTcWidgetVisible(index === normalizedTargets.length - 1 ? 1600 : 1000);
    if (visible) return;
  }

  openTcPurchaseUrl(normalizedTargets.find((target) => target.purchaseUrl)?.purchaseUrl);
}

function createTcWidgetTrigger(target: TcPurchaseTarget) {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'tc-widget-trigger';
  trigger.setAttribute('data-tc-event', target.tcEventId);
  const widgetToken = resolveTcWidgetToken(target.purchaseUrl);
  if (widgetToken) trigger.setAttribute('data-tc-token', widgetToken);
  trigger.style.position = 'fixed';
  trigger.style.left = '-9999px';
  document.body.appendChild(trigger);
  window.setTimeout(() => trigger.remove(), 5000);
  return trigger;
}

async function openTcWidget(options: {
  trigger: HTMLButtonElement | null;
  purchaseUrl?: string | null;
}) {
  const { trigger, purchaseUrl } = options;

  if (purchaseUrl && !trigger) {
    openTcPurchaseUrl(purchaseUrl);
    return;
  }

  try {
    await ensureTcWidgetScript();
  } catch {
    openTcPurchaseUrl(purchaseUrl);
    return;
  }

  if (trigger) {
    trigger.click();
    return;
  }

  openTcPurchaseUrl(purchaseUrl);
}

export function getTcWidgetIds(event: {
  externalId?: string | number | null;
  widgetProvider?: string | null;
  widgetPayload?: {
    provider?: string | null;
    tcEventId?: string | number | null;
  } | null;
}) {
  const provider = String(event.widgetProvider || event.widgetPayload?.provider || '').toUpperCase();
  if (!provider.includes('TC') && !provider.includes('TICKETSCLOUD')) return null;

  const tcEventId = String(event.widgetPayload?.tcEventId ?? event.externalId ?? '').trim();
  if (!tcEventId) return null;

  return { tcEventId };
}

export function extractTcEventIdFromSession(session: {
  id?: string | null;
  eventId?: string | null;
  purchaseUrl?: string | null;
}) {
  const fromUrl = session.purchaseUrl?.match(/[?&]event=([^&]+)/)?.[1];
  if (fromUrl) return decodeURIComponent(fromUrl);

  const raw = String(session.eventId || session.id || '').trim();
  const match = raw.match(/^(?:evt_|sess_)?([a-f0-9]+)$/i);
  return match ? match[1] : raw || null;
}

export function isSessionPurchaseBlocked(session: {
  sourceStatus?: string | null;
  eventSourceStatus?: string | null;
  purchaseReady?: boolean;
  vacant?: number | null;
  purchaseUrl?: string | null;
}): boolean {
  const statuses = [session.sourceStatus, session.eventSourceStatus].map((value) => String(value || '').toLowerCase());
  if (statuses.some((status) => ['paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden'].includes(status))) {
    return true;
  }
  if (session.purchaseReady === false) return true;
  if (session.vacant === 0) return true;
  if (!session.purchaseUrl && session.purchaseReady !== true) return true;
  return false;
}

export function compareSessionsByStartsAt(
  a: { startsAt?: string | null },
  b: { startsAt?: string | null },
): number {
  return new Date(a.startsAt || 0).getTime() - new Date(b.startsAt || 0).getTime();
}

export function expandSessionPurchaseVariants<
  T extends {
    id?: string | null;
    eventId?: string | null;
    purchaseUrl?: string | null;
    purchaseReady?: boolean;
    vacant?: number | null;
    sourceStatus?: string | null;
    eventSourceStatus?: string | null;
    startsAt?: string | null;
    dateLabel?: string;
    timeLabel?: string;
    upcomingSlots?: Array<{
      eventId?: string | null;
      startsAt?: string | null;
      dateLabel?: string;
      timeLabel?: string;
      purchaseUrl?: string | null;
      sourceStatus?: string | null;
      purchaseReady?: boolean;
      vacant?: number | null;
    }>;
  },
>(session: T): T[] {
  const variants = new Map<string, T>();
  const remember = (candidate: T) => {
    const key = `${candidate.eventId || candidate.id || ''}|${candidate.startsAt || ''}|${candidate.purchaseUrl || ''}`;
    if (!key.replace(/\|/g, '')) return;
    if (!variants.has(key)) variants.set(key, candidate);
  };

  remember(session);
  for (const slot of session.upcomingSlots || []) {
    remember({
      ...session,
      id: slot.eventId || session.id,
      eventId: slot.eventId || session.eventId,
      startsAt: slot.startsAt || session.startsAt,
      dateLabel: slot.dateLabel || session.dateLabel,
      timeLabel: slot.timeLabel || session.timeLabel,
      purchaseUrl: slot.purchaseUrl || session.purchaseUrl,
      sourceStatus: slot.sourceStatus ?? session.sourceStatus,
      eventSourceStatus: slot.sourceStatus ?? session.eventSourceStatus,
      purchaseReady: slot.purchaseReady ?? session.purchaseReady,
      vacant: slot.vacant ?? session.vacant,
    });
  }

  return [...variants.values()].sort(compareSessionsByStartsAt);
}

export function pickRepresentativeSession<
  T extends {
    id?: string | null;
    eventId?: string | null;
    purchaseUrl?: string | null;
    purchaseReady?: boolean;
    vacant?: number | null;
    sourceStatus?: string | null;
    eventSourceStatus?: string | null;
    startsAt?: string | null;
    dateLabel?: string;
    timeLabel?: string;
    upcomingSlots?: Array<{
      eventId?: string | null;
      startsAt?: string | null;
      dateLabel?: string;
      timeLabel?: string;
      purchaseUrl?: string | null;
      sourceStatus?: string | null;
      purchaseReady?: boolean;
      vacant?: number | null;
    }>;
  },
>(sessions: T[]): T | null {
  if (!sessions.length) return null;
  const expanded = sessions.flatMap((session) => expandSessionPurchaseVariants(session));
  return pickPurchasableTcSession(expanded) || expanded[0] || sessions[0];
}

export function listPurchasableSessionVariants<
  T extends Parameters<typeof expandSessionPurchaseVariants>[0],
>(sessions: T[]): T[] {
  const expanded = sessions.flatMap((session) => expandSessionPurchaseVariants(session));
  const purchasable = expanded.filter((session) => !isSessionPurchaseBlocked(session));
  return purchasable.length ? purchasable : expanded;
}

export type TcPurchaseTarget = {
  tcEventId: string;
  purchaseUrl?: string | null;
};

export function buildTcPurchaseTargets<
  T extends {
    purchaseUrl?: string | null;
    purchaseReady?: boolean;
    vacant?: number | null;
    sourceStatus?: string | null;
    eventSourceStatus?: string | null;
    eventId?: string | null;
    id?: string | null;
    startsAt?: string | null;
    upcomingSlots?: Array<{
      eventId?: string | null;
      startsAt?: string | null;
      purchaseUrl?: string | null;
      sourceStatus?: string | null;
      purchaseReady?: boolean;
      vacant?: number | null;
    }>;
  },
>(sessions: T[]): TcPurchaseTarget[] {
  const targets: TcPurchaseTarget[] = [];
  const seen = new Set<string>();
  const expanded = sessions.flatMap((session) => expandSessionPurchaseVariants(session));

  for (const session of expanded.sort(compareSessionsByStartsAt)) {
    if (isSessionPurchaseBlocked(session)) continue;
    const tcEventId = extractTcEventIdFromSession(session);
    if (!tcEventId || seen.has(tcEventId)) continue;
    seen.add(tcEventId);
    targets.push({ tcEventId, purchaseUrl: session.purchaseUrl || null });
  }

  return targets;
}

export function pickPurchasableTcSession<
  T extends {
    purchaseUrl?: string | null;
    purchaseReady?: boolean;
    vacant?: number | null;
    sourceStatus?: string | null;
    eventSourceStatus?: string | null;
    eventId?: string | null;
    id?: string | null;
    startsAt?: string | null;
  },
>(sessions: T[]): T | null {
  const sorted = [...sessions].sort(compareSessionsByStartsAt);
  for (const session of sorted) {
    if (isSessionPurchaseBlocked(session)) continue;
    if (!extractTcEventIdFromSession(session)) continue;
    return session;
  }
  return null;
}

export function resolveTcPurchaseTarget(
  event: {
    externalId?: string | number | null;
    purchaseUrl?: string | null;
    widgetUrl?: string | null;
    deeplinkUrl?: string | null;
    widgetProvider?: string | null;
    widgetPayload?: { provider?: string | null; tcEventId?: string | number | null } | null;
  },
  sessions: Array<{
    purchaseUrl?: string | null;
    purchaseReady?: boolean;
    vacant?: number | null;
    sourceStatus?: string | null;
    eventSourceStatus?: string | null;
    eventId?: string | null;
    id?: string | null;
  }>,
  primaryOffer?: { widgetUrl?: string | null; deeplinkUrl?: string | null } | null,
): {
  tcEventId: string | null;
  purchaseUrl: string | null;
  isTcWidget: boolean;
  purchaseTargets: TcPurchaseTarget[];
} {
  const purchaseTargets = buildTcPurchaseTargets(sessions);
  const primaryTarget = purchaseTargets[0] || null;
  const purchasableSession = pickPurchasableTcSession(sessions.flatMap((session) => expandSessionPurchaseVariants(session)));
  const ticketscloud = getTcWidgetIds(event);
  const tcEventId =
    primaryTarget?.tcEventId ||
    (purchasableSession ? extractTcEventIdFromSession(purchasableSession) : null) ||
    ticketscloud?.tcEventId ||
    extractTcEventIdFromSession(sessions[0] || {}) ||
    null;
  const purchaseUrl =
    primaryTarget?.purchaseUrl ||
    purchasableSession?.purchaseUrl ||
    primaryOffer?.widgetUrl ||
    primaryOffer?.deeplinkUrl ||
    event.purchaseUrl ||
    event.widgetUrl ||
    event.deeplinkUrl ||
    sessions[0]?.purchaseUrl ||
    null;

  return {
    tcEventId,
    purchaseUrl,
    isTcWidget: Boolean(ticketscloud && tcEventId),
    purchaseTargets: purchaseTargets.length
      ? purchaseTargets
      : tcEventId
        ? [{ tcEventId, purchaseUrl }]
        : [],
  };
}

function formatSessionLabels(session: {
  startsAt?: string | null;
  dateLabel?: string;
  timeLabel?: string;
  city?: string | null;
  destination?: string | null;
  timeZone?: string | null;
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
    const timeZone = resolveSessionTimeZoneForSession(session);
    const d = parseSessionStartsAt(session.startsAt);
    if (!Number.isNaN(d.getTime())) {
      return {
        weekday: d.toLocaleDateString('ru-RU', { weekday: 'short', timeZone }),
        date: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone }),
        time: formatSessionTime(session.startsAt, session.timeLabel, timeZone),
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
    dateLabel?: string;
    timeLabel?: string;
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
    dateLabel?: string;
    timeLabel?: string;
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
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">{formatVacantSeats(vacant)}</span>
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
  compact = false,
  variant = 'default',
  className,
}: {
  tcEventId: string;
  purchaseUrl?: string | null;
  purchaseTargets?: TcPurchaseTarget[];
  label?: string;
  wide?: boolean;
  compact?: boolean;
  variant?: 'default' | 'hero';
  className?: string;
}) {
  const hiddenButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const eventId = String(tcEventId || '').trim();
  const widgetToken = resolveTcWidgetToken(purchaseUrl);
  const targets = React.useMemo(() => {
    if (purchaseTargets?.length) return purchaseTargets;
    return eventId ? [{ tcEventId: eventId, purchaseUrl }] : [];
  }, [eventId, purchaseUrl, purchaseTargets]);

  React.useEffect(() => {
    if (!eventId || !widgetToken) return;
    void ensureTcWidgetScript().catch(() => undefined);
  }, [eventId, widgetToken]);

  const handleClick = () => {
    void (async () => {
      await openTcWidget({ trigger: hiddenButtonRef.current, purchaseUrl: targets[0]?.purchaseUrl || purchaseUrl });
      if (targets.length <= 1) return;
      if (await waitForTcWidgetVisible(1200)) return;
      await openTcWidgetWithFallback(targets.slice(1));
    })();
  };

  const fallbackLinkClass =
    variant === 'hero'
      ? `inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md shadow-amber-700/30 transition hover:bg-amber-600 active:bg-amber-700 sm:px-6 sm:py-2.5 ${wide ? 'w-full' : ''}`
      : wide
        ? 'mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-700'
        : 'inline-flex min-h-10 items-center justify-center rounded-xl bg-primary-600 px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-700';

  if (!eventId || !widgetToken) {
    if (purchaseUrl) {
      const href = normalizeTcPurchaseUrl(purchaseUrl) || purchaseUrl;
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={fallbackLinkClass}>
          {label}
        </a>
      );
    }

    return (
      <span
        className={`inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-400 ${wide ? 'mt-4 w-full' : ''}`}
      >
        Виджет недоступен
      </span>
    );
  }

  const sizeClasses =
    variant === 'hero'
      ? `rounded-xl px-5 py-3 text-base font-semibold shadow-md shadow-amber-700/30 sm:px-6 sm:py-2.5 ${wide ? 'w-full' : ''}`
      : compact
        ? 'rounded-lg px-3.5 py-2 text-sm font-semibold'
        : wide
          ? 'mt-4 w-full rounded-xl px-6 py-3.5 text-base font-medium'
          : 'rounded-xl px-6 py-3.5 text-base font-medium';

  const colorClasses =
    variant === 'hero'
      ? 'bg-amber-500 text-white transition hover:bg-amber-600 active:bg-amber-700'
      : 'bg-primary-600 text-white transition hover:bg-primary-700';

  const buttonClassName =
    className || `tc-buy-btn inline-flex min-h-10 items-center justify-center gap-2 ${colorClasses} ${sizeClasses} ${wide ? 'w-full' : ''}`;

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        onClick={handleClick}
      >
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

const TABLE_BUY_CLASS =
  'inline-flex min-h-9 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700';

export function SessionBuyButton({
  session,
  purchaseTargets,
  label = 'Купить',
  className = TABLE_BUY_CLASS,
}: {
  session: {
    id?: string | null;
    eventId?: string | null;
    purchaseUrl?: string | null;
    purchaseProvider?: string | null;
    widgetUrl?: string | null;
    deeplinkUrl?: string | null;
    upcomingSlots?: Array<{
      eventId?: string | null;
      purchaseUrl?: string | null;
      startsAt?: string | null;
      sourceStatus?: string | null;
      purchaseReady?: boolean;
      vacant?: number | null;
    }>;
  };
  purchaseTargets?: TcPurchaseTarget[];
  label?: string;
  className?: string;
}) {
  const variants = expandSessionPurchaseVariants(session);
  const representative = pickRepresentativeSession([session]) || session;
  const purchaseUrl =
    representative.purchaseUrl || session.purchaseUrl || session.widgetUrl || session.deeplinkUrl || null;
  const targets =
    purchaseTargets ||
    buildTcPurchaseTargets(variants);
  const primaryTarget = targets[0] || null;
  const tcEventId = primaryTarget?.tcEventId || extractTcEventIdFromSession(representative);
  const provider = String(session.purchaseProvider || '').toUpperCase();
  const isTc = provider.includes('TC') || provider.includes('TICKETSCLOUD') || isTcPurchaseUrl(purchaseUrl);
  const widgetToken = resolveTcWidgetToken(primaryTarget?.purchaseUrl || purchaseUrl);

  if (!purchaseUrl) {
    return (
      <span className="inline-flex min-h-9 items-center justify-center rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-400">
        Нет ссылки
      </span>
    );
  }

  if (isTc && tcEventId && widgetToken) {
    return (
      <TcWidgetButton
        tcEventId={tcEventId}
        purchaseUrl={primaryTarget?.purchaseUrl || purchaseUrl}
        purchaseTargets={targets.length > 1 ? targets : undefined}
        label={label}
        compact
        className={className}
      />
    );
  }

  const href = normalizeTcPurchaseUrl(primaryTarget?.purchaseUrl || purchaseUrl) || purchaseUrl;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  );
}
