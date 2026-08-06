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
  excludeKeywordFields?: string[];
  requiredAnyTags?: string[];
  requiredAnyKeywords?: string[];
  requiredAnySubcategories?: string[];
  requiredAnyVenueKeywords?: string[];
  requiredKeywords?: string[];
  requiredTitleKeywordGroups?: string[][];
  requiredKeywordGroups?: string[][];
  minStartsAtHour?: number;
  includeStartsAtHourUntil?: number;
}

export interface LandingMatchCandidate {
  title?: string | null;
  category?: string | null;
  sourceCategory?: string | null;
  tags?: string[] | null;
  subcategories?: string[] | null;
  venue?: string | null;
  city?: string | null;
  destination?: string | null;
  startsAt?: string | Date | null;
  upcomingSlots?: Array<{ startsAt?: string | Date | null }> | null;
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
    slug: 'river-cruises',
    title: 'Речные прогулки',
    subtitle: 'Теплоходы, катера, реки и каналы',
    chips: ['теплоход', 'катер', 'причалы'],
    tags: ['Водные экскурсии', 'Реки и каналы', 'На теплоходе', 'Водная экскурсия', 'На катере', 'Теплоходные экскурсии', 'Речные прогулки'],
    // No bare «прогулк»: walking tours leak. Boat/pier stems only (word-start match).
    keywords: ['теплоход', 'катер', 'река', 'речн', 'канал', 'причал', 'яхт', 'корабл', 'судн', 'лодк', 'круиз', 'водн'],
    keywordScope: 'content',
    requiredAnySubcategories: ['Водные экскурсии', 'Речные прогулки'],
    // Concerts/pubs/standup are not river trips; «катер» inside «Екатеринбург» is blocked by word-start match.
    excludeKeywords: [
      'автобус',
      'пешеход',
      'парадн',
      'двор',
      'коммунал',
      'мастер-класс',
      'квест',
      'концерт',
      'вечеринк',
      'дискотек',
      'стендап',
      'stand up',
      'комеди',
      'юмор',
      'рок',
      'хит',
      'анимаци',
      'ben hall',
    ],
    excludeKeywordFields: ['title', 'category', 'sourceCategory', 'venue', 'subcategory', 'tag'],
  },
  {
    slug: 'river-party',
    title: 'Вечеринки и дискотеки на теплоходе',
    subtitle: 'DJ, живая музыка и ночные речные круизы',
    chips: ['дискотека', 'DJ', 'вечеринка', 'ночь'],
    tags: ['Дискотека', 'Живая музыка', 'Вечеринка'],
    keywords: ['дискотек', 'вечеринк', 'ди-джей', 'dj', 'музыкальн', 'круиз', 'теплоход', 'речн', 'катер', 'нева'],
    keywordScope: 'content',
    requiredTitleKeywordGroups: [
      ['дискотек', 'вечеринк', 'ди-джей', 'dj', 'концерт', 'музыкальн'],
    ],
    requiredKeywordGroups: [
      ['теплоход', 'речн', 'катер', 'корабл', 'яхт', 'причал', 'канал', 'нева', 'круиз'],
    ],
    excludeKeywords: ['автобус', 'автобусн', 'пешеход'],
    excludeKeywordFields: ['title', 'category', 'sourceCategory', 'venue', 'subcategory'],
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
    minStartsAtHour: 20,
    includeStartsAtHourUntil: 6,
  },
  {
    slug: 'new-year',
    title: 'Отмечаем Новый год',
    subtitle: 'Елки, шоу, концерты и праздничные программы',
    chips: ['декабрь', 'детям', 'шоу'],
    keywords: ['новогод', 'новый год', 'елка', 'ёлка', 'рождество'],
    requiredTitleKeywordGroups: [['новогод', 'новый год', 'елка', 'ёлка', 'рождеств']],
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
    // Moscow City Day seasonal landing (not Victory Day / salute-9-may).
    slug: 'moscow-city-day',
    title: 'День города в Москве',
    subtitle: 'Праздничные прогулки, салют и программы к Дню города',
    city: 'Москва',
    chips: ['день города', 'салют', 'теплоход'],
    keywords: [
      'день города',
      'дня города',
      'дню города',
      'днем города',
      'днём города',
      'городск',
      'салют',
      'фейерверк',
      'теплоход',
      'речн',
    ],
    keywordScope: 'content',
    requiredAnyKeywords: [
      'день города',
      'дня города',
      'дню города',
      'днем города',
      'днём города',
    ],
    // Keep Victory Day / 9 May salute on salute-9-may only.
    excludeKeywords: [
      '9 мая',
      '9.05',
      '09.05',
      '09 мая',
      'день победы',
      'дня победы',
      'дню победы',
      'днем победы',
      'днём победы',
    ],
  },
  {
    slug: 'salute-9-may',
    title: 'Салют 9 мая',
    subtitle: 'Лучшие точки обзора и экскурсии к Дню Победы',
    chips: ['9 мая', 'салют', 'праздник'],
    // Fireworks alone are not enough: City Day boat tours also sell «праздничный фейерверк».
    keywords: ['салют', 'фейерверк', 'день победы', '9 мая', 'побед'],
    requiredAnyKeywords: ['салют', 'фейерверк'],
    // Victory Day intent (date / holiday), not any urban fireworks.
    requiredKeywordGroups: [
      ['9 мая', 'день победы', 'побед', '9.05', '09.05', '09 мая'],
    ],
    keywordScope: 'content',
    excludeKeywords: [
      'новогод',
      'ёлка',
      'елка',
      'рождеств',
      'день города',
      'дня города',
      'дню города',
      'днем города',
      'днём города',
    ],
  },
  {
    slug: 'bus-tours',
    title: 'Автобусные обзорные экскурсии',
    subtitle: 'Городские маршруты и обзорные программы',
    chips: ['автобус', 'обзорная', 'город'],
    tags: [
      'Автобусные туры',
      'Автобусные экскурсии',
      'Автобусный тур',
      'Автобусная экскурсия',
      'Обзорная экскурсия',
    ],
    keywords: [
      'автобус',
      'автобусн',
      'обзорн',
      'двухэтажн',
      'сити тур',
      'city tour',
      'hop on',
      'hop-off',
      'hop off',
    ],
    // Tag / subcategory / hop-on venue = fast path; иначе автобусный + экскурсионный сигнал в content.
    requiredAnySubcategories: [
      'Автобусные туры',
      'Автобусные экскурсии',
      'Автобусный тур',
      'Автобусная экскурсия',
    ],
    requiredAnyVenueKeywords: ['туристическ', 'yutong', 'city sightseeing', 'hop on', 'hop-off', 'hop off'],
    requiredKeywordGroups: [
      ['автобус', 'автобусн', 'двухэтажн', 'yutong', 'hop on', 'hop-off', 'hop off', 'city tour', 'сити тур'],
      ['экскурс', 'обзорн', 'hop on', 'city tour', 'сити тур', 'двухэтажн'],
    ],
    excludeTags: ['Водные экскурсии', 'На теплоходе', 'На катере', 'Реки и каналы'],
    excludeKeywords: [
      'теплоход',
      'катер',
      'лодк',
      'корабл',
      'причал',
      'река',
      'канал',
      'нева',
      'мост',
      'пешеход',
      'пешком',
      'фест',
      'фестиваль',
      // Pure transfers / airport shuttles - not sightseeing.
      'трансфер',
      'transfer',
      'аэропорт',
      'такси',
    ],
    excludeKeywordFields: ['title', 'category', 'sourceCategory', 'venue', 'subcategory'],
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
  {
    slug: 'spb-yards',
    title: 'Дворы, парадные и коммуналки',
    subtitle: 'Авторские прогулки по скрытому Петербургу',
    city: 'Санкт-Петербург',
    chips: ['парадные', 'коммуналки', 'дворы'],
    tags: ['Дворы и парадные', 'Экскурсия по парадным', 'Экскурсия по коммуналкам', 'Экскурсия по дворам', 'Интерьерная'],
    requiredAnySubcategories: ['Дворы и парадные', 'Экскурсия по парадным', 'Экскурсия по коммуналкам', 'Экскурсия по дворам', 'Интерьерная'],
    excludeTags: ['Водные экскурсии', 'На теплоходе', 'На катере', 'Реки и каналы'],
    excludeKeywords: ['автобус', 'автобусн', 'теплоход', 'катер', 'речн', 'нева', 'канал', 'причал'],
    excludeKeywordFields: ['title', 'category', 'sourceCategory', 'venue', 'subcategory'],
  },
  {
    slug: 'family-kids',
    title: 'Детям и семьям',
    subtitle: 'Ёлки, цирк, шоу и анимация для детей',
    chips: ['детям', 'семья', 'цирк'],
    tags: ['Детям', 'Детская анимация', 'Шоу для детей', 'Цирк', 'Детское шоу'],
    requiredAnySubcategories: ['Детям', 'Детская анимация', 'Шоу для детей'],
    // No bare «анимац»: rock band «АнимациЯ» matched via stem. Kids keep tags/«для детей».
    keywords: ['детск', 'семейн', 'цирк', 'для детей', 'ёлк', 'елк'],
    keywordScope: 'content',
    // Band «АнимациЯ» (Кулясов); bare «анимация» would kill kids shows - use band markers + Рок.
    excludeTags: ['Рок'],
    excludeKeywords: [
      '18+',
      'stand up',
      'стендап',
      'комеди',
      'юмор',
      'кулясов',
      'animaciya',
      'гр. анимаци',
      'гр.анимаци',
      'рок',
    ],
    excludeKeywordFields: ['title', 'category', 'sourceCategory', 'tag', 'subcategory'],
  },
  {
    slug: 'concerts-genre',
    title: 'Концерты',
    subtitle: 'Рок, джаз, классика, эстрада и живые выступления',
    chips: ['рок', 'джаз', 'классика'],
    tags: ['Рок', 'Джаз', 'Классика', 'Поп', 'Эстрада', 'Металл', 'Альтернатива', 'Электронная музыка', 'Хип-хоп', 'Орган', 'Симфоническая музыка', 'Инди'],
    keywords: ['концерт', 'live', 'симфон', 'оркестр', 'филармон'],
    keywordScope: 'content',
    // Bus tours leak via music keywords (e.g. «симфония … на автобусе»); keep them on bus-tours.
    excludeTags: [
      'Юмор',
      'Stand up',
      'Комедия',
      'Импровизация',
      'TV комики',
      'Автобусные туры',
      'Автобусные экскурсии',
    ],
    excludeKeywords: ['стендап', 'stand up', 'комеди', 'юмор', 'импров', 'автобус', 'автобусн'],
    excludeKeywordFields: ['title', 'category', 'sourceCategory', 'subcategory', 'venue'],
  },
  {
    slug: 'moscow-museums',
    title: 'Музеи и выставки в Москве',
    subtitle: 'Выставки, экскурсии и творческие занятия',
    city: 'Москва',
    chips: ['музеи', 'выставки', 'творчество'],
    // city is a filter only (global matcher); requiredAny* keep museum/workshop signal.
    tags: ['Музеи', 'Мастер-класс', 'Мастер-классы', 'Выставки'],
    requiredAnySubcategories: ['Музеи', 'Мастер-класс', 'Мастер-классы', 'Выставки'],
    keywords: ['мастер-класс', 'музе', 'выставк', 'эмаль', 'галере', 'экспозиц'],
    keywordScope: 'content',
    requiredAnyKeywords: ['мастер-класс', 'музе', 'выставк', 'эмаль', 'галере', 'экспозиц'],
    excludeTags: ['Юмор', 'Stand up', 'Комедия', 'Импровизация', 'TV комики'],
    excludeKeywords: [
      'автобус',
      'автобусн',
      'теплоход',
      'речн',
      'стендап',
      'stand up',
      'stand-up',
      'standup',
      'комеди',
      'юмор',
      'open mic',
      'open-mic',
      'открытый микрофон',
      'импров',
      'клубный стендап',
    ],
    excludeKeywordFields: ['title', 'category', 'sourceCategory', 'venue', 'subcategory', 'tag'],
  },
  {
    slug: 'walking-tours',
    title: 'Пешие экскурсии',
    subtitle: 'Авторские прогулки, маршруты по районам и истории города',
    chips: ['пешком', 'гид', 'маршрут'],
    tags: [
      'Пешеходные экскурсии',
      'Пешие экскурсии',
      'Авторские экскурсии',
      'Пешеходная экскурсия',
      'Авторская экскурсия',
    ],
    keywords: ['пешеход', 'пешком', 'пешая', 'пешие', 'прогулк', 'walking', 'авторск'],
    keywordScope: 'content',
    requiredAnySubcategories: [
      'Пешеходные экскурсии',
      'Пешие экскурсии',
      'Авторские экскурсии',
      'Пешеходная экскурсия',
    ],
    excludeKeywords: ['автобус', 'теплоход', 'катер', 'речн'],
  },
  {
    slug: 'country-tours',
    title: 'Загородные экскурсии',
    subtitle: 'Маршруты из Санкт-Петербурга в пригороды и области',
    chips: ['за город', 'пригороды', 'дворцы'],
    city: 'Санкт-Петербург',
    tags: ['Загородные экскурсии', 'Экскурсии в пригороды'],
    keywords: [
      'загород',
      'пригород',
      'петергоф',
      'пушкин',
      'царск',
      'павловск',
      'кронштадт',
      'выборг',
      'гатчин',
      'ораниенбаум',
      'ломоносов',
      'стрельн',
      'репино',
      'сестрорецк',
      'шлиссельбург',
      'петергофск',
      'царское село',
    ],
    // full: топоним часто в destination/venue, не только в title (content scope режет это).
    keywordScope: 'full',
    requiredAnySubcategories: ['Загородные экскурсии', 'Экскурсии в пригороды'],
    // Экскурсионный сигнал (не только stem «экскурс») + топоним пригорода / загород.
    requiredKeywordGroups: [
      ['экскурс', 'тур', 'выезд', 'маршрут'],
      [
        'загород',
        'пригород',
        'петергоф',
        'пушкин',
        'царск',
        'павловск',
        'кронштадт',
        'выборг',
        'гатчин',
        'ораниенбаум',
        'ломоносов',
        'стрельн',
        'репино',
        'сестрорецк',
        'шлиссельбург',
        'петергофск',
        'царское село',
      ],
    ],
    excludeKeywords: ['теплоход', 'катер', 'речн', 'концерт', 'спектакл', 'стендап', 'stand up'],
  },
  {
    slug: 'exhibitions',
    title: 'Выставки и музеи',
    subtitle: 'Экспозиции, музейные маршруты и культурные события',
    chips: ['выставки', 'музеи', 'искусство'],
    tags: ['Музеи', 'Выставки', 'Искусство'],
    keywords: ['музе', 'выставк', 'экспозиц', 'галере'],
    keywordScope: 'content',
    excludeKeywords: ['теплоход', 'катер', 'речн'],
  },
  {
    slug: 'unusual-theatres',
    title: 'Необычные театры',
    subtitle: 'Иммерсивные, камерные и экспериментальные постановки',
    chips: ['иммерсивный', 'камерный', 'спектакль'],
    tags: ['Театр', 'Иммерсивный театр', 'Спектакль'],
    keywords: ['театр', 'спектакл', 'иммерсив', 'перформанс'],
    keywordScope: 'content',
  },
  {
    slug: 'excursions',
    title: 'Экскурсии',
    subtitle: 'Городские маршруты с гидом для жителей и гостей города',
    chips: ['гид', 'маршрут', 'город'],
    tags: ['Экскурсии', 'Авторские экскурсии', 'Пешеходные экскурсии'],
    keywords: ['экскурс', 'гид', 'маршрут'],
    keywordScope: 'content',
  },
  {
    slug: 'rooftops',
    title: 'Смотровые площадки и крыши',
    subtitle: 'Смотровые площадки, панорамы города и прогулки по крышам',
    chips: ['смотровые', 'панорамы', 'крыши'],
    // Национальная витрина (смотровые и крыши по городам). City-URL не lock на SPb.
    tags: ['Экскурсии по крышам', 'Крыши', 'Смотровые площадки', 'Смотровая площадка'],
    keywords: [
      'крыш',
      'руф',
      'панорам',
      'смотр',
      'москва-сити',
      'moscow city',
      'observation',
    ],
    keywordScope: 'content',
    requiredAnySubcategories: ['Экскурсии по крышам', 'Крыши', 'Смотровые площадки', 'Смотровая площадка'],
    requiredTitleKeywordGroups: [
      ['экскурс', 'прогулк', 'тур', 'посещени', 'смотр', 'площадк', 'панорам', 'сити'],
    ],
    requiredKeywordGroups: [['крыш', 'руф', 'смотр', 'москва-сити', 'moscow city']],
    excludeKeywords: [
      'теплоход',
      'катер',
      'речн',
      'концерт',
      'музыкальн',
      'вечеринк',
      'фуршет',
      'джаз',
      'стендап',
      'stand up',
      'автобус',
      'автобусн',
    ],
  },
  {
    slug: 'active-sport',
    title: 'Активный отдых и автоспорт',
    subtitle: 'Дрифт, гонки и активные развлечения',
    chips: ['дрифт', 'автоспорт', 'активный'],
    tags: ['Автоспорт', 'Дрифт', 'Активный отдых'],
    requiredAnySubcategories: ['Автоспорт', 'Дрифт', 'Активный отдых'],
    keywords: ['дрифт', 'автоспорт', 'картинг', 'гонк', 'формул'],
    keywordScope: 'content',
  },
];

/** Legacy URL aliases → canonical landing slug (single source for dto + Next). */
export const LANDING_SLUG_ALIASES: Record<string, string[]> = {
  'river-cruises': ['river-walks', 'river-cruise', 'river'],
  'river-party': ['party-boat', 'river-disco', 'boat-party'],
  'bridges-night': ['razvodnye-mosty', 'bridges', 'spb-bridges-night', 'bridges_night', 'night-bridges'],
  'bus-tours': ['bus-sightseeing', 'bus'],
  'spb-yards': ['spb-paradnye', 'yards-spb', 'dory-paradnye'],
  'family-kids': ['kids-family', 'detyam'],
  'concerts-genre': ['concerts', 'concerts-genres'],
  'moscow-museums': ['moscow-museums-workshops'],
  'moscow-city-day': ['den-goroda-moskva', 'den-goroda', 'city-day-moscow'],
  'active-sport': ['active-extreme', 'autosport'],
};

/** Seasonally off landings: keep page, hide from /podborki and promo hub. */
export const OFF_SEASON_LANDING_SLUGS = new Set<string>(['salute-9-may']);

export function resolveLandingRuleBySlug(landingSlug: string): LandingRule | undefined {
  const key = String(landingSlug || '').trim().toLowerCase().replace(/_/g, '-');
  const direct = LANDING_RULES.find((item) => item.slug === key);
  if (direct) return direct;
  return LANDING_RULES.find((item) => (LANDING_SLUG_ALIASES[item.slug] || []).includes(key));
}

export function sessionMatchesLandingSlug(
  session: { landingSlugs?: string[] | null },
  canonicalSlug: string,
): boolean {
  const slugs = new Set([canonicalSlug, ...(LANDING_SLUG_ALIASES[canonicalSlug] || [])]);
  return (session.landingSlugs || []).some((value) => slugs.has(String(value || '').toLowerCase()));
}

export function findLandingRule(slug: string): LandingRule | undefined {
  return resolveLandingRuleBySlug(slug);
}

export function matchingLandingSlugs(candidate: LandingMatchCandidate): string[] {
  return LANDING_RULES
    .filter((rule) => matchesLandingRule(candidate, rule) && matchesLandingSchedule(candidate, rule))
    .map((rule) => rule.slug);
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
  const excludeKeywordFields = rule.excludeKeywordFields?.length
    ? fullKeywordFields.filter((field) => rule.excludeKeywordFields?.includes(field.field))
    : fullKeywordFields;
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
  const excludedKeyword = firstKeywordMatch(excludeKeywordFields, rule.excludeKeywords || []);
  if (excludedKeyword) blockers.push(`исключающее слово(${excludedKeyword.field}): ${excludedKeyword.keyword}`);

  if (!blockers.length) {
    const fastMatchReasons = collectFastLandingMatchReasons(candidate, rule, tags);
    const hasVenueSignal = fastMatchReasons.some((reason) => reason.startsWith('площадка:'));
    if (fastMatchReasons.length && landingRequiredSignalsSatisfied(rule, keywordFields, hasVenueSignal)) {
      return {
        matches: true,
        reasons: uniqueValues([...reasons, ...fastMatchReasons]).slice(0, 10),
        blockers: [],
      };
    }
  }

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

  // City is only a filter (wrong city → blocker above). It must never be a sufficient
  // positive signal: otherwise any city-scoped rule without requiredAny* floods the landing.
  const hasRequiredSignal = Boolean(
    rule.requiredAnyTags ||
    rule.requiredAnyKeywords ||
    rule.requiredKeywords ||
    rule.requiredTitleKeywordGroups ||
    rule.requiredKeywordGroups,
  );
  const hasPositiveSignal = Boolean(
    tagSignals.length ||
    keywordSignals.length ||
    hasRequiredSignal ||
    rule.venue,
  );
  return {
    matches: hasPositiveSignal,
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
    { field: 'tag', value: landingKeywordTags(tags).join(' ') },
  ];
  if (scope !== 'content') {
    fields.push(
      { field: 'venue', value: candidate.venue },
      { field: 'city', value: candidate.city },
      { field: 'destination', value: candidate.destination },
      { field: 'subcategory', value: (candidate.subcategories || []).join(' ') },
    );
  }
  return fields
    .filter((item): item is { field: string; value: string } => Boolean(item.value))
    .map((item) => ({ field: item.field, text: item.value.toLowerCase() }));
}

function collectFastLandingMatchReasons(
  candidate: LandingMatchCandidate,
  rule: LandingRule,
  tags: string[],
): string[] {
  const reasons: string[] = [];
  if (rule.requiredAnySubcategories?.length) {
    const subcategories = uniqueValues([...(candidate.subcategories || []), ...tags]);
    const hit = rule.requiredAnySubcategories.find((label) => subcategories.includes(label));
    if (hit) reasons.push(`подкатегория: ${hit}`);
  }
  if (!reasons.length && rule.requiredAnyVenueKeywords?.length) {
    const venue = [candidate.venue, ...tags].filter(Boolean).join(' ').toLowerCase();
    const hit = rule.requiredAnyVenueKeywords.find((keyword) => venue.includes(keyword.toLowerCase()));
    if (hit) reasons.push(`площадка: ${hit}`);
  }
  if (!reasons.length && rule.tags?.length) {
    const hit = rule.tags.find((tag) => tags.includes(tag));
    if (hit) reasons.push(`тег: ${hit}`);
  }
  return reasons;
}

function landingKeywordTags(tags: string[]): string[] {
  return tags.filter((tag) => {
    const value = tag.trim();
    return Boolean(value) && !/^(Теплоход|Площадка):/i.test(value) &&
      !/^\d+\s*(минут|мин\.?|час|часа|часов)\s*$/i.test(value);
  });
}

function landingRequiredSignalsSatisfied(
  rule: LandingRule,
  keywordFields: KeywordField[],
  allowVenueTitleOverride = false,
): boolean {
  if (rule.requiredAnyKeywords?.length && !firstKeywordMatch(keywordFields, rule.requiredAnyKeywords)) return false;
  const titleFields = keywordFields.filter((field) => field.field === 'title');
  if (!allowVenueTitleOverride) {
    for (const group of rule.requiredTitleKeywordGroups || []) {
      if (!firstKeywordMatch(titleFields, group)) return false;
    }
  }
  for (const group of rule.requiredKeywordGroups || []) {
    if (!firstKeywordMatch(keywordFields, group)) return false;
  }
  return true;
}

function matchesLandingSchedule(candidate: LandingMatchCandidate, rule: LandingRule): boolean {
  if (rule.minStartsAtHour == null) return true;
  const startsAtValues = [
    ...(candidate.upcomingSlots || []).map((slot) => slot.startsAt),
    candidate.startsAt,
  ].filter((value): value is string | Date => Boolean(value));
  return startsAtValues.some((value) => {
    const hour = moscowHour(value);
    if (!Number.isFinite(hour)) return false;
    if (hour >= Number(rule.minStartsAtHour)) return true;
    return Number(rule.includeStartsAtHourUntil || 0) > 0 && hour < Number(rule.includeStartsAtHourUntil);
  });
}

function moscowHour(value: string | Date): number {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return Number.NaN;
  const hourPart = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date).find((part) => part.type === 'hour');
  return Number(hourPart?.value);
}

/** Stem OK (`катер`→`катера`), mid-word no (`катер` inside `екатеринбург`). */
function textHasKeywordStem(text: string, keyword: string): boolean {
  const normalized = keyword.toLowerCase();
  if (!normalized) return false;
  let from = 0;
  while (from <= text.length) {
    const idx = text.indexOf(normalized, from);
    if (idx < 0) return false;
    const before = idx === 0 ? '' : text[idx - 1];
    if (!before || !isKeywordWordChar(before)) return true;
    from = idx + 1;
  }
  return false;
}

function isKeywordWordChar(ch: string): boolean {
  return /[0-9a-zà-öø-ÿа-яё_]/i.test(ch);
}

function firstKeywordMatch(fields: KeywordField[], keywords: string[]): KeywordMatch | null {
  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase();
    const field = fields.find((item) => textHasKeywordStem(item.text, normalized));
    if (field) return { keyword, field: field.field };
  }
  return null;
}

function matchingKeywordMatches(fields: KeywordField[], keywords: string[]): KeywordMatch[] {
  const matches: KeywordMatch[] = [];
  const seen = new Set<string>();
  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase();
    const field = fields.find((item) => textHasKeywordStem(item.text, normalized));
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
