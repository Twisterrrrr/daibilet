import type { BlogCardDto } from '@/lib/blog-utils';
import { normalizeBlogCitySlug } from '@/lib/blog-meta';

export type CityHubArticleBucket =
  | 'about'
  | 'affiche'
  | 'sights'
  | 'practice'
  | 'more';

export type CityHubArticlesBuckets = Record<CityHubArticleBucket, BlogCardDto[]>;

const LIMITS: Record<CityHubArticleBucket, number> = {
  about: 2,
  affiche: 1,
  sights: 2,
  practice: 1,
  more: 1,
};

const CITY_ALIASES: Record<string, string[]> = {
  moscow: ['moscow', 'moskva', 'msk'],
  'saint-petersburg': ['saint-petersburg', 'sankt-peterburg', 'spb', 'petersburg'],
  kazan: ['kazan'],
  ekaterinburg: ['ekaterinburg', 'yekaterinburg'],
  'nizhny-novgorod': ['nizhny-novgorod', 'nizhniy-novgorod'],
  ufa: ['ufa'],
};

const AFFICHE_RE =
  /вечер|выходн|сегодня|скоро|дискотек|шоу|как выбрать|куда пойти|афиш/i;
const PRACTICE_RE =
  /как выбрать|не перепутать|для новичка|как не|рейс|формат|подготов|инструкц/i;
const SIGHTS_RE =
  /прогулк|двор|парадн|крыш|мост|обзорн|достопримечат|маршрут|музей|экскурс/i;

function emptyBuckets(): CityHubArticlesBuckets {
  return { about: [], affiche: [], sights: [], practice: [], more: [] };
}

function normalizeHubCitySlug(slug?: string | null, sourceSlug?: string | null, name?: string | null): string {
  const raw = normalizeBlogCitySlug(slug, name) || normalizeBlogCitySlug(sourceSlug, name) || '';
  if (raw === 'moskva' || raw === 'msk') return 'moscow';
  if (raw === 'sankt-peterburg' || raw === 'spb') return 'saint-petersburg';
  if (raw === 'nizhniy-novgorod') return 'nizhny-novgorod';
  return raw;
}

function cityMatchTokens(hubSlug: string, cityName: string): string[] {
  const tokens = new Set<string>();
  for (const alias of CITY_ALIASES[hubSlug] || [hubSlug]) {
    if (alias) tokens.add(alias.toLowerCase());
  }
  const name = cityName.trim().toLowerCase();
  if (name) {
    tokens.add(name);
    for (const part of name.split(/[\s-]+/).filter((p) => p.length >= 4)) {
      tokens.add(part);
    }
  }
  return [...tokens].filter(Boolean);
}

function articleMentionsCity(article: BlogCardDto, hubSlug: string, tokens: string[]): boolean {
  const articleSlug = normalizeBlogCitySlug(article.citySlug, article.city);
  const aliases = CITY_ALIASES[hubSlug] || [hubSlug];
  if (articleSlug && (aliases.includes(articleSlug) || articleSlug === hubSlug)) return true;

  const hay = `${article.slug} ${article.title} ${article.excerpt || ''}`.toLowerCase();
  return tokens.some((token) => token.length >= 3 && hay.includes(token));
}

function isGenericUseful(article: BlogCardDto): boolean {
  const type = String(article.articleType || '').toLowerCase();
  if (type === 'gid' || type === 'obzor') return true;
  const hay = `${article.slug} ${article.title}`.toLowerCase();
  return PRACTICE_RE.test(hay) || AFFICHE_RE.test(hay);
}

function scoreForBucket(article: BlogCardDto, bucket: CityHubArticleBucket, cityHit: boolean): number {
  const type = String(article.articleType || '').toLowerCase();
  const hay = `${article.slug} ${article.title} ${article.excerpt || ''}`;
  let score = cityHit ? 40 : 0;

  if (bucket === 'about') {
    if (type === 'obzor') score += 30;
    if (type === 'column' && cityHit) score += 25;
    if (type === 'gid' && cityHit) score += 15;
    if (!cityHit && type === 'obzor') score += 5;
  } else if (bucket === 'affiche') {
    if (AFFICHE_RE.test(hay)) score += 35;
    if (cityHit && type === 'gid') score += 15;
  } else if (bucket === 'sights') {
    if (SIGHTS_RE.test(hay)) score += 30;
    if (cityHit && type === 'gid') score += 20;
    if (cityHit) score += 10;
  } else if (bucket === 'practice') {
    if (PRACTICE_RE.test(hay)) score += 40;
    if (type === 'gid' && !cityHit) score += 10;
  } else if (bucket === 'more') {
    if (cityHit) score += 10;
    if (type === 'gid') score += 5;
  }

  return score;
}

/**
 * Подбор тизеров блога для секций city hub.
 * Одна статья — максимум в одной секции. Пустые бакеты допустимы.
 */
export function pickCityHubArticles(
  city: { slug: string; sourceSlug?: string | null; name: string },
  articles: BlogCardDto[],
): CityHubArticlesBuckets {
  const result = emptyBuckets();
  if (!articles.length) return result;

  const hubSlug = normalizeHubCitySlug(city.slug, city.sourceSlug, city.name);
  const tokens = cityMatchTokens(hubSlug, city.name);
  const cityHitBySlug = new Map<string, boolean>();

  for (const article of articles) {
    cityHitBySlug.set(article.slug, articleMentionsCity(article, hubSlug, tokens));
  }

  const cityPool = articles.filter((a) => cityHitBySlug.get(a.slug));
  const genericPool = articles.filter((a) => !cityHitBySlug.get(a.slug) && isGenericUseful(a));
  const pool = [...cityPool, ...genericPool];

  const used = new Set<string>();
  const order: CityHubArticleBucket[] = ['about', 'affiche', 'sights', 'practice', 'more'];

  for (const bucket of order) {
    const limit = LIMITS[bucket];
    const preferCity = bucket === 'about' || bucket === 'sights' || bucket === 'affiche';
    const minScore = preferCity ? 20 : 15;

    const ranked = pool
      .filter((article) => !used.has(article.slug))
      .map((article) => ({
        article,
        score: scoreForBucket(article, bucket, Boolean(cityHitBySlug.get(article.slug))),
      }))
      .filter((row) => row.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    for (const row of ranked) used.add(row.article.slug);
    result[bucket] = ranked.map((row) => row.article);
  }

  return result;
}

export function cityHubArticleBadges(article: BlogCardDto): string[] {
  const badges: string[] = [];
  const type = String(article.articleType || '').toLowerCase();
  if (type === 'obzor') badges.push('Обзор');
  else if (type === 'column') badges.push('Колонка');
  else if (type === 'digest') badges.push('Дайджест');
  else badges.push('Гид');

  const hay = `${article.slug} ${article.title} ${article.excerpt || ''}`.toLowerCase();
  if (/дет|семь|возраст/.test(hay)) badges.push('С детьми');
  else if (/вечер|ночн/.test(hay)) badges.push('На вечер');
  else if (/выходн/.test(hay)) badges.push('На выходные');
  else if (/новичок|первый/.test(hay)) badges.push('Для новичка');
  else if (/как выбрать|не перепутать/.test(hay)) badges.push('Как выбрать');

  return badges.slice(0, 2);
}

export function hasAnyCityHubArticles(buckets: CityHubArticlesBuckets | null | undefined): boolean {
  if (!buckets) return false;
  return Object.values(buckets).some((list) => list.length > 0);
}
