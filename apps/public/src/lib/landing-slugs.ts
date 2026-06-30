/** Канонические slug лендингов (как в Lovable: /bus-tours, /river-cruises). */
export const CANONICAL_LANDING_SLUGS = {
  bus: 'bus-tours',
  river: 'river-cruises',
  party: 'river-party',
  bridges: 'bridges-night',
} as const;

/** Старые URL → канонический slug (301 на уровне клиента). */
export const LANDING_SLUG_REDIRECTS: Record<string, string> = {
  'river-walks': CANONICAL_LANDING_SLUGS.river,
  'river-cruise': CANONICAL_LANDING_SLUGS.river,
  'bus-sightseeing': CANONICAL_LANDING_SLUGS.bus,
  'party-boat': CANONICAL_LANDING_SLUGS.party,
  'river-disco': CANONICAL_LANDING_SLUGS.party,
  'razvodnye-mosty': CANONICAL_LANDING_SLUGS.bridges,
  'spb-bridges-night': CANONICAL_LANDING_SLUGS.bridges,
};

export function canonicalLandingSlug(slug: string): string {
  const key = String(slug || '').trim().toLowerCase();
  return LANDING_SLUG_REDIRECTS[key] || key;
}

export function isRiverCruisesLandingSlug(slug: string): boolean {
  const key = canonicalLandingSlug(slug);
  return key === CANONICAL_LANDING_SLUGS.river || ['river', 'river-walks', 'river-cruise'].includes(key);
}

export function isRiverPartyLandingSlug(slug: string): boolean {
  const key = canonicalLandingSlug(slug);
  return key === CANONICAL_LANDING_SLUGS.party || ['party-boat', 'river-disco', 'boat-party'].includes(key);
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

export function landingSlugVariants(slug: string): string[] {
  const canonical = canonicalLandingSlug(slug);
  const variants = new Set<string>([canonical, slug.toLowerCase()]);
  for (const [legacy, target] of Object.entries(LANDING_SLUG_REDIRECTS)) {
    if (target === canonical) variants.add(legacy);
  }
  if (isRiverCruisesLandingSlug(canonical)) {
    ['river', 'river-walks', 'river-cruise'].forEach((item) => variants.add(item));
  }
  if (canonical.includes('bus')) {
    ['bus', 'bus-sightseeing'].forEach((item) => variants.add(item));
  }
  return [...variants];
}

export function busLandingHref(citySlug?: string) {
  const root = `/landings/${CANONICAL_LANDING_SLUGS.bus}`;
  return citySlug ? `${root}/${citySlug}` : root;
}

export function riverLandingHref(citySlug?: string) {
  const root = `/landings/${CANONICAL_LANDING_SLUGS.river}`;
  return citySlug ? `${root}/${citySlug}` : root;
}

export function partyLandingHref(citySlug?: string) {
  const root = `/landings/${CANONICAL_LANDING_SLUGS.party}`;
  return citySlug ? `${root}/${citySlug}` : root;
}

/** Публичный URL тематической подборки (как в legacy PromoBlock.href → /landings/...). */
export function landingPageHref(slug: string): string {
  return `/landings/${canonicalLandingSlug(slug)}`;
}
