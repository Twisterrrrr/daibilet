export type LandingSeoTemplate = {
  title: string;
  description: string;
  h1: string;
};

export type CityDeclension = {
  imenit: string;
  /** Full prepositional phrase, e.g. "в Калининграде". */
  predlog: string;
  rodit: string;
};

export type SeoOverrideLike = {
  customTitle?: string | null;
  customDescription?: string | null;
  customH1?: string | null;
  customText?: string | null;
} | null;

export type LandingSeoResult = {
  title: string;
  description: string;
  h1: string;
  seoText: string | null;
  source: 'override' | 'template' | 'fallback';
};

/**
 * Group C (category×city matrix) + city hub `podborki` + Group E intents.
 * Placeholders: `{in_city}` (предложный с «в»), `{city_rod}`, `{year}`.
 * Brand: Дайбилет. Hyphen `-` only. No emoji.
 */
export const SEO_TEMPLATES: Record<string, LandingSeoTemplate> = {
  // City hub marker CHPU `/podborki/c/{city}` (soft `?city=` 301 → here)
  podborki: {
    title: 'Подборки событий {in_city} - готовые идеи куда сходить | Дайбилет',
    description:
      'Тематические подборки событий {city_rod} на Дайбилет: выходные, вечер, с детьми и бюджетно. Выберите идею и перейдите к билетам без долгого поиска по афише.',
    h1: 'Подборки {in_city}: готовые идеи на вечер и выходные',
  },
  // Group C landings
  standup: {
    title: 'Стендап и юмор {in_city} {year} - афиша шоу и билеты | Дайбилет',
    description:
      'Лучшие стендап-шоу, комедийные клубы и открытые микрофоны {in_city}. Актуальная афиша, цены на билеты и бронирование онлайн.',
    h1: 'Стендап и юмор {in_city}',
  },
  excursions: {
    title: 'Лучшие экскурсии {in_city} - цены и бронирование {year} | Дайбилет',
    description:
      'Необычные, обзорные и авторские экскурсии {in_city} от местных гидов. Выбирайте маршруты и бронируйте онлайн.',
    h1: 'Экскурсии {in_city}',
  },
  'unusual-theatres': {
    title: 'Необычные театры и спектакли {in_city} - афиша | Дайбилет',
    description:
      'Подборка иммерсивных, альтернативных и необычных театров {in_city}. Расписание постановок и покупка билетов.',
    h1: 'Необычные театры {in_city}',
  },
  exhibitions: {
    title: 'Выставки и музеи {in_city} {year} - куда сходить | Дайбилет',
    description:
      'Актуальные выставки, галереи и музеи {in_city}. Подборка интересных экспозиций для всей семьи.',
    h1: 'Выставки и музеи {in_city}',
  },
  'walking-tours': {
    title: 'Пешие экскурсии и прогулки {in_city} - Дайбилет',
    description:
      'Интересные пешеходные маршруты и прогулки {in_city}. Узнайте историю города пешком с гидом.',
    h1: 'Пешие экскурсии и прогулки {in_city}',
  },
  // Stage-1 city-scoped landings (SPB)
  'bridges-night': {
    title: 'Развод мостов {in_city} - ночные прогулки и билеты | Дайбилет',
    description:
      'Ночной развод мостов {in_city}: теплоходы и катера по Неве, расписание и бронирование билетов на Дайбилет.',
    h1: 'Развод мостов {in_city}',
  },
  'spb-yards': {
    title: 'Дворы и парадные {in_city} - экскурсии и билеты | Дайбилет',
    description:
      'Экскурсии по дворам-колодцам и парадным {in_city}: мини-группы, легальный вход и билеты на Дайбилет.',
    h1: 'Дворы и парадные {in_city}',
  },
  'river-cruises': {
    title: 'Речные прогулки {in_city} - ужин и вечеринки на теплоходе | Дайбилет',
    description:
      'Речные прогулки, ужины и вечеринки на теплоходе {in_city}. Сравните рейсы и купите билеты на Дайбилет.',
    h1: 'Речные прогулки {in_city}',
  },
  // Group E intents (`/podborki/{intent}/{city}`)
  besplatno: {
    title: 'Бесплатные события {in_city} - афиша и билеты | Дайбилет',
    description:
      'Бесплатные события, музеи и экскурсии {in_city}. Актуальные даты и переход к билетам на Дайбилет.',
    h1: 'Бесплатные события {in_city}',
  },
  'na-vyhodnye': {
    title: 'Интересные события {in_city} на выходных - афиша, цены | Дайбилет',
    description:
      'Что посмотреть на выходных {in_city}: экскурсии, музеи и мероприятия. Актуальная афиша и билеты на Дайбилет.',
    h1: 'Куда сходить {in_city} на выходных',
  },
  'do-2000': {
    title: 'События до 2000 рублей {in_city} - афиша и билеты | Дайбилет',
    description:
      'Бюджетные экскурсии и мероприятия до 2000 рублей {in_city}. Сравнение цен и покупка билетов на Дайбилет.',
    h1: 'События до 2000 рублей {in_city}',
  },
  'segodnya-vecherom': {
    title: 'События сегодня вечером {in_city} - афиша и билеты | Дайбилет',
    description:
      'Куда сходить сегодня вечером {in_city}: актуальные сеансы и мероприятия. Билеты онлайн на Дайбилет.',
    h1: 'Сегодня вечером {in_city}',
  },
  skoro: {
    title: 'Скоро начинающиеся события {in_city} - афиша и билеты | Дайбилет',
    description:
      'События, которые скоро начнутся {in_city}: ближайшие сеансы с актуальным временем старта. Билеты на Дайбилет.',
    h1: 'Скоро начнётся {in_city}',
  },
};

/** Pilot declensions (SEO path slugs). Expand when opening more cities. */
export const CITY_DECLENSIONS: Record<string, CityDeclension> = {
  kaliningrad: {
    imenit: 'Калининград',
    predlog: 'в Калининграде',
    rodit: 'Калининграда',
  },
  'saint-petersburg': {
    imenit: 'Санкт-Петербург',
    predlog: 'в Санкт-Петербурге',
    rodit: 'Санкт-Петербурга',
  },
};

const FALLBACK: LandingSeoResult = {
  title: 'Подборки событий и развлечений на Дайбилет',
  description: 'Интересные подборки мероприятий, экскурсий и отдыха по городам России.',
  h1: 'Тематические подборки',
  seoText: null,
  source: 'fallback',
};

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
}

export function fillSeoTemplate(
  template: LandingSeoTemplate,
  declension: CityDeclension,
  year: number = new Date().getFullYear(),
): Omit<LandingSeoResult, 'seoText' | 'source'> {
  const replace = (raw: string) =>
    raw
      .replace(/\{in_city\}/g, declension.predlog)
      .replace(/\{city_rod\}/g, declension.rodit)
      .replace(/\{city_imenit\}/g, declension.imenit)
      .replace(/\{year\}/g, String(year));

  return {
    title: replace(template.title),
    description: replace(template.description),
    h1: replace(template.h1),
  };
}

/**
 * Priority: DB override (field-wise) → SEO_TEMPLATES → safe fallback.
 * Empty override fields fall through to template/fallback.
 */
export function getLandingSeo(input: {
  citySlug: string;
  landingSlug: string;
  dbOverride?: SeoOverrideLike;
  year?: number;
}): LandingSeoResult {
  const citySlug = String(input.citySlug || '').trim();
  const landingSlug = String(input.landingSlug || '').trim();
  const year = input.year ?? new Date().getFullYear();
  const template = SEO_TEMPLATES[landingSlug];
  const declension = CITY_DECLENSIONS[citySlug];

  const fromTemplate =
    template && declension
      ? { ...fillSeoTemplate(template, declension, year), seoText: null as string | null, source: 'template' as const }
      : null;

  const base = fromTemplate || FALLBACK;
  const override = input.dbOverride;
  if (!override) return base;

  const title = nonEmpty(override.customTitle) || base.title;
  const description = nonEmpty(override.customDescription) || base.description;
  const h1 = nonEmpty(override.customH1) || base.h1;
  const seoText = nonEmpty(override.customText);

  const usedOverride = Boolean(
    nonEmpty(override.customTitle) ||
      nonEmpty(override.customDescription) ||
      nonEmpty(override.customH1) ||
      seoText,
  );

  return {
    title,
    description,
    h1,
    seoText,
    source: usedOverride ? 'override' : base.source,
  };
}
