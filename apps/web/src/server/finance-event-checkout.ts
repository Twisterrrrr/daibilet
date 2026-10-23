import {
  resolveFinanceApiBaseUrl,
  resolveFinanceApiHost,
  resolveFinanceProjectionToken,
  type FinanceProjectionEnv,
} from '@/server/finance-projection-client';

export type FinanceEventCheckout = {
  eventId: string;
  slug: string;
  title: string;
  kind: string;
  canSell: boolean;
  offers: Array<{ id: string; title: string; priceRub: number | null; canSell: boolean }>;
};

export async function fetchFinanceEventCheckout(
  slug: string,
  env: FinanceProjectionEnv = process.env,
): Promise<FinanceEventCheckout | null> {
  const base = resolveFinanceApiBaseUrl(env);
  if (!base || !slug.trim()) return null;
  const headers = new Headers({ Accept: 'application/json' });
  const host = resolveFinanceApiHost(env);
  const token = resolveFinanceProjectionToken(env);
  if (host) headers.set('Host', host);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    const response = await fetch(`${base}/api/public/checkout/events/${encodeURIComponent(slug)}`, {
      headers, cache: 'no-store', signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) return null;
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object') return null;
    const row = value as Record<string, unknown>;
    if (typeof row.eventId !== 'string' || typeof row.slug !== 'string'
      || typeof row.title !== 'string' || typeof row.kind !== 'string'
      || !Array.isArray(row.offers)) return null;
    const offers = row.offers.flatMap((offer): FinanceEventCheckout['offers'] => {
      if (!offer || typeof offer !== 'object') return [];
      const item = offer as Record<string, unknown>;
      if (typeof item.id !== 'string' || typeof item.title !== 'string') return [];
      return [{ id: item.id, title: item.title,
        priceRub: typeof item.priceRub === 'number' ? item.priceRub : null,
        canSell: item.canSell === true }];
    });
    return { eventId: row.eventId, slug: row.slug, title: row.title, kind: row.kind,
      canSell: row.canSell === true && offers.some((offer) => offer.canSell), offers };
  } catch {
    return null;
  }
}
