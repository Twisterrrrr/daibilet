/**
 * Связи покупателя в админке: заказы / возвраты / обращения.
 *
 * Правила docs/cline-buyer-admin-ui-brief-2026-10-20.md и
 * docs/buyer-admin-bridge-2026-10-20.md:
 * - переходы строятся только из данных, которые уже отдал сервер;
 * - обращения пока не связаны с покупателем на сервере (нет unified admin
 *   buyer DTO и права support.read), поэтому у них нет рабочего адреса и
 *   интерфейс не притворяет, что связь есть;
 * - клиент ничего не досчитывает и не маскирует: это не защита PII.
 */

export type BuyerRelationSource = {
  email?: string | null;
  phone?: string | null;
  lastOrderNumber?: string | null;
  lookup?: string | null;
};

export type BuyerRelationLinkId = 'orders' | 'refunds' | 'appeals';

export type BuyerRelationLink = {
  id: BuyerRelationLinkId;
  label: string;
  href: string | null;
  note?: string;
};

export const BUYER_APPEALS_PENDING_NOTE =
  'Связь обращений с покупателем появится после выпуска unified admin buyer DTO (право support.read).';

/** Поисковый ключ для реестра заказов: email, затем телефон, затем номер заказа. */
export function buyerRelationLookup(source: BuyerRelationSource): string {
  return String(source.email || source.phone || source.lastOrderNumber || source.lookup || '').trim();
}

export function buyerOrdersHref(source: BuyerRelationSource, view?: 'active' | 'archive'): string {
  const params = new URLSearchParams();
  const lookup = buyerRelationLookup(source);
  if (lookup) params.set('q', lookup);
  if (view === 'archive') params.set('view', 'archive');
  const query = params.toString();
  return `/orders${query ? `?${query}` : ''}`;
}

export function buyerRefundsHref(source: BuyerRelationSource): string {
  const params = new URLSearchParams();
  const lookup = buyerRelationLookup(source);
  if (lookup) params.set('q', lookup);
  params.set('view', 'pending_refunds');
  return `/orders?${params.toString()}`;
}

export function buyerRelationLinks(
  source: BuyerRelationSource,
  view?: 'active' | 'archive',
): BuyerRelationLink[] {
  return [
    { id: 'orders', label: 'Заказы', href: buyerOrdersHref(source, view) },
    { id: 'refunds', label: 'Возвраты', href: buyerRefundsHref(source) },
    { id: 'appeals', label: 'Обращения', href: null, note: BUYER_APPEALS_PENDING_NOTE },
  ];
}
