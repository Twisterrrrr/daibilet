export type PublicOfferLike = {
  id?: string | number | null;
  eventId?: string | number | null;
  sourceCode?: string | null;
  title?: string | null;
  priceRub?: number | null;
  sortOrder?: number | string | null;
  active?: boolean | null;
  [key: string]: unknown;
};

function normalizeGroupPart(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function readOfferSortOrder(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isGenericTcOfferTitle(title: unknown): boolean {
  const key = normalizeGroupPart(title);
  return !key || key === 'widget' || key.includes('ticketscloud widget');
}

/** Prefer named ticket offers over generic TC widget placeholders. */
export function preferNamedTicketOffers<T extends PublicOfferLike>(rows: T[] | null | undefined): T[] {
  const list = rows || [];
  const named = list.filter((row) => !isGenericTcOfferTitle(row.title));
  return named.length ? named : list;
}

/** Dedupe offers by source+title+price; keep lowest sortOrder. */
export function dedupePublicOffers<T extends PublicOfferLike>(rows: T[] | null | undefined): T[] {
  const unique = new Map<string, T>();
  for (const row of rows || []) {
    const key = `${String(row.sourceCode || '')}|${normalizeGroupPart(row.title)}|${row.priceRub}`;
    const sortOrder = readOfferSortOrder(row.sortOrder);
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, row);
      continue;
    }
    const existingOrder = readOfferSortOrder(existing.sortOrder) ?? 9999;
    const nextOrder = sortOrder ?? 9999;
    if (nextOrder < existingOrder) unique.set(key, row);
  }

  return Array.from(unique.values()).sort((a, b) => {
    const aOrder = readOfferSortOrder(a.sortOrder) ?? 9999;
    const bOrder = readOfferSortOrder(b.sortOrder) ?? 9999;
    return (
      aOrder - bOrder ||
      Number(a.priceRub || 0) - Number(b.priceRub || 0) ||
      String(a.title || '').localeCompare(String(b.title || ''), 'ru')
    );
  });
}
