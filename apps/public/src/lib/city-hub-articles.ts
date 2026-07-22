import type { PublicArticle } from '@/types';

export type CityHubArticleSection = 'about' | 'affiche' | 'sights' | 'practice' | 'more';

export type CityHubArticleMap = Record<CityHubArticleSection, PublicArticle[]>;

const SECTION_LIMITS: Record<CityHubArticleSection, number> = {
  about: 2,
  affiche: 1,
  sights: 2,
  practice: 1,
  more: 1,
};

const SECTION_ORDER: CityHubArticleSection[] = ['about', 'affiche', 'sights', 'practice', 'more'];

const CITY_ALIASES: Record<string, string[]> = {
  moscow: ['moscow', 'moskva', 'msk', 'москва', 'москов'],
  moskva: ['moscow', 'moskva', 'msk', 'москва', 'москов'],
  'sankt-peterburg': ['sankt-peterburg', 'saint-petersburg', 'spb', 'peterburg', 'петербург', 'санкт'],
  'saint-petersburg': ['sankt-peterburg', 'saint-petersburg', 'spb', 'peterburg', 'петербург', 'санкт'],
  spb: ['sankt-peterburg', 'saint-petersburg', 'spb', 'peterburg', 'петербург', 'санкт'],
  kazan: ['kazan', 'казань', 'казан'],
  kaliningrad: ['kaliningrad', 'калининград'],
  'nizhny-novgorod': ['nizhny-novgorod', 'nizhniy-novgorod', 'нижний', 'новгород'],
  'nizhniy-novgorod': ['nizhny-novgorod', 'nizhniy-novgorod', 'нижний', 'новгород'],
  'veliky-novgorod': ['veliky-novgorod', 'velikiy-novgorod', 'великий', 'новгород'],
  'velikiy-novgorod': ['veliky-novgorod', 'velikiy-novgorod', 'великий', 'новгород'],
  krasnodar: ['krasnodar', 'краснодар'],
  krasnoyarsk: ['krasnoyarsk', 'красноярск'],
  yaroslavl: ['yaroslavl', 'ярославль', 'ярослав'],
  vladimir: ['vladimir', 'владимир'],
  ekaterinburg: ['ekaterinburg', 'yekaterinburg', 'екатеринбург'],
  novosibirsk: ['novosibirsk', 'новосибирск'],
  tula: ['tula', 'тула', 'туль'],
  samara: ['samara', 'самара', 'самар'],
  omsk: ['omsk', 'омск'],
  ufa: ['ufa', 'уфа'],
  tver: ['tver', 'тверь', 'твер'],
  tyumen: ['tyumen', 'тюмень', 'тюмен'],
  voronezh: ['voronezh', 'воронеж'],
  'rostov-na-donu': ['rostov-na-donu', 'rostov-on-don', 'ростов'],
  vladivostok: ['vladivostok', 'владивосток'],
  vologda: ['vologda', 'вологда', 'вологод'],
  irkutsk: ['irkutsk', 'иркутск'],
  perm: ['perm', 'пермь', 'перм'],
  saratov: ['saratov', 'саратов'],
  'ulan-ude': ['ulan-ude', 'улан-удэ'],
  chelyabinsk: ['chelyabinsk', 'челябинск'],
};

const KNOWN_CITY_ALIASES = new Set(
  Object.entries(CITY_ALIASES)
    .flatMap(([slug, aliases]) => [slug, ...aliases])
    .map(normalize)
    .filter((alias) => alias.length >= 4),
);

const SECTION_KEYWORDS: Record<CityHubArticleSection, string[]> = {
  about: ['обзор', 'гид по городу', 'зачем', 'почему', 'первый раз', 'история', 'атмосфера', 'лучшее'],
  affiche: ['афиша', 'вечер', 'выходные', 'сегодня', 'завтра', 'куда пойти', 'как выбрать', 'билеты', 'события'],
  sights: ['достопримеч', 'что посмотреть', 'куда сходить', 'маршрут', 'места', 'музей', 'прогул', 'парк'],
  practice: ['как добраться', 'транспорт', 'метро', 'вокзал', 'аэропорт', 'советы', 'практика', 'планировать'],
  more: ['подборка', 'площадки', 'районы', 'окрестности', 'рядом', 'необычн', 'топ'],
};

const ARTICLE_TYPE_SECTION: Record<string, CityHubArticleSection> = {
  obzor: 'about',
  gid: 'sights',
  column: 'practice',
};

export function pickCityHubArticles(
  citySlug: string | null | undefined,
  cityName: string | null | undefined,
  articles: PublicArticle[] = [],
): CityHubArticleMap {
  const result = emptyArticleMap();
  const aliases = cityAliases(citySlug, cityName);

  const assignments = articles
    .map((article, index) => {
      const cityScore = scoreCityMatch(article, aliases);
      const sectionScores = scoreSections(article);
      const effectiveCityScore = cityScore || scoreBroadCityFallback(article, aliases, sectionScores);
      if (effectiveCityScore <= 0) return null;

      return SECTION_ORDER.map((section) => ({
        article,
        section,
        index,
        score: effectiveCityScore * 10 + sectionScores[section],
      }));
    })
    .filter((item): item is Array<{ article: PublicArticle; section: CityHubArticleSection; index: number; score: number }> => Boolean(item))
    .flat()
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const dateDiff = publishedTime(right.article) - publishedTime(left.article);
      if (dateDiff) return dateDiff;
      return left.index - right.index;
    });

  const used = new Set<string>();
  for (const assignment of assignments) {
    if (used.has(assignment.article.slug)) continue;
    if (result[assignment.section].length >= SECTION_LIMITS[assignment.section]) continue;
    result[assignment.section].push(assignment.article);
    used.add(assignment.article.slug);
  }

  return result;
}

function emptyArticleMap(): CityHubArticleMap {
  return {
    about: [],
    affiche: [],
    sights: [],
    practice: [],
    more: [],
  };
}

function cityAliases(citySlug: string | null | undefined, cityName: string | null | undefined): string[] {
  const base = new Set<string>();
  for (const value of [citySlug, cityName, slugify(cityName)]) {
    const normalized = normalize(value);
    if (normalized) base.add(normalized);
  }

  for (const value of [...base]) {
    const aliasKey = value.replace(/\s+/g, '-');
    for (const alias of CITY_ALIASES[value] || CITY_ALIASES[aliasKey] || []) base.add(normalize(alias));
  }

  for (const word of normalize(cityName).split(' ')) {
    if (word.length >= 4) base.add(word);
  }

  return [...base].filter(Boolean);
}

function scoreCityMatch(article: PublicArticle, aliases: string[]): number {
  const articleCitySlug = normalize(article.citySlug);
  if (articleCitySlug && aliases.includes(articleCitySlug)) return 8;

  const slug = normalize(article.slug);
  if (aliases.some((alias) => slug === alias || slug.startsWith(`${alias} `) || slug.includes(` ${alias} `))) return 6;

  const city = normalize(article.city);
  if (city && aliases.some((alias) => city.includes(alias))) return 5;

  const title = normalize(article.title);
  if (aliases.some((alias) => alias.length >= 4 && title.includes(alias))) return 4;

  return 0;
}

function scoreBroadCityFallback(
  article: PublicArticle,
  aliases: string[],
  sectionScores: Record<CityHubArticleSection, number>,
): number {
  const explicitCity = normalize(article.citySlug) || normalize(article.city);
  const text = normalize(`${article.slug} ${article.title}`);

  if (explicitCity && !isBroadCityMarker(explicitCity)) return 0;
  if (containsForeignCitySignal(text, aliases)) return 0;

  const maxSectionScore = Math.max(...Object.values(sectionScores));
  if (explicitCity && isBroadCityMarker(explicitCity) && maxSectionScore >= 4) return 2;
  return 0;
}

function isBroadCityMarker(value: string): boolean {
  return /(^|\s)(multi|all|region|regions|russia|росси|регион|регионы|города|все)(\s|$)/.test(value);
}

function containsForeignCitySignal(text: string, currentAliases: string[]): boolean {
  const current = new Set(currentAliases);
  for (const alias of KNOWN_CITY_ALIASES) {
    if (current.has(alias)) continue;
    if (text.includes(alias)) return true;
  }
  return false;
}

function scoreSections(article: PublicArticle): Record<CityHubArticleSection, number> {
  const text = normalize(`${article.title} ${article.slug} ${article.excerpt || ''}`);
  const scores: Record<CityHubArticleSection, number> = {
    about: 1,
    affiche: 0,
    sights: 0,
    practice: 0,
    more: 0,
  };

  const typeSection = ARTICLE_TYPE_SECTION[normalize(article.articleType)];
  if (typeSection) scores[typeSection] += 5;

  for (const section of SECTION_ORDER) {
    for (const keyword of SECTION_KEYWORDS[section]) {
      if (text.includes(normalize(keyword))) scores[section] += 3;
    }
  }

  if (text.includes('куда') && text.includes('сходить')) scores.sights += 4;
  if (text.includes('вечер') || text.includes('выходн')) scores.affiche += 4;
  if (text.includes('как') && (text.includes('выбрать') || text.includes('добраться'))) scores.practice += 4;

  return scores;
}

function publishedTime(article: PublicArticle): number {
  const value = article.publishedAt ? new Date(article.publishedAt).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
}

function normalize(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value?: string | null): string {
  const letters: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'c',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => letters[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
