import { resolveCoverContentFingerprints } from '@/server/cover-image-fingerprint';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';

import {
  buildHomePageSectionsSync,
  type BuildHomePageSectionsOptions,
} from '@/lib/home-page-sections-sync';

export type { BuildHomePageSectionsOptions } from '@/lib/home-page-sections-sync';
export { buildHomePageSectionsSync } from '@/lib/home-page-sections-sync';

type PublicSession = PublicSessionDto | PublicCatalogListItemDto;

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

  return buildHomePageSectionsSync(sessions, { ...options, fingerprints });
}
