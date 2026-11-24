import regionHubsFile from '../../../../data/geo/region-hubs.ru.json';

type CandidateHubConfig = {
  centerCity: string;
  centerSlugs?: string[];
  candidateHub?: boolean;
  heroBrief?: string;
};

const CANDIDATE_HUBS = ((regionHubsFile.regionCenters || []) as CandidateHubConfig[]).filter(
  (hub) => hub.candidateHub === true,
);

function normalizeCandidateKey(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function findCandidateHub(input: {
  slug?: string | null;
  sourceSlug?: string | null;
  name?: string | null;
}): CandidateHubConfig | null {
  const keys = new Set([input.slug, input.sourceSlug, input.name].map(normalizeCandidateKey).filter(Boolean));
  if (!keys.size) return null;

  return CANDIDATE_HUBS.find((hub) => {
    const hubKeys = [hub.centerCity, ...(hub.centerSlugs || [])].map(normalizeCandidateKey);
    return hubKeys.some((key) => keys.has(key));
  }) || null;
}

/** Candidate city hubs stay out of search until a reviewer explicitly enables indexing. */
export function isCandidateCityHub(input: {
  slug?: string | null;
  sourceSlug?: string | null;
  name?: string | null;
}): boolean {
  return Boolean(findCandidateHub(input));
}

/** Short city-specific introductory copy for the candidate city hero. */
export function candidateCityHubHeroBrief(input: {
  slug?: string | null;
  sourceSlug?: string | null;
  name?: string | null;
}): string | null {
  return findCandidateHub(input)?.heroBrief?.trim() || null;
}
