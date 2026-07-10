/** Канонические slug лендингов (как в legacy SPA). */
export const CANONICAL_LANDING_SLUGS = {
  bus: 'bus-tours',
  river: 'river-cruises',
  party: 'river-party',
  bridges: 'bridges-night',
} as const;

export const LANDING_SLUG_REDIRECTS: Record<string, string> = {
  'river-walks': CANONICAL_LANDING_SLUGS.river,
  'river-cruise': CANONICAL_LANDING_SLUGS.river,
  'bus-sightseeing': CANONICAL_LANDING_SLUGS.bus,
  'party-boat': CANONICAL_LANDING_SLUGS.party,
  'river-disco': CANONICAL_LANDING_SLUGS.party,
  'razvodnye-mosty': CANONICAL_LANDING_SLUGS.bridges,
  'spb-bridges-night': CANONICAL_LANDING_SLUGS.bridges,
  bridges_night: CANONICAL_LANDING_SLUGS.bridges,
  'night-bridges': CANONICAL_LANDING_SLUGS.bridges,
};

export function canonicalLandingSlug(slug: string): string {
  const key = String(slug || '').trim().toLowerCase().replace(/_/g, '-');
  return LANDING_SLUG_REDIRECTS[key] || key;
}

export function landingFetchCandidates(slug: string): string[] {
  const canonical = canonicalLandingSlug(slug);
  const candidates = new Set<string>([canonical]);
  const raw = String(slug || '').trim().toLowerCase();
  if (raw && raw !== canonical) candidates.add(raw);
  for (const [legacy, target] of Object.entries(LANDING_SLUG_REDIRECTS)) {
    if (target === canonical) candidates.add(legacy);
  }
  return [...candidates];
}
