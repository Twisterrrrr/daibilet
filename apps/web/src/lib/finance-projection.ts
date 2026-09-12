/**
 * Catalog-side finance projection types + pure mapping (CF.P1b / CF.P2).
 * Catalog never writes finance DB; CTA only when canSell === true.
 */

export type FinanceAdmissionOffer = {
  id: string;
  title: string;
  priceRub: number;
  oldPriceRub?: number | null;
  groupSize?: number | null;
  capacityTotal?: number | null;
};

export type FinanceAdmissionRef = {
  id?: string;
  slug: string;
  title: string;
  kind?: string | null;
  citySlug?: string | null;
  cityTitle?: string | null;
  status?: string | null;
  integrationMode?: string | null;
  defaultCatalogMode?: string | null;
};

export type FinanceAdmissionProduct = {
  id: string;
  slug: string;
  title: string;
  shortTitle?: string | null;
  shortDescription?: string | null;
  imageUrl?: string | null;
  type: string;
  purchaseFlow?: string | null;
  managementMode?: string | null;
  validityMode?: string | null;
  /** Open-date / window end (ISO) when finance exposes it. */
  validFrom?: string | null;
  validTo?: string | null;
  validDaysAfterPurchase?: number | null;
  priceFromRub?: number | null;
  ticketsVacant?: number | null;
  canSell: boolean;
  checkoutPath?: string | null;
  city?: FinanceAdmissionRef | null;
  venue?: FinanceAdmissionRef | null;
  supplier?: FinanceAdmissionRef | null;
  /** Emergency / org support phone when finance adds it to public DTO. */
  supportPhone?: string | null;
  offers: FinanceAdmissionOffer[];
};

export type FinanceAdmissionSummary = {
  published: number;
  canSell: number;
  priceFromRub?: number | null;
  venues?: number;
  suppliers?: number;
};

export type FinanceAdmissionListResult = {
  items: FinanceAdmissionProduct[];
  summary: FinanceAdmissionSummary;
  total: number;
};

/** Default: show city hub block when at least one published product exists (MVP / test museum). */
export const CITY_ADMISSION_MIN_PUBLISHED_DEFAULT = 1;

const MIN_DISPLAY_PRICE_RUB = 100;

/**
 * Legacy pay host (Codex parallel buyer experiment / supplier SPA).
 * Catalog buyer UX default is same-origin on daibilet.ru - see resolveAdmissionCheckoutUrl.
 */
export const FINANCE_CHECKOUT_BASE_URL_DEFAULT = 'https://pay.daibilet.ru';

/** Catalog buyer checkout surface (Cursor UX track). */
export const CATALOG_BUYER_CHECKOUT_ORIGIN_DEFAULT = 'same-origin';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

/**
 * Hide finance-seed / internal stub copy from buyer UI.
 * Seed shortDescription may contain «STUB checkout» - do not invent marketing replacement.
 */
export function sanitizeAdmissionShortDescription(
  value: string | null | undefined,
): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  if (/\bSTUB\b/i.test(text)) return null;
  return text;
}

/** Rewrite legacy checkout. host → pay. on absolute URLs. */
export function normalizeFinanceCheckoutAbsoluteUrl(url: string): string {
  return url.replace(
    /^(https?:\/\/)checkout\.daibilet\.ru(?=[:/]|$)/i,
    `$1pay.daibilet.ru`,
  );
}

function mapRef(raw: unknown): FinanceAdmissionRef | null {
  const row = asRecord(raw);
  if (!row) return null;
  const slug = asString(row.slug);
  const title = asString(row.title);
  if (!slug || !title) return null;
  return {
    id: asString(row.id) ?? undefined,
    slug,
    title,
    kind: asString(row.kind),
    citySlug: asString(row.citySlug),
    cityTitle: asString(row.cityTitle),
    status: asString(row.status),
    integrationMode: asString(row.integrationMode),
    defaultCatalogMode: asString(row.defaultCatalogMode),
  };
}

function mapOffer(raw: unknown): FinanceAdmissionOffer | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  const title = asString(row.title);
  const priceRub = asNumber(row.priceRub);
  if (!id || !title || priceRub == null) return null;
  return {
    id,
    title,
    priceRub,
    oldPriceRub: asNumber(row.oldPriceRub),
    groupSize: asNumber(row.groupSize),
    capacityTotal: asNumber(row.capacityTotal),
  };
}

/** Map one public AdmissionProduct DTO; strips paymentMode / provider ids from consumer view. */
export function mapAdmissionProduct(raw: unknown): FinanceAdmissionProduct | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  const slug = asString(row.slug);
  const title = asString(row.title);
  const type = asString(row.type);
  if (!id || !slug || !title || !type) return null;

  const readiness = asRecord(row.readiness);
  const canSell = asBoolean(row.canSell) || asBoolean(readiness?.canSell);

  const offersRaw = Array.isArray(row.offers) ? row.offers : [];
  const offers = offersRaw.map(mapOffer).filter((o): o is FinanceAdmissionOffer => Boolean(o));

  const supplier = mapRef(row.supplier);
  const supplierRecord = asRecord(row.supplier);
  const supportPhone =
    asString(row.supportPhone) ||
    asString(row.supplierSupportPhone) ||
    asString(supplierRecord?.supportPhone) ||
    asString(supplierRecord?.phone);

  return {
    id,
    slug,
    title,
    shortTitle: asString(row.shortTitle),
    shortDescription: sanitizeAdmissionShortDescription(asString(row.shortDescription)),
    imageUrl: asString(row.imageUrl),
    type,
    purchaseFlow: asString(row.purchaseFlow),
    managementMode: asString(row.managementMode),
    validityMode: asString(row.validityMode),
    validFrom: asString(row.validFrom),
    validTo: asString(row.validTo) || asString(row.validUntil),
    validDaysAfterPurchase: asNumber(row.validDaysAfterPurchase),
    priceFromRub: asNumber(row.priceFromRub),
    ticketsVacant: asNumber(row.ticketsVacant),
    canSell,
    checkoutPath: asString(row.checkoutPath),
    city: mapRef(row.city),
    venue: mapRef(row.venue),
    supplier,
    supportPhone,
    offers,
  };
}

/** Dev/stage admission products hidden from public city hubs until launch. */
export function isHiddenAdmissionProduct(product: FinanceAdmissionProduct): boolean {
  const slug = String(product.slug || '').toLowerCase();
  const venueSlug = String(product.venue?.slug || '').toLowerCase();
  const title = `${product.title || ''} ${product.venue?.title || ''}`.toLowerCase();
  if (slug.includes('test_museum') || venueSlug.includes('test_museum')) return true;
  if (title.includes('тестовый музей')) return true;
  return false;
}

export function mapAdmissionListPayload(raw: unknown): FinanceAdmissionListResult {
  const row = asRecord(raw);
  if (!row) {
    return { items: [], summary: { published: 0, canSell: 0 }, total: 0 };
  }

  const itemsRaw = Array.isArray(row.items) ? row.items : [];
  const items = itemsRaw
    .map(mapAdmissionProduct)
    .filter((item): item is FinanceAdmissionProduct => Boolean(item))
    .filter((item) => !isHiddenAdmissionProduct(item));

  const summaryRaw = asRecord(row.summary) || {};
  const priceFromValues = items
    .map((item) => item.priceFromRub)
    .filter((value): value is number => typeof value === 'number' && value > 0);
  const summary: FinanceAdmissionSummary = {
    published: items.length,
    canSell: items.filter((i) => i.canSell).length,
    priceFromRub:
      priceFromValues.length > 0
        ? Math.min(...priceFromValues)
        : asNumber(summaryRaw.priceFromRub),
    venues: asNumber(summaryRaw.venues) ?? undefined,
    suppliers: asNumber(summaryRaw.suppliers) ?? undefined,
  };

  return {
    items,
    summary,
    total: items.length,
  };
}

/** CTA gate: only when finance says canSell. */
export function shouldShowAdmissionCta(product: Pick<FinanceAdmissionProduct, 'canSell'>): boolean {
  return product.canSell === true;
}

/**
 * Resolve checkout URL for browser navigation.
 *
 * URL canon (2026-08-07):
 * - Catalog / Cursor buyer UX: same-origin `/checkout/admissions/{slug}` on daibilet.ru
 * - Codex parallel experiment may use pay.daibilet.ru - set FINANCE_CHECKOUT_BASE_URL / NEXT_PUBLIC_* explicitly
 * - Absolute legacy checkout.daibilet.ru → rewritten to pay.daibilet.ru
 */
export function resolveAdmissionCheckoutUrl(
  checkoutPath: string | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string | null {
  const path = typeof checkoutPath === 'string' ? checkoutPath.trim() : '';
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) {
    // Prefer catalog buyer routes even if finance still emits pay absolute URLs.
    const normalized = normalizeFinanceCheckoutAbsoluteUrl(path);
    try {
      const url = new URL(normalized);
      if (/^pay\.daibilet\.ru$/i.test(url.hostname) && url.pathname.startsWith('/checkout/')) {
        const preferPay =
          String(env.BUYER_CHECKOUT_HOST || env.NEXT_PUBLIC_BUYER_CHECKOUT_HOST || '')
            .trim()
            .toLowerCase() === 'pay';
        if (!preferPay) return `${url.pathname}${url.search}`;
      }
    } catch {
      // fall through
    }
    return normalized;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Direct process.env.NEXT_PUBLIC_* so Next inlines it into client bundles.
  const bakedPublic = process.env.NEXT_PUBLIC_FINANCE_CHECKOUT_BASE_URL;
  const explicitBase = (
    env.FINANCE_CHECKOUT_BASE_URL ||
    env.NEXT_PUBLIC_FINANCE_CHECKOUT_BASE_URL ||
    bakedPublic ||
    ''
  )
    .trim()
    .replace(/\/$/, '');

  // Default catalog track: keep relative path on daibilet.ru (apps/web checkout pages).
  if (!explicitBase || explicitBase === 'same-origin' || explicitBase === '/') {
    return normalizedPath;
  }

  const base = normalizeFinanceCheckoutAbsoluteUrl(explicitBase);
  if (!base) return normalizedPath;
  return `${base}${normalizedPath}`;
}

export function shouldShowCityAdmissionBlock(
  summary: Pick<FinanceAdmissionSummary, 'published'> | null | undefined,
  minPublished: number = CITY_ADMISSION_MIN_PUBLISHED_DEFAULT,
): boolean {
  const published = summary?.published ?? 0;
  return published >= Math.max(1, minPublished);
}

export function resolveCityAdmissionMinPublished(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): number {
  const raw = env.CITY_ADMISSION_MIN_PUBLISHED;
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return CITY_ADMISSION_MIN_PUBLISHED_DEFAULT;
}

export function formatAdmissionPriceFrom(priceFromRub?: number | null): string | null {
  if (typeof priceFromRub !== 'number' || !Number.isFinite(priceFromRub)) return null;
  if (priceFromRub < MIN_DISPLAY_PRICE_RUB) return null;
  return `от ${Math.round(priceFromRub).toLocaleString('ru-RU')} ₽`;
}

export function isOpenDateValidity(validityMode?: string | null): boolean {
  return String(validityMode || '').toUpperCase() === 'OPEN_DATE';
}

export function admissionTypeBadgeLabel(_type?: string | null): string {
  return 'Входной билет';
}
