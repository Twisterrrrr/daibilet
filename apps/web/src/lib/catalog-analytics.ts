/**
 * Catalog / funnel analytics - fires when Yandex Metrika / GTM are present.
 * Never throws; safe on SSR and without tags.
 *
 * Stable goal ids for Metrika UI (JavaScript-событие, case-sensitive):
 * - product_card_click
 * - select_tickets
 * - purchase_success  (НЕ шлём с клиента без надёжного сигнала - см. docs)
 * - catalog_interstitial_click
 */

export type CatalogBannerTarget = 'rooftops' | 'river' | 'weekend' | 'blog' | string;

export const METRIKA_GOALS = {
  PRODUCT_CARD_CLICK: 'product_card_click',
  SELECT_TICKETS: 'select_tickets',
  PURCHASE_SUCCESS: 'purchase_success',
  CATALOG_INTERSTITIAL_CLICK: 'catalog_interstitial_click',
} as const;

export type MetrikaGoalId = (typeof METRIKA_GOALS)[keyof typeof METRIKA_GOALS];

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

function trackGoal(goal: MetrikaGoalId | string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  const payload = {
    event: String(goal),
    ...(params || {}),
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
      window.ym(counterId, 'reachGoal', String(goal), params);
    }
  } catch {
    // ignore
  }
}

export function trackCatalogBannerClick(target: CatalogBannerTarget): void {
  trackGoal(METRIKA_GOALS.CATALOG_INTERSTITIAL_CLICK, { target: String(target) });
}

/** Клик по карточке события / продукта (переход на страницу события). */
export function trackProductCardClick(params?: {
  eventId?: string | null;
  slug?: string | null;
  source?: string | null;
}): void {
  trackGoal(METRIKA_GOALS.PRODUCT_CARD_CLICK, {
    eventId: params?.eventId ? String(params.eventId) : undefined,
    slug: params?.slug ? String(params.slug) : undefined,
    source: params?.source ? String(params.source) : undefined,
  });
}

/**
 * Клик «Купить» / «Выбрать билеты» / открытие виджета TC или Teplohod.
 * Это intent к оплате, не факт оплаты.
 */
export function trackSelectTickets(params?: {
  eventId?: string | null;
  slug?: string | null;
  provider?: string | null;
  source?: string | null;
}): void {
  trackGoal(METRIKA_GOALS.SELECT_TICKETS, {
    eventId: params?.eventId ? String(params.eventId) : undefined,
    slug: params?.slug ? String(params.slug) : undefined,
    provider: params?.provider ? String(params.provider) : undefined,
    source: params?.source ? String(params.source) : undefined,
  });
}

/**
 * Успешная оплата. Сейчас клиентский коллбек виджета / thank-you page отсутствуют:
 * покупка уходит во внешний виджет (Ticketscloud / Teplohod), заказы появляются в API позже.
 * Не вызывать без реального сигнала (callback виджета, thank-you URL, webhook→pixel).
 * Функция готова для будущей проводки - маркетолог может создать цель заранее.
 */
export function trackPurchaseSuccess(params?: {
  eventId?: string | null;
  orderId?: string | null;
  provider?: string | null;
  source?: string | null;
}): void {
  trackGoal(METRIKA_GOALS.PURCHASE_SUCCESS, {
    eventId: params?.eventId ? String(params.eventId) : undefined,
    orderId: params?.orderId ? String(params.orderId) : undefined,
    provider: params?.provider ? String(params.provider) : undefined,
    source: params?.source ? String(params.source) : undefined,
  });
}
