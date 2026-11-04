'use client';

import dynamic from 'next/dynamic';

/**
 * Components below the fold - load only after the critical hero flight.
 * `ssr: false` keeps them out of RSC HTML; the RSC shell still renders static
 * <a> links for SEO/crawlers inside `HomePageBody`.
 */
export const HomeCityAwareSectionsDynamic = dynamic(
  () =>
    import('@/components/HomeCityAwareSections.client').then(
      (m) => m.HomeCityAwareSections,
    ),
  { ssr: false, loading: () => <div className="min-h-[24rem]" aria-hidden /> },
);

export const HomeCategoryStackDynamic = dynamic(
  () =>
    import('@/components/HomeCategoryStack.client').then(
      (m) => m.HomeCategoryStack,
    ),
  { ssr: false, loading: () => <div className="min-h-[6rem]" aria-hidden /> },
);

export const HomePopularCitiesRailDynamic = dynamic(
  () =>
    import('@/components/HomePopularCitiesRail.client').then(
      (m) => m.HomePopularCitiesRail,
    ),
  { ssr: false, loading: () => <div className="min-h-[20rem]" aria-hidden /> },
);
