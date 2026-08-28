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
  const kinds: BlogFeedPromoKind[] = ['city'];
  if (promo.chips?.some((chip) => chip.label && chip.href)) kinds.push('landing');
  if (promo.upcomingTitles?.some((title) => String(title || '').trim())) kinds.push('event');
  if (!hasSidebar) return kinds;
  // Sidebar already shows the city afisha guide — avoid duplicate banners in the feed.
  return kinds.filter((kind) => kind !== 'city');
}

/**
 * Sparse feed seeding: usually 1 slot after the first bento block.
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
  const kind = kinds[seed % kinds.length]!;
  const layout = LAYOUTS[seed % LAYOUTS.length]!;

  const plans: BlogFeedPromoPlan[] = [
    { afterBlockIndex: 0, kind, layout },
  ];

  if (input.blockCount >= 3 && seed % 4 === 0) {
    const kind2 = kinds[(seed + 1) % kinds.length]!;
    const layout2 = LAYOUTS[(seed + 2) % LAYOUTS.length]!;
    plans.push({ afterBlockIndex: 2, kind: kind2, layout: layout2 });
  }

  return plans;
}
