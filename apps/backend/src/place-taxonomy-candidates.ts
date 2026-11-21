export interface PlaceTaxonomyCandidate {
  placeType: 'ENTERTAINMENT';
  placeSubtype: 'circus' | 'cinema' | 'planetarium' | 'aquarium' | 'water_park' | 'zoo' | 'quest' | 'observation_deck' | 'amusement_park';
  variant: 'attraction' | 'park';
  reason: string;
}

const RULES: Array<{ subtype: PlaceTaxonomyCandidate['placeSubtype']; re: RegExp; reason: string }> = [
  { subtype: 'planetarium', re: /(^|[^\p{L}])планетари\p{L}*/u, reason: 'title_planetarium' },
  { subtype: 'aquarium', re: /(^|[^\p{L}])(?:океанариум|аквариум)\p{L}*/u, reason: 'title_aquarium' },
  { subtype: 'water_park', re: /(^|[^\p{L}])аквапарк\p{L}*/u, reason: 'title_water_park' },
  { subtype: 'circus', re: /(^|[^\p{L}])цирк\p{L}*/u, reason: 'title_circus' },
  { subtype: 'cinema', re: /(^|[^\p{L}])(?:кинотеатр|кинозал)\p{L}*/u, reason: 'title_cinema' },
  { subtype: 'zoo', re: /(^|[^\p{L}])(?:зоопарк|зоосад|зооферм\p{L}*)/u, reason: 'title_zoo' },
  { subtype: 'quest', re: /(^|[^\p{L}])квест\p{L}*/u, reason: 'title_quest' },
  { subtype: 'observation_deck', re: /(^|[^\p{L}])смотров\p{L}*\s+(?:площадк\p{L}*|башн\p{L}*)/u, reason: 'title_observation_deck' },
  { subtype: 'amusement_park', re: /(^|[^\p{L}])(?:парк аттракционов|лунапарк|луна-парк)\p{L}*/u, reason: 'title_amusement_park' },
];

/** Heuristic only proposes a candidate. It never writes venue taxonomy. */
export function suggestPlaceTaxonomyCandidate(input: {
  title?: string | null;
  placeType?: string | null;
  placeSubtype?: string | null;
}): PlaceTaxonomyCandidate | null {
  const title = String(input.title || '').toLocaleLowerCase('ru').replace(/ё/g, 'е');
  const match = RULES.find((rule) => rule.re.test(title));
  if (!match) return null;
  if (String(input.placeType || '').toUpperCase() === 'ENTERTAINMENT' && String(input.placeSubtype || '').toLowerCase() === match.subtype) {
    return null;
  }
  return {
    placeType: 'ENTERTAINMENT',
    placeSubtype: match.subtype,
    variant: match.subtype === 'amusement_park' ? 'park' : 'attraction',
    reason: match.reason,
  };
}
