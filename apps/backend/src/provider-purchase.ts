import type {
  PurchaseMode,
  PurchaseProvider,
  PurchaseUrlSource,
} from './types/common.js';

export interface ProviderPurchaseInput {
  sourceCode?: string | null | undefined;
  offerSourceCode?: string | null | undefined;
  offerWidgetUrl?: string | null | undefined;
  offerDeeplinkUrl?: string | null | undefined;
  externalId?: string | null | undefined;
}

export interface ProviderPurchaseInfo {
  ready: boolean;
  mode: PurchaseMode | null;
  provider: PurchaseProvider | null;
  urlSource: PurchaseUrlSource | null;
  url: string | null;
}

export function providerForSource(sourceCode?: string | null): PurchaseProvider | null {
  const normalized = String(sourceCode || '').toUpperCase();
  if (normalized.includes('TEPLOHOD')) return 'TEPLOHOD';
  if (normalized.includes('TC') || normalized.includes('TICKETSCLOUD')) return 'TICKETSCLOUD';
  return null;
}

export function purchaseInfo(input: ProviderPurchaseInput): ProviderPurchaseInfo {
  const sourceCode = input.sourceCode || input.offerSourceCode;
  const provider = providerForSource(sourceCode);
  const fallbackUrl = sanitizeTicketscloudPurchaseUrl(
    buildProviderWidgetUrl({ ...input, offerSourceCode: sourceCode }),
  );
  // Prefer rebuilt TEP checkout URL: stored offer deeplinks to teplohod.info/event/* currently 404.
  const explicitRaw =
    provider === 'TEPLOHOD'
      ? null
      : input.offerWidgetUrl || input.offerDeeplinkUrl || null;
  const explicitUrl = sanitizeTicketscloudPurchaseUrl(explicitRaw);
  const url = explicitUrl || fallbackUrl || null;
  return {
    ready: Boolean(url),
    mode: provider ? 'widget' : url ? 'redirect' : null,
    provider,
    urlSource: explicitUrl ? 'offer' : fallbackUrl ? 'fallback' : null,
    url,
  };
}

export function buildProviderWidgetUrl(input: ProviderPurchaseInput): string | null {
  const provider = providerForSource(input.sourceCode || input.offerSourceCode);
  if (provider === 'TEPLOHOD') {
    const eventId =
      normalizeTeplohodEventId(input.externalId) ||
      extractTeplohodEventIdFromUrl(input.offerDeeplinkUrl || input.offerWidgetUrl);
    return buildTeplohodUrl(eventId);
  }
  if (provider === 'TICKETSCLOUD') return buildTicketscloudWidgetUrl(input.externalId);
  return null;
}

export function buildProviderWidgetPayload(input: ProviderPurchaseInput): Record<string, unknown> | null {
  const provider = providerForSource(input.sourceCode || input.offerSourceCode);
  if (provider === 'TEPLOHOD') {
    return {
      provider,
      tepEventId: normalizeTeplohodEventId(input.externalId),
      tepWidgetId: process.env.TEP_WIDGET_ID || '14208',
    };
  }
  if (provider === 'TICKETSCLOUD') {
    return { provider, tcEventId: input.externalId || null };
  }
  return null;
}

export function resolveSessionPurchaseExternalId(input: {
  sourceCode?: string | null | undefined;
  providerSessionId?: string | null | undefined;
  providerEventId?: string | null | undefined;
  fallbackEventId?: string | null | undefined;
}): string | null {
  return providerForSource(input.sourceCode) === 'TEPLOHOD'
    ? input.providerEventId || input.fallbackEventId || null
    : input.providerSessionId || input.providerEventId || input.fallbackEventId || null;
}

/**
 * TicketsCloud widget *page* rejects `token=r:…` with HTTPForbidden/bad token.
 * The `r:` prefix is only for JS widget `data-tc-token`; URLs must use bare JWT.
 * Also prefer ticketscloud.com over .org (same widget, fewer redirects).
 */
export function sanitizeTicketscloudPurchaseUrl(url?: string | null): string | null {
  const raw = String(url || '').trim();
  if (!raw) return null;
  if (!/ticketscloud/i.test(raw)) return raw;
  try {
    const parsed = new URL(raw);
    const token = parsed.searchParams.get('token');
    if (token?.startsWith('r:')) parsed.searchParams.set('token', token.slice(2));
    if (parsed.hostname === 'ticketscloud.org') parsed.hostname = 'ticketscloud.com';
    return parsed.toString();
  } catch {
    return raw;
  }
}

function buildTicketscloudWidgetUrl(eventExternalId?: string | null): string | null {
  const token = process.env.TICKETSCLOUD_WIDGET_TOKEN || process.env.TC_WIDGET_TOKEN;
  if (!token || !eventExternalId) return null;
  // Bare JWT in query - `r:` prefix → HTTP 403 {"error":"HTTPForbidden","reason":"bad token"}.
  const normalizedToken = token.startsWith('r:') ? token.slice(2) : token;
  const url = new URL(process.env.TICKETSCLOUD_WIDGET_BASE_URL || 'https://ticketscloud.com/v1/widgets/common');
  url.searchParams.set('token', normalizedToken);
  url.searchParams.set('event', eventExternalId);
  return url.toString();
}

function buildTeplohodUrl(eventExternalId?: string | null): string | null {
  if (!eventExternalId) return null;
  const eventId = String(eventExternalId).replace(/^tep-/i, '').trim();
  if (!/^\d+$/.test(eventId)) return null;
  const widgetId = String(process.env.TEP_WIDGET_ID || '14208').trim() || '14208';
  // teplohod.info/event/{id} currently returns "Ошибка!"; working checkout is account.teplohod.info.
  const checkoutBase = (process.env.TEP_CHECKOUT_BASE_URL || 'https://account.teplohod.info').replace(/\/+$/, '');
  const url = new URL(`${checkoutBase}/order/event-order`);
  url.searchParams.set('widget_id', widgetId);
  url.searchParams.set('event_id', eventId);
  return url.toString();
}

function normalizeTeplohodEventId(value?: string | null): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/(?:^tep-)?(\d+)$/i);
  return match?.[1] || null;
}

function extractTeplohodEventIdFromUrl(url?: string | null): string | null {
  const match = String(url || '').match(/(?:teplohod\.info\/event\/|event_id=)(\d+)/i);
  return match?.[1] || null;
}
