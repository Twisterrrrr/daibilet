const TC_HOST = /(^|\.)ticketscloud\.(com|org|ru)$/i;
const TEP_HOST = /(^|\.)teplohod\.info$/i;

function parseHttpsUrl(value?: string | null): URL | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function normalizeTicketscloudPurchaseUrl(value?: string | null): string | null {
  const url = parseHttpsUrl(value);
  if (!url || !TC_HOST.test(url.hostname)) return null;

  const token = url.searchParams.get('token');
  if (token?.startsWith('r:')) url.searchParams.set('token', token.slice(2));
  if (url.hostname.toLowerCase() === 'ticketscloud.org') url.hostname = 'ticketscloud.com';
  return url.toString();
}

export function isTrustedTeplohodPurchaseUrl(value?: string | null): boolean {
  const url = parseHttpsUrl(value);
  return Boolean(url && TEP_HOST.test(url.hostname));
}

export function isSafeExternalPurchaseUrl(value?: string | null): boolean {
  const url = parseHttpsUrl(value);
  if (!url) return false;
  return !/(^|\.)daibilet\.ru$/i.test(url.hostname);
}

export function isTrustedProviderPurchaseUrl(value?: string | null): boolean {
  return Boolean(normalizeTicketscloudPurchaseUrl(value) || isTrustedTeplohodPurchaseUrl(value));
}

export function normalizeTeplohodEventId(value?: string | number | null): string | null {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(?:tep-)?(\d+)$/i);
  return match?.[1] || null;
}

export function extractTeplohodEventId(value?: string | null): string | null {
  const url = parseHttpsUrl(value);
  if (!url || !TEP_HOST.test(url.hostname)) return null;
  const fromQuery = normalizeTeplohodEventId(url.searchParams.get('event_id'));
  if (fromQuery) return fromQuery;
  return normalizeTeplohodEventId(url.pathname.match(/\/event\/(\d+)/i)?.[1]);
}

export function buildTeplohodPurchaseUrl(options: {
  eventId?: string | number | null;
  widgetId?: string | number | null;
}): string | null {
  const eventId = normalizeTeplohodEventId(options.eventId);
  if (!eventId) return null;
  const widgetId = normalizeTeplohodEventId(options.widgetId) || '14460';
  const url = new URL('https://account.teplohod.info/order/event-order');
  url.searchParams.set('widget_id', widgetId);
  url.searchParams.set('event_id', eventId);
  return url.toString();
}

export function isTicketscloudProvider(...values: Array<string | null | undefined>): boolean {
  return values.some((value) => {
    const normalized = String(value || '').toUpperCase();
    return normalized === 'TC' || normalized.includes('TICKETSCLOUD');
  });
}

export function isTeplohodProvider(...values: Array<string | null | undefined>): boolean {
  return values.some((value) => {
    const normalized = String(value || '').toUpperCase();
    return normalized === 'TEP' || normalized.includes('TEPLOHOD');
  });
}
