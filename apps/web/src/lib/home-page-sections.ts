import {
  buildEditorsPickEvents,
  buildPopularEvents,
  createHomePickState,
  HOME_POPULAR_LIMIT,
  HOME_SHOWCASE_LIMIT,
} from '@/lib/home-showcase-sections';
import { buildHomeNowTabs } from '@/lib/home-now-section';
import { spreadCatalogSessionsByCoverImage, spreadSessionsForGrid } from '@/lib/session-cover-image';
import { resolveCoverContentFingerprints } from '@/server/cover-image-fingerprint';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';

type PublicSession = PublicSessionDto | PublicCatalogListItemDto;

export type BuildHomePageSectionsOptions = {
  cityName?: string | null;
  /** Skip remote HEAD fingerprinting (tests). */
  skipFingerprints?: boolean;
  fingerprints?: Map<string, string>;
};

/** Секции главной с общим dedup по id, названию, обложке (URL+ETag) и combo-family. */
export async function buildHomePageSections(
  sessions: PublicSession[],
  options: BuildHomePageSectionsOptions = {},
) {
  const fingerprints =
    options.fingerprints ??
    (options.skipFingerprints
      ? new Map<string, string>()
      : await resolveCoverContentFingerprints(sessions.map((session) => session.imageUrl)));

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
