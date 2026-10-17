import { formatPublicVenueTitle, isFortressComplexName } from './venue-normalize.js';

export type PublicSearchVenueRow = {
  id: string;
  slug: string;
  title: string;
  score?: number;
  city?: string | null;
  kind?: string | null;
  imageUrl?: string | null;
};

export function searchVenueTextKey(value?: string | null): string {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isMuseumLikeSearchKind(kind?: string | null): boolean {
  const key = String(kind || '').toUpperCase();
  return key.includes('MUSEUM') || key === 'ART_SPACE';
}

const MUSEUM_LANDMARK_SEARCH_RE =
  /музей|галере|эрмитаж|кунсткамер|дворец|усадьб|крепост|цитадел|арсенал|павильон|планетар|панорам|выставочн/iu;

export function isMuseumLikeSearchVenue(kind?: string | null, title?: string | null): boolean {
  if (isMuseumLikeSearchKind(kind)) return true;
  const key = String(kind || '').toUpperCase();
  if (key !== 'ATTRACTION') return false;
  return MUSEUM_LANDMARK_SEARCH_RE.test(String(title || ''));
}

function pickPreferredSearchVenue(
  current: PublicSearchVenueRow,
  candidate: PublicSearchVenueRow,
): PublicSearchVenueRow {
  const currentMuseum = isMuseumLikeSearchVenue(current.kind, current.title);
  const candidateMuseum = isMuseumLikeSearchVenue(candidate.kind, candidate.title);
  if (currentMuseum !== candidateMuseum) {
    const fortress = isFortressComplexName(current.title) || isFortressComplexName(candidate.title);
    if (fortress || searchVenueTextKey(current.title) === searchVenueTextKey(candidate.title)) {
      return candidateMuseum ? candidate : current;
    }
  }
  return (candidate.score || 0) > (current.score || 0) ? candidate : current;
}

/** Collapse ravelin pickup + editorial fortress into one search hit. */
export function collapsePublicSearchVenueRows(rows: PublicSearchVenueRow[]): PublicSearchVenueRow[] {
  const groups = new Map<string, PublicSearchVenueRow>();
  for (const row of rows || []) {
    const title = String(formatPublicVenueTitle(row.title) || row.title || '').trim();
    const next = { ...row, title };
    const key = `${searchVenueTextKey(title)}|${searchVenueTextKey(row.city)}`;
    const prev = groups.get(key);
    groups.set(key, prev ? pickPreferredSearchVenue(prev, next) : next);
  }
  return [...groups.values()];
}
