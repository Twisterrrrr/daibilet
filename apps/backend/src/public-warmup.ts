import type { PublicSessionDto } from './types/public.js';

export interface PublicWarmupFlags {
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
}

export interface PublicWarmupResult {
  reason: string;
  elapsedMs: number;
  events: number;
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
    if (deps.flags.city) jobs.push(deps.buildDestinations());
    if (deps.flags.venue) jobs.push(deps.buildVenues());
    await Promise.all(jobs);
    return {
      reason,
      elapsedMs: Date.now() - startedAt,
      events: sessions.length,
      destinationsWarmed: deps.flags.city,
      venuesWarmed: deps.flags.venue,
    };
  };
}
