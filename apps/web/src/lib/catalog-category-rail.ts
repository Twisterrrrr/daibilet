import { displayCatalogLabel } from '@/lib/catalog-labels';

export type CatalogCategoryFacet = { name: string; events: number };

const PRIMARY_CAP = 7;

/** Prefer these names at the front of the rail when present in facets (case-sensitive catalog names). */
const PIN_EXACT = ['Экскурсии', 'Музеи и арт'] as const;

function isStandupish(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('стендап') || n.includes('юмор') || n.includes('comedy');
}

/**
 * Split facets into primary rail + overflow for «Ещё».
 * Active category always stays visible even if it would be in overflow.
 */
export function splitCatalogCategories(
  categories: CatalogCategoryFacet[],
  activeCategory?: string,
): { primary: CatalogCategoryFacet[]; overflow: CatalogCategoryFacet[] } {
  const byName = new Map(categories.map((item) => [item.name, item]));
  if (activeCategory && !byName.has(activeCategory)) {
    byName.set(activeCategory, { name: activeCategory, events: 0 });
  }

  const eligible = [...byName.values()].filter(
    (item) => item.events > 0 || item.name === activeCategory,
  );

  const pinned: CatalogCategoryFacet[] = [];
  const rest: CatalogCategoryFacet[] = [];
  const used = new Set<string>();

  for (const pin of PIN_EXACT) {
    const hit = eligible.find((item) => item.name === pin);
    if (hit) {
      pinned.push(hit);
      used.add(hit.name);
    }
  }

  const standup = eligible.find((item) => !used.has(item.name) && isStandupish(item.name));
  if (standup) {
    pinned.push(standup);
    used.add(standup.name);
  }

  for (const item of eligible) {
    if (!used.has(item.name)) rest.push(item);
  }

  rest.sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru'));

  const merged = [...pinned, ...rest];
  let primary = merged.slice(0, PRIMARY_CAP);
  let overflow = merged.slice(PRIMARY_CAP);

  if (activeCategory && overflow.some((item) => item.name === activeCategory)) {
    const active = overflow.find((item) => item.name === activeCategory)!;
    overflow = overflow.filter((item) => item.name !== activeCategory);
    const dropped = primary[primary.length - 1];
    primary = [...primary.slice(0, -1), active];
    if (dropped && dropped.name !== activeCategory) {
      overflow = [dropped, ...overflow];
    }
  }

  return { primary, overflow };
}

export function catalogSearchHintsFromFacets(
  categories: CatalogCategoryFacet[],
  limit = 5,
): Array<{ kind: 'category' | 'q'; label: string; category?: string; q?: string }> {
  const hints: Array<{ kind: 'category' | 'q'; label: string; category?: string; q?: string }> = [];
  const sorted = [...categories].filter((c) => c.events > 0).sort((a, b) => b.events - a.events);

  for (const item of sorted) {
    if (hints.length >= limit) break;
    hints.push({
      kind: 'category',
      label: displayCatalogLabel(item.name),
      category: item.name,
    });
  }

  const hasStandupFacet = sorted.some((c) => isStandupish(c.name));
  if (hasStandupFacet && hints.length < limit && !hints.some((h) => h.q === 'стендап')) {
    // Prefer q intent only when standup-ish facet exists (real signal).
    hints.unshift({ kind: 'q', label: 'Стендап', q: 'стендап' });
    if (hints.length > limit) hints.pop();
  }

  return hints.slice(0, limit);
}
