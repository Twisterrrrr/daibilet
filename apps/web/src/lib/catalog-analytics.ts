/**
 * Lightweight catalog analytics - fires when Yandex Metrika / GTM are present.
 * Never throws; safe on SSR and without tags.
 */

export type CatalogBannerTarget = 'rooftops' | 'river' | 'weekend' | 'blog' | string;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    ym?: (counterId: number, method: string, target: string, params?: Record<string, unknown>) => void;
  }
}

function resolveMetrikaCounterId(): number | null {
  if (typeof window === 'undefined') return null;

  const fromEnv = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  try {
    const ya = (window as Window & { Ya?: { Metrika2?: { counters?: () => Array<{ id: number }> } } }).Ya;
    const id = ya?.Metrika2?.counters?.()?.[0]?.id;
    return typeof id === 'number' && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function trackCatalogBannerClick(target: CatalogBannerTarget): void {
  if (typeof window === 'undefined') return;

  const payload = {
    event: 'catalog_interstitial_click',
    target: String(target),
  };

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  } catch {
    // ignore
  }

  try {
    const counterId = resolveMetrikaCounterId();
    if (counterId != null && typeof window.ym === 'function') {
      window.ym(counterId, 'reachGoal', 'catalog_interstitial_click', { target: String(target) });
    }
  } catch {
    // ignore
  }
}
