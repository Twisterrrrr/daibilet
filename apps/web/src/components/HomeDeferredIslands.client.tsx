'use client';

import dynamic from 'next/dynamic';

/**
 * `ssr: false` is only legal inside Client Components.
 * HomePageContent (RSC) imports these so below-fold chrome stays out of the critical flight
 * without breaking `next build`.
 */
export const HomeBottomNav = dynamic(
  () => import('@/components/HomeBottomNav.client').then((m) => m.HomeBottomNav),
  { ssr: false },
);

export const HomeCategoryStack = dynamic(
  () => import('@/components/HomeCategoryStack.client').then((m) => m.HomeCategoryStack),
  { ssr: false, loading: () => <div className="min-h-[11rem] md:hidden" aria-hidden /> },
);

export const HomeMyDayBanner = dynamic(
  () => import('@/components/HomeMyDayBanner.client').then((m) => m.HomeMyDayBanner),
  { ssr: false, loading: () => <div className="min-h-[9rem]" aria-hidden /> },
);

export const LuckyCityButton = dynamic(
  () => import('@/components/LuckyCityButton.client').then((m) => m.LuckyCityButton),
  { ssr: false },
);
