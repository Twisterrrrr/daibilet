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
  const explicitUrl = input.offerWidgetUrl || input.offerDeeplinkUrl || null;
  const fallbackUrl = buildProviderWidgetUrl({ ...input, offerSourceCode: sourceCode });
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
    return input.offerDeeplinkUrl || buildTeplohodUrl(input.externalId);
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

function buildTicketscloudWidgetUrl(eventExternalId?: string | null): string | null {
  const token = process.env.TICKETSCLOUD_WIDGET_TOKEN || process.env.TC_WIDGET_TOKEN;
  if (!token || !eventExternalId) return null;
  const normalizedToken = token.startsWith('r:') ? token : `r:${token}`;
  const url = new URL(process.env.TICKETSCLOUD_WIDGET_BASE_URL || 'https://ticketscloud.org/v1/widgets/common');
  url.searchParams.set('token', normalizedToken);
  url.searchParams.set('event', eventExternalId);
  return url.toString();
}

function buildTeplohodUrl(eventExternalId?: string | null): string | null {
  if (!eventExternalId) return null;
  const baseUrl = process.env.TEP_WIDGET_BASE_URL || 'https://teplohod.info';
  return `${baseUrl.replace(/\/+$/, '')}/event/${encodeURIComponent(eventExternalId)}`;
}

function normalizeTeplohodEventId(value?: string | null): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/(?:^tep-)?(\d+)$/i);
  return match?.[1] || raw;
}
