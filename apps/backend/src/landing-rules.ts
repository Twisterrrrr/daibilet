export type LandingKeywordScope = 'full' | 'content';

export interface LandingRule {
  slug: string;
  title: string;
  subtitle: string;
  chips: string[];
  city?: string;
  venue?: string;
  tags?: string[];
  keywords?: string[];
  keywordScope?: LandingKeywordScope;
  excludeTags?: string[];
  excludeKeywords?: string[];
  requiredAnyTags?: string[];
  requiredAnyKeywords?: string[];
  requiredKeywords?: string[];
  requiredTitleKeywordGroups?: string[][];
  requiredKeywordGroups?: string[][];
}

export interface LandingMatchCandidate {
  title?: string | null;
  category?: string | null;
  sourceCategory?: string | null;
  tags?: string[] | null;
  venue?: string | null;
  city?: string | null;
  destination?: string | null;
}

export interface LandingMatchExplanation {
  matches: boolean;
  reasons: string[];
  blockers: string[];
}

interface KeywordField {
  field: string;
  text: string;
}

interface KeywordMatch {
  keyword: string;
  field: string;
}

export const LANDING_RULES: LandingRule[] = [
  {
    slug: 'river-walks',
    title: 'Речные прогулки',
    subtitle: 'Теплоходы, катера, реки и каналы',
    chips: ['теплоход', 'катер', 'причалы'],
    tags: ['Водные экскурсии', 'Реки и каналы', 'На теплоходе', 'Водная экскурсия', 'На катере', 'Теплоходные экскурсии'],
    keywords: ['теплоход', 'катер', 'река', 'канал', 'причал'],
    keywordScope: 'content',
    excludeKeywords: ['автобус', 'пешеход', 'парадн', 'двор', 'коммунал', 'мастер-класс', 'квест', 'концерт', 'вечеринк', 'дискотек'],
  },
  {
    slug: 'bridges-night',
    title: 'Разводные мосты',
    subtitle: 'Ночные прогулки по Неве и каналам',
    chips: ['ночные', 'мосты', 'теплоход'],
    city: 'Санкт-Петербург',
    tags: ['Разводные мосты', 'Ночные'],
    keywords: ['мост', 'развод', 'ночн', 'нева', 'теплоход', 'катер'],
    keywordScope: 'content',
    requiredAnyKeywords: ['мост', 'развод'],
    excludeKeywords: ['автобус', 'пешеход', 'парадн', 'двор', 'коммунал'],
  },
  {
    slug: 'new-year',
    title: 'Отмечаем Новый год',
    subtitle: 'Елки, шоу, концерты и праздничные программы',
    chips: ['декабрь', 'детям', 'шоу'],
    keywords: ['новогод', 'новый год', 'елка', 'ёлка', 'рождество'],
  },
  {
    slug: 'moscow-dinner-boat',
    title: 'Ужин на теплоходе в Москве',
    subtitle: 'Вечерние речные программы с ужином',
    city: 'Москва',
    chips: ['ужин', 'Москва-река', 'вечер'],
    tags: ['На теплоходе', 'Водная экскурсия'],
    keywords: ['ужин', 'обед', 'ланч', 'бранч', 'завтрак', 'фуршет', 'банкет', 'ресторан', 'теплоход', 'москва-река', 'речн', 'корабл', 'яхт', 'судн'],
    keywordScope: 'content',
    requiredTitleKeywordGroups: [
      ['ужин', 'обед', 'ланч', 'бранч', 'завтрак', 'фуршет', 'банкет', 'ресторан'],
    ],
    requiredKeywordGroups: [
      ['теплоход', 'москва-река', 'речн', 'корабл', 'яхт', 'судн'],
    ],
    excludeKeywords: ['автобус', 'пешеход', 'мастер-класс'],
  },
  {
    slug: 'bus-sightseeing',
    title: 'Автобусные обзорные экскурсии',
    subtitle: 'Городские маршруты и обзорные программы',
    chips: ['автобус', 'обзорная', 'город'],
    keywords: ['автобус', 'автобусн', 'обзорн', 'сити тур', 'city tour'],
    requiredTitleKeywordGroups: [
      ['обзорн', 'экскурс', 'двухэтажн', 'hop on', 'city tour', 'сити тур'],
    ],
    requiredKeywordGroups: [
      ['автобус', 'автобусн', 'двухэтажн', 'hop on', 'city tour', 'сити тур'],
      ['обзорн', 'экскурс', 'hop on', 'city tour', 'сити тур'],
    ],
    excludeTags: ['Водные экскурсии', 'На теплоходе', 'На катере', 'Реки и каналы'],
    excludeKeywords: ['теплоход', 'катер', 'лодк', 'корабл', 'причал', 'река', 'канал', 'нева', 'мост', 'пешеход', 'пешком', 'фест', 'фестиваль'],
  },
  {
    slug: 'standup',
    title: 'Стендап и юмор',
    subtitle: 'Комедийные шоу в барах и клубах',
    chips: ['stand up', 'юмор', 'вечер'],
    tags: ['Юмор', 'Stand up', 'Комедия', 'Импровизация'],
    keywords: ['стендап', 'stand up', 'юмор', 'комеди'],
  },
  {
    slug: 'planetarium',
    title: 'Планетарий 1',
    subtitle: 'Мультимедийные шоу и концерты',
    chips: ['шоу', 'концерты', 'СПб'],
    venue: 'Планетарий 1',
  },
];

export function findLandingRule(slug: string): LandingRule | undefined {
  return LANDING_RULES.find((rule) => rule.slug === slug);
}

export function matchingLandingSlugs(candidate: LandingMatchCandidate): string[] {
  return LANDING_RULES.filter((rule) => matchesLandingRule(candidate, rule)).map((rule) => rule.slug);
}

export function matchesLandingRule(candidate: LandingMatchCandidate, rule: LandingRule): boolean {
  return explainLandingRuleMatch(candidate, rule).matches;
}

export function explainLandingRuleMatch(
  candidate: LandingMatchCandidate,
  rule: LandingRule,
): LandingMatchExplanation {
  const tags = candidate.tags || [];
  const keywordFields = keywordFieldsForCandidate(candidate, tags, rule.keywordScope || 'full');
  const fullKeywordFields = keywordFieldsForCandidate(candidate, tags, 'full');
  const reasons: string[] = [];
  const blockers: string[] = [];

  if (rule.city) {
    if (matchesRuleCity(candidate, rule.city)) reasons.push(`город: ${rule.city}`);
    else blockers.push(`другой город: ${candidate.city || candidate.destination || 'не указан'}`);
  }
  if (rule.venue) {
    if (candidate.venue === rule.venue) reasons.push(`площадка: ${rule.venue}`);
    else blockers.push(`другая площадка: ${candidate.venue || 'не указана'}`);
  }

  const excludedTag = rule.excludeTags?.find((tag) => tags.includes(tag));
  if (excludedTag) blockers.push(`исключающий тег: ${excludedTag}`);
  const excludedKeyword = firstKeywordMatch(fullKeywordFields, rule.excludeKeywords || []);
  if (excludedKeyword) blockers.push(`исключающее слово(${excludedKeyword.field}): ${excludedKeyword.keyword}`);

  const requiredAnyTag = rule.requiredAnyTags?.find((tag) => tags.includes(tag));
  if (rule.requiredAnyTags?.length) {
    if (requiredAnyTag) reasons.push(`обязательный тег: ${requiredAnyTag}`);
    else blockers.push(`нет обязательного тега: ${rule.requiredAnyTags.join(' / ')}`);
  }

  const requiredAnyKeyword = firstKeywordMatch(keywordFields, rule.requiredAnyKeywords || []);
  if (rule.requiredAnyKeywords?.length) {
    if (requiredAnyKeyword) reasons.push(`обязательное слово(${requiredAnyKeyword.field}): ${requiredAnyKeyword.keyword}`);
    else blockers.push(`нет обязательного слова: ${rule.requiredAnyKeywords.join(' / ')}`);
  }

  for (const keyword of rule.requiredKeywords || []) {
    const found = firstKeywordMatch(keywordFields, [keyword]);
    if (found) reasons.push(`обязательное слово(${found.field}): ${keyword}`);
    else blockers.push(`нет обязательного слова: ${keyword}`);
  }

  const titleKeywordFields = keywordFields.filter((field) => field.field === 'title');
  for (const group of rule.requiredTitleKeywordGroups || []) {
    const found = firstKeywordMatch(titleKeywordFields, group);
    if (found) reasons.push(`группа(title): ${found.keyword}`);
    else blockers.push(`нет слова в названии: ${group.join(' / ')}`);
  }

  for (const group of rule.requiredKeywordGroups || []) {
    const found = firstKeywordMatch(keywordFields, group);
    if (found) reasons.push(`группа(${found.field}): ${found.keyword}`);
    else blockers.push(`нет слова из группы: ${group.join(' / ')}`);
  }

  if (blockers.length) {
    return {
      matches: false,
      reasons: uniqueValues(reasons).slice(0, 10),
      blockers: uniqueValues(blockers).slice(0, 10),
    };
  }

  const tagSignals = (rule.tags || []).filter((tag) => tags.includes(tag));
  const keywordSignals = matchingKeywordMatches(keywordFields, rule.keywords || []);
  for (const tag of tagSignals.slice(0, 4)) reasons.push(`тег: ${tag}`);
  for (const match of keywordSignals.slice(0, 4)) reasons.push(`слово(${match.field}): ${match.keyword}`);

  const hasRequiredSignal = Boolean(
    rule.requiredAnyTags ||
    rule.requiredAnyKeywords ||
    rule.requiredKeywords ||
    rule.requiredTitleKeywordGroups ||
    rule.requiredKeywordGroups,
  );
  return {
    matches: Boolean(tagSignals.length || keywordSignals.length || hasRequiredSignal || rule.city || rule.venue),
    reasons: uniqueValues(reasons).slice(0, 10),
    blockers: [],
  };
}

function matchesRuleCity(candidate: LandingMatchCandidate, expectedCity: string): boolean {
  const candidates = [candidate.city, candidate.destination]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  return candidates.includes(expectedCity.toLowerCase());
}

function keywordFieldsForCandidate(
  candidate: LandingMatchCandidate,
  tags: string[],
  scope: LandingKeywordScope,
): KeywordField[] {
  const fields: Array<{ field: string; value: string | null | undefined }> = [
    { field: 'title', value: candidate.title },
    { field: 'category', value: candidate.category },
    { field: 'sourceCategory', value: candidate.sourceCategory },
    { field: 'tag', value: tags.join(' ') },
  ];
  if (scope !== 'content') {
    fields.push(
      { field: 'venue', value: candidate.venue },
      { field: 'city', value: candidate.city },
      { field: 'destination', value: candidate.destination },
    );
  }
  return fields
    .filter((item): item is { field: string; value: string } => Boolean(item.value))
    .map((item) => ({ field: item.field, text: item.value.toLowerCase() }));
}

function firstKeywordMatch(fields: KeywordField[], keywords: string[]): KeywordMatch | null {
  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase();
    const field = fields.find((item) => item.text.includes(normalized));
    if (field) return { keyword, field: field.field };
  }
  return null;
}

function matchingKeywordMatches(fields: KeywordField[], keywords: string[]): KeywordMatch[] {
  const matches: KeywordMatch[] = [];
  const seen = new Set<string>();
  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase();
    const field = fields.find((item) => item.text.includes(normalized));
    if (!field) continue;
    const key = `${field.field}:${keyword}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({ keyword, field: field.field });
  }
  return matches;
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
