import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';

export type BlogFeedPromoKind = 'city' | 'landing' | 'event';
export type BlogFeedPromoLayout = 'strip' | 'strip-dense' | 'overlay' | 'split';

export type BlogFeedPromoPlan = {
  /** Insert after this 0-based bento block index. */
  afterBlockIndex: number;
  kind: BlogFeedPromoKind;
  layout: BlogFeedPromoLayout;
};

const LAYOUTS: BlogFeedPromoLayout[] = ['strip', 'strip-dense', 'split'];

function availableKinds(promo: BlogSidebarPromoDto, hasSidebar: boolean): BlogFeedPromoKind[] {
  const kinds: BlogFeedPromoKind[] = [];
  // Bento break = event card (title or any live afisha signal), not city cover strip.
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
 * Sparse feed seeding: event banner in the bento break after the first block.
 * A second slot (after block 2) only when there are enough blocks and seed allows (~1/4).
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
  // First slot: always event when available (replaces old horizontal article lead banner).
  const kind = kinds.includes('event') ? 'event' : kinds[0]!;
  const layout: BlogFeedPromoLayout =
    kind === 'event' ? 'overlay' : LAYOUTS[seed % LAYOUTS.length]!;

  const plans: BlogFeedPromoPlan[] = [
    { afterBlockIndex: 0, kind, layout },
  ];

  if (input.blockCount >= 3 && seed % 4 === 0) {
    const kind2 = kinds.find((item) => item !== kind) || kinds[(seed + 1) % kinds.length]!;
    const layout2 = LAYOUTS[(seed + 2) % LAYOUTS.length]!;
    plans.push({ afterBlockIndex: 2, kind: kind2, layout: layout2 });
  }

  return plans;
}
