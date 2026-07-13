import {
  buildEditorsPickEvents,
  buildPopularEvents,
  createHomePickState,
  HOME_POPULAR_LIMIT,
  HOME_SHOWCASE_LIMIT,
} from '@/lib/home-showcase-sections';
import { buildHomeNowTabs } from '@/lib/home-now-section';
import { spreadCatalogSessionsByCoverImage, spreadSessionsForGrid } from '@/lib/session-cover-image';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';

type PublicSession = PublicSessionDto | PublicCatalogListItemDto;

export type BuildHomePageSectionsOptions = {
  cityName?: string | null;
};

/** Секции главной с общим dedup по id, названию и обложке. */
export function buildHomePageSections(sessions: PublicSession[], options: BuildHomePageSectionsOptions = {}) {
  const pickState = createHomePickState();

  const editorsPick = spreadCatalogSessionsByCoverImage(
    buildEditorsPickEvents(sessions, HOME_SHOWCASE_LIMIT, pickState),
  );
  const homeNowTabs = buildHomeNowTabs(sessions, { cityName: options.cityName, pickState });
  const popular = spreadSessionsForGrid(buildPopularEvents(sessions, HOME_POPULAR_LIMIT, pickState), 3);

  return { editorsPick, homeNowTabs, popular };
}
