import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';

export type BlogFeedPromoKind = 'city' | 'landing' | 'event';
/** Promo cards join the magazine grid as regular bento tiles. */
export type BlogFeedPromoLayout = 'tile';

export type BlogFeedPromoPlan = {
  /** Insert after this 0-based bento block index. */
  afterBlockIndex: number;
  kind: BlogFeedPromoKind;
  layout: BlogFeedPromoLayout;
};

function availableKinds(promo: BlogSidebarPromoDto, hasSidebar: boolean): BlogFeedPromoKind[] {
  const kinds: BlogFeedPromoKind[] = [];
  // Bento break = live afisha signal (event title / href / count), not a city cover banner.
  const hasEventTitle = promo.upcomingTitles?.some((title) => String(title || '').trim());
  if (hasEventTitle || promo.featuredEventHref || (promo.eventsCount || 0) > 0) {
    kinds.push('event');
  }
  if (promo.chips?.some((chip) => chip.label && chip.href)) kinds.push('landing');
  // City afisha lives in sidebar (desktop) or featured hero - never a full-width feed strip.
  void hasSidebar;
  return kinds;
}

/**
 * Sparse feed seeding: promo tile after the first article-only bento block.
 * A second slot (after block 2) only when there are enough blocks and seed allows (~1/4).
 * The grid consumes two articles beside each promo, so no full-width banner interrupts reading.
 */
export function planBlogFeedPromos(input: {
  blockCount: number;
  promo: BlogSidebarPromoDto | null | undefined;
  seed: number;
  /** Desktop sidebar already shows the city afisha promo. */
  hasSidebar?: boolean;
}): BlogFeedPromoPlan[] {
  const promo = input.promo;
  if (!promo || input.blockCount < 1) return [];

  const hasSidebar = Boolean(input.hasSidebar);
  const kinds = availableKinds(promo, hasSidebar);
  if (!kinds.length) return [];

  const seed = Math.abs(Math.floor(input.seed)) || 1;
  const kind = kinds.includes('event') ? 'event' : kinds[0]!;

  const plans: BlogFeedPromoPlan[] = [
    { afterBlockIndex: 0, kind, layout: 'tile' },
  ];

  if (input.blockCount >= 3 && seed % 4 === 0) {
    const kind2 = kinds.find((item) => item !== kind) || kinds[(seed + 1) % kinds.length]!;
    plans.push({ afterBlockIndex: 2, kind: kind2, layout: 'tile' });
  }

  return plans;
}
