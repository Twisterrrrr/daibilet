import {
  buildEditorsPickEvents,
  buildPopularEvents,
  createHomePickState,
  HOME_POPULAR_LIMIT,
  HOME_SHOWCASE_LIMIT,
} from '@/lib/home-showcase-sections';
import { buildHomeNowTabs, type HomeNowTab } from '@/lib/home-now-section';
import {
  sessionHasCoverImage,
  spreadCatalogSessionsByCoverImage,
  spreadSessionsForGrid,
} from '@/lib/session-cover-image';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';

type PublicSession = PublicSessionDto | PublicCatalogListItemDto;

export type BuildHomePageSectionsOptions = {
  cityName?: string | null;
  /** Skip remote HEAD fingerprinting (tests). */
  skipFingerprints?: boolean;
  fingerprints?: Map<string, string>;
};

/** Sync builder - safe on client when fingerprints already resolved. */
export function buildHomePageSectionsSync(
  sessions: PublicSession[],
  options: BuildHomePageSectionsOptions = {},
) {
  const fingerprints = options.fingerprints ?? new Map<string, string>();
  const pickState = createHomePickState({ fingerprints });

  const editorsPick = spreadCatalogSessionsByCoverImage(
    buildEditorsPickEvents(sessions, HOME_SHOWCASE_LIMIT, pickState),
    fingerprints,
  );
  const homeNowTabs = buildHomeNowTabs(sessions, { cityName: options.cityName, pickState });
  const popular = spreadSessionsForGrid(
    buildPopularEvents(sessions, HOME_POPULAR_LIMIT, pickState),
    3,
    fingerprints,
  );

  return { editorsPick, homeNowTabs, popular };
}

/**
 * Merge «Куда сходить» + «Популярное»: one photo carousel; seed empty tabs from popular covers.
 * Runs on the server so the client island only gets the final tabs.
 */
export function mergeHomeNowTabsForSsr(
  homeNowTabs: HomeNowTab[],
  popular: PublicSession[],
  sparseCatalog: boolean,
): HomeNowTab[] {
  const coverPopular = popular.filter((session) => sessionHasCoverImage(session));
  if (!homeNowTabs.length && coverPopular.length) {
    return [
      {
        key: 'nearest' as const,
        label: 'Сейчас',
        title: sparseCatalog ? 'Рекомендуем начать с этого' : 'Популярно на этой неделе',
        subtitle: sparseCatalog
          ? 'Сильные предложения из текущего каталога'
          : 'События с фото и ближайшими датами',
        events: coverPopular,
        catalogQuery: { sort: 'popular' },
        usedFallback: true,
      },
    ];
  }
  return homeNowTabs
    .map((tab) => ({
      ...tab,
      events: tab.events.filter((session) => sessionHasCoverImage(session)),
    }))
    .filter((tab) => tab.events.length > 0);
}
