/**
 * Per-city hub extras: identity tags, weather coords, indoor/outdoor CTA maps,
 * seasonal «когда ехать» copy. Keep out of cityInfo (coords/mustSee) so other
 * agents can edit geo without merge fights.
 *
 * Moscow / SPB: empty tags + no weather / whenToGo until those packs are filled.
 */

import { normalizeCityHubSlug } from './city-hub-config.ts';
import type { CityMustSeeItem, CitySuburbItem, CitySuburbPlace } from './cityInfo.ts';

export type CityIdentityTag = {
  id: string;
  /** Owner hashtag, kept recognizable. */
  hashtag: string;
  hint: string;
  /** venueSlug / locationSlug from cityInfo mustSee or suburbs (incl. nested POI). */
  slugs: string[];
  target: 'places' | 'suburbs' | 'mixed';
};

export type CityWeatherFlavor = {
  latitude: number;
  longitude: number;
  timezone: string;
  outdoorSlugs: string[];
  indoorSlugs: string[];
  outdoorCta: string;
  indoorCtaOvercast: string;
  indoorCtaRain: string;
  indoorCtaSnow: string;
};

export type CityWhenToGoSeasonId =
  | 'winter'
  | 'spring'
  | 'summer'
  | 'lateSummer'
  | 'earlyAutumn'
  | 'lateAutumn';

export type CityWhenToGoSeason = {
  id: CityWhenToGoSeasonId;
  /** Calendar months 1-12 in the city time zone. */
  months: number[];
  /** Badge: Конец лета */
  headline: string;
  /** One short paragraph under the badge. */
  body: string;
};

export type CitySeasonTabId = 'spring' | 'summer' | 'autumn' | 'winter';

export type CitySeasonTab = {
  id: CitySeasonTabId;
  label: string;
  body: string;
};

export type CityWhenToGoFlavor = {
  timeZone: string;
  seasons: CityWhenToGoSeason[];
  tabs: CitySeasonTab[];
};

export type CityWhenToGoBlurb = {
  seasonId: CityWhenToGoSeasonId;
  month: number;
  monthLabel: string;
  headline: string;
  body: string;
  tab: CitySeasonTabId;
};

export type CityIdentitySlide = {
  id: string;
  title: string;
  text: string;
  imageSrc: string;
  imageAlt: string;
  slugs: string[];
  target: 'places' | 'suburbs' | 'mixed';
};

export type CityHubLocalFlavor = {
  identityHeading?: string;
  tags: CityIdentityTag[];
  slides?: CityIdentitySlide[];
  weather?: CityWeatherFlavor;
  /** Editorial seasonality, not a daily weather forecast. */
  whenToGo?: CityWhenToGoFlavor;
};

export type CityPlaceFocus = {
  id: string;
  label: string;
  slugs: string[];
  scrollTo: 'places' | 'suburbs';
};

const PERM_WEATHER: CityWeatherFlavor = {
  latitude: 58.01,
  longitude: 56.23,
  timezone: 'Asia/Yekaterinburg',
  outdoorSlugs: [
    'naberezhnaya-kamy',
    'perm-schaste-ne-za-gorami',
    'perm-park-gorkogo',
    'perm-rayskiy-sad',
    'permskaya-esplanada',
  ],
  indoorSlugs: [
    'permskaya-galereya',
    'perm-permm',
    'perm-dom-meshkova',
    'teatr-teatr',
    'perm-permskie-posikunchiki',
    'perm-chomga',
  ],
  outdoorCta: 'Отличная погода для речной прогулки по Каме или парков',
  indoorCtaOvercast: 'Сегодня пасмурно. Посмотрите крытые музеи, Театр-Театр или рестораны',
  indoorCtaRain: 'Сегодня дождь. Посмотрите крытые музеи, Театр-Театр или рестораны',
  indoorCtaSnow: 'Сегодня снег. Посмотрите крытые музеи, Театр-Театр или рестораны',
};

const MONTH_TITLE = [
  '',
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

function tabForSeasonId(id: CityWhenToGoSeasonId): CitySeasonTabId {
  if (id === 'winter') return 'winter';
  if (id === 'spring') return 'spring';
  if (id === 'earlyAutumn' || id === 'lateAutumn') return 'autumn';
  return 'summer';
}

const PERM_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Asia/Yekaterinburg',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Горнолыжка в Губахе, заснеженная тайга, Белогорский монастырь и Кунгурская ледяная пещера. Хохловку и Усьву в мороз лучше не планировать.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'Межсезонье: слякоть и лёд на тропах. В городе - музеи и Театр-Театр. Хохловку и Усьву оставьте на июнь.',
    },
    {
      id: 'summer',
      months: [6, 7],
      headline: 'Лето',
      body: 'Лучшее окно на край: набережная, сплавы, Хохловка, Каменный город и Усьва. Речной сезон на Каме открыт.',
    },
    {
      id: 'lateSummer',
      months: [8],
      headline: 'Конец лета',
      body: 'Идеально для загородных поездок (Хохловка, Усьва), пока не начались осенние дожди. Речные прогулки ещё открыты.',
    },
    {
      id: 'earlyAutumn',
      months: [9],
      headline: 'Ранняя осень',
      body: 'Лес жёлтый, в Хохловке народу меньше. Речной сезон на Каме уже сходит - если нужен загород, едьте в этом месяце.',
    },
    {
      id: 'lateAutumn',
      months: [10, 11],
      headline: 'Поздняя осень',
      body: 'Дожди и раскисшие тропы. Время для музеев, театров и Дягилевского фестиваля, не для Усьвы.',
    },
  ],
  tabs: [
    {
      id: 'spring',
      label: 'Весна',
      body: 'В городе - музеи и Театр-Театр. Хохловку и Усьву лучше оставить на июнь: в апреле ещё слякоть.',
    },
    {
      id: 'summer',
      label: 'Лето',
      body: 'Набережная, сплавы, Хохловка, фестивали под открытым небом. Речной сезон на Каме открыт.',
    },
    {
      id: 'autumn',
      label: 'Осень',
      body: 'Время для музеев, театров и Дягилевского фестиваля. Загород с октября раскисает.',
    },
    {
      id: 'winter',
      label: 'Зима',
      body: 'Горнолыжка в Губахе, заснеженная тайга, Белогорский монастырь и Кунгурская ледяная пещера.',
    },
  ],
};

const PERM_SLIDES: CityIdentitySlide[] = [
  {
    id: 'medved',
    title: 'Культовый мишка',
    text: 'Медведь - главный символ края ещё с XVI века. Иностранцы шутят, что они ходят у нас по улицам, а мы поставили ему бронзовый памятник в центре. Здесь же зародилось древнее шаманское литьё - Пермский звериный стиль.',
    imageSrc: '/images/venues/perm/permskiy-medved.jpg',
    imageAlt: 'Памятник Пермскому медведю',
    slugs: ['perm-permskiy-medved'],
    target: 'places',
  },
  {
    id: 'bogi',
    title: 'Деревянные боги',
    text: 'Уникальное явление, которого нет больше нигде в России. В XVII веке местные мастера вырезали из дерева православных святых, наделив их чертами лиц коренных народов Урала. Смесь христианства и язычества.',
    imageSrc: '/images/venues/perm/permskaya-galereya.jpg',
    imageAlt: 'Пермская художественная галерея',
    slugs: ['permskaya-galereya', 'muzej-hohlovka'],
    target: 'mixed',
  },
  {
    id: 'posikunchiki',
    title: 'Те самые посикунчики',
    text: 'Главный гастрономический бренд Прикамья. Крошечные уральские пирожки на один укус. Фишка в сочности: когда откусываешь, они брызжут горячим бульоном - отсюда и название.',
    imageSrc: '/images/venues/perm/permskie-posikunchiki.jpg',
    imageAlt: 'Посикунчики в Перми',
    slugs: ['perm-permskie-posikunchiki', 'perm-chomga'],
    target: 'places',
  },
  {
    id: 'schaste',
    title: 'Символ новой Перми',
    text: 'Огромные красные буквы на берегу Камы у Речного вокзала. Главный фото-хит и визуальный бренд города, который знают по всей стране благодаря фильмам и сериалам.',
    imageSrc: '/images/venues/perm/schaste-ne-za-gorami.jpg',
    imageAlt: 'Инсталляция Счастье не за горами на Каме',
    slugs: [
      'perm-schaste-ne-za-gorami',
      'naberezhnaya-kamy',
      'permsky-solenye-ushi',
      'perm-permskiy-medved',
      'perm-park-kamney-permskie-vorota',
    ],
    target: 'places',
  },
];

const PERM_TAGS: CityIdentityTag[] = PERM_SLIDES.map((slide) => ({
  id: slide.id,
  hashtag: slide.title,
  hint: slide.title,
  slugs: slide.slugs,
  target: slide.target,
}));

export const CITY_HUB_LOCAL_FLAVOR: Record<string, CityHubLocalFlavor> = {
  perm: {
    identityHeading: 'Чем уникальна Пермь?',
    tags: PERM_TAGS,
    slides: PERM_SLIDES,
    weather: PERM_WEATHER,
    whenToGo: PERM_WHEN_TO_GO,
  },
  moscow: { tags: [] },
  'saint-petersburg': { tags: [] },
};

export function resolveCityLocalFlavor(slug: string | null | undefined): CityHubLocalFlavor | null {
  const normalized = normalizeCityHubSlug(slug);
  if (!normalized) return null;
  return CITY_HUB_LOCAL_FLAVOR[normalized] || null;
}

export function cityHasWeatherWidget(slug: string | null | undefined): boolean {
  return Boolean(resolveCityLocalFlavor(slug)?.weather);
}

export function cityHasWhenToGo(slug: string | null | undefined): boolean {
  return Boolean(resolveCityLocalFlavor(slug)?.whenToGo?.seasons?.length);
}

export function calendarMonthInTimeZone(timeZone: string, at: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, month: 'numeric' }).formatToParts(at);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    if (month >= 1 && month <= 12) return month;
  } catch {
    // Invalid TZ: fall through to UTC month.
  }
  return at.getUTCMonth() + 1;
}

export function pickWhenToGoSeason(
  flavor: CityWhenToGoFlavor,
  month: number,
): CityWhenToGoSeason | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return flavor.seasons.find((season) => season.months.includes(month)) || null;
}

export function resolveWhenToGoBlurb(
  slug: string | null | undefined,
  at: Date = new Date(),
): CityWhenToGoBlurb | null {
  const flavor = resolveCityLocalFlavor(slug)?.whenToGo;
  if (!flavor) return null;
  const month = calendarMonthInTimeZone(flavor.timeZone, at);
  const season = pickWhenToGoSeason(flavor, month);
  const body = season?.body?.trim();
  if (!season || !body) return null;
  return {
    seasonId: season.id,
    month,
    monthLabel: MONTH_TITLE[month] || '',
    headline: season.headline,
    body,
    tab: tabForSeasonId(season.id),
  };
}

export function cityIdentitySlides(slug: string | null | undefined): CityIdentitySlide[] {
  const slides = resolveCityLocalFlavor(slug)?.slides;
  return Array.isArray(slides) ? slides.filter((slide) => slide.slugs.length > 0) : [];
}

export function cityIdentityTags(slug: string | null | undefined): CityIdentityTag[] {
  const tags = resolveCityLocalFlavor(slug)?.tags;
  return Array.isArray(tags) ? tags.filter((tag) => tag.slugs.length > 0) : [];
}

export function placeSlugKey(
  place: Pick<CityMustSeeItem, 'venueSlug' | 'locationSlug'> | null | undefined,
): string {
  const venue = String(place?.venueSlug || '').trim().toLowerCase();
  if (venue) return venue;
  return String(place?.locationSlug || '').trim().toLowerCase();
}

export function suburbMatchesSlugs(suburb: CitySuburbItem, slugs: string[]): boolean {
  const want = new Set(slugs.map((slug) => String(slug || '').trim().toLowerCase()).filter(Boolean));
  if (!want.size) return false;
  const keys = [placeSlugKey(suburb)];
  for (const poi of suburb.places || []) {
    keys.push(placeSlugKey(poi));
  }
  return keys.some((key) => key && want.has(key));
}

function asMustSee(place: CityMustSeeItem | CitySuburbItem | CitySuburbPlace): CityMustSeeItem {
  return {
    name: place.name,
    desc: String(place.desc || ''),
    href: place.href,
    venueSlug: place.venueSlug,
    locationSlug: place.locationSlug,
    dayRouteId: 'dayRouteId' in place ? place.dayRouteId : undefined,
    latitude: place.latitude,
    longitude: place.longitude,
    address: 'address' in place ? place.address : undefined,
    transitTip: 'transitTip' in place ? place.transitTip : undefined,
  };
}

/**
 * Resolve tag/weather slugs to real cityInfo rows (mustSee, suburb root, nested POI).
 * Drops unknown slugs instead of inventing places.
 */
export function collectPlacesBySlugs(
  slugs: string[],
  mustSee: CityMustSeeItem[] = [],
  suburbs: CitySuburbItem[] = [],
): CityMustSeeItem[] {
  const ordered = slugs.map((slug) => String(slug || '').trim().toLowerCase()).filter(Boolean);
  if (!ordered.length) return [];
  const bySlug = new Map<string, CityMustSeeItem>();

  const remember = (place: CityMustSeeItem | CitySuburbItem | CitySuburbPlace) => {
    const key = placeSlugKey(place);
    if (!key || bySlug.has(key)) return;
    bySlug.set(key, asMustSee(place));
  };

  for (const place of mustSee) remember(place);
  for (const suburb of suburbs) {
    remember(suburb);
    for (const poi of suburb.places || []) remember(poi);
  }

  const out: CityMustSeeItem[] = [];
  const seen = new Set<string>();
  for (const slug of ordered) {
    const place = bySlug.get(slug);
    if (!place) continue;
    const key = placeSlugKey(place) || slug;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(place);
  }
  return out;
}

export function focusFromIdentitySlide(slide: CityIdentitySlide): CityPlaceFocus {
  return {
    id: slide.id,
    label: slide.title,
    slugs: slide.slugs,
    scrollTo: slide.target === 'suburbs' ? 'suburbs' : 'places',
  };
}

export function focusFromIdentityTag(tag: CityIdentityTag): CityPlaceFocus {
  return {
    id: tag.id,
    label: tag.hashtag,
    slugs: tag.slugs,
    scrollTo: tag.target === 'suburbs' ? 'suburbs' : 'places',
  };
}

export function focusFromWeatherCta(
  mood: 'sunny' | 'indoor',
  weather: CityWeatherFlavor,
  label: string,
): CityPlaceFocus {
  return {
    id: mood === 'sunny' ? 'weather-outdoor' : 'weather-indoor',
    label,
    slugs: mood === 'sunny' ? weather.outdoorSlugs : weather.indoorSlugs,
    scrollTo: 'places',
  };
}
