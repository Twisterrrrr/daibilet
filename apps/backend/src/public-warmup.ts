import type { PublicSessionDto } from './types/public.js';

export interface PublicWarmupFlags {
  home: boolean;
  catalog: boolean;
  city: boolean;
  event: boolean;
  venue: boolean;
}

export interface PublicWarmupDependencies {
  flags: PublicWarmupFlags;
  getCatalogSessions: () => Promise<PublicSessionDto[]>;
  buildDestinations: () => Promise<unknown>;
  buildVenues: () => Promise<unknown>;
  buildHome?: () => Promise<unknown>;
  buildHomePreview?: () => Promise<unknown>;
  buildStats?: () => Promise<unknown>;
}

export interface PublicWarmupResult {
  reason: string;
  elapsedMs: number;
  events: number;
  homeWarmed: boolean;
  destinationsWarmed: boolean;
  venuesWarmed: boolean;
}

export function createPublicReadStackWarmer(
  deps: PublicWarmupDependencies,
): (reason: string) => Promise<PublicWarmupResult | null> {
  return async (reason: string) => {
    if (!Object.values(deps.flags).some(Boolean)) return null;
    const startedAt = Date.now();
    const sessions = await deps.getCatalogSessions();
    const jobs: Promise<unknown>[] = [];
    if (deps.flags.home && deps.buildHome) jobs.push(deps.buildHome());
    else if (deps.flags.home && deps.buildStats) jobs.push(deps.buildStats());
    if (deps.flags.home && deps.buildHomePreview) jobs.push(deps.buildHomePreview());
    if (deps.flags.city) jobs.push(deps.buildDestinations());
    if (deps.flags.venue) jobs.push(deps.buildVenues());
    await Promise.all(jobs);
    return {
      reason,
      elapsedMs: Date.now() - startedAt,
      events: sessions.length,
      homeWarmed: deps.flags.home,
      destinationsWarmed: deps.flags.city,
      venuesWarmed: deps.flags.venue,
    };
  };
}
