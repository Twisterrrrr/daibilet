import type { BlogCardDto } from './blog-utils.ts';
import { normalizeBlogCitySlug } from './blog-meta.ts';
import { resolveBlogTopics, type BlogTopicId } from './blog-topics.ts';

export type CityHubArticleBucket =
  | 'about'
  | 'affiche'
  | 'sights'
  | 'practice'
  | 'more';

export type CityHubArticlesBuckets = Record<CityHubArticleBucket, BlogCardDto[]>;

const LIMITS: Record<CityHubArticleBucket, number> = {
  about: 3,
  affiche: 1,
  sights: 3,
  practice: 1,
  more: 1,
};

/** Канонический slug хаба → алиасы (латиница + кириллица). Порт из Codex city-hub-editorial-alt. */
const CITY_ALIASES: Record<string, string[]> = {
  moscow: ['moscow', 'moskva', 'msk', 'москва', 'москов', 'москв'],
  moskva: ['moscow', 'moskva', 'msk', 'москва', 'москов', 'москв'],
  'saint-petersburg': [
    'saint-petersburg',
    'sankt-peterburg',
    'spb',
    'petersburg',
    'peterburg',
    'петербург',
    'санкт',
  ],
  'sankt-peterburg': [
    'saint-petersburg',
    'sankt-peterburg',
    'spb',
    'petersburg',
    'peterburg',
    'петербург',
    'санкт',
  ],
  spb: [
    'saint-petersburg',
    'sankt-peterburg',
    'spb',
    'petersburg',
    'peterburg',
    'петербург',
    'санкт',
  ],
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
  'ulan-ude': ['ulan-ude', 'улан-удэ', 'улан удэ'],
  chelyabinsk: ['chelyabinsk', 'челябинск'],
};

const KNOWN_CITY_ALIASES = new Set(
  Object.entries(CITY_ALIASES)
    .flatMap(([slug, aliases]) => [slug, ...aliases])
    .map(normalizeText)
    .filter((alias) => alias.length >= 4),
);

const AFFICHE_RE =
  /вечер|выходн|сегодня|завтра|скоро|дискотек|шоу|как выбрать|куда пойти|афиш|билет|событи/i;
const PRACTICE_RE =
  /как выбрать|не перепутать|для новичка|как не|рейс|формат|подготов|инструкц|как добраться|транспорт|метро|вокзал|аэропорт|совет|практик|планир/i;
const SIGHTS_RE =
  /прогулк|двор|парадн|крыш|мост|обзорн|достопримечат|маршрут|музей|экскурс|парк|места|куда сходить|что посмотреть/i;
const ABOUT_RE = /обзор|гид по городу|зачем|почему|первый раз|история|атмосфера|лучшее/i;
const MORE_RE = /подборка|площадк|район|окрестност|рядом|необычн|топ/i;

function emptyBuckets(): CityHubArticlesBuckets {
  return { about: [], affiche: [], sights: [], practice: [], more: [] };
}

function normalizeText(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHubCitySlug(slug?: string | null, sourceSlug?: string | null, name?: string | null): string {
  const raw = normalizeBlogCitySlug(slug, name) || normalizeBlogCitySlug(sourceSlug, name) || '';
  if (raw === 'moskva' || raw === 'msk') return 'moscow';
  if (raw === 'sankt-peterburg' || raw === 'spb') return 'saint-petersburg';
  if (raw === 'nizhniy-novgorod') return 'nizhny-novgorod';
  if (raw === 'velikiy-novgorod') return 'veliky-novgorod';
  return raw;
}

function cityMatchTokens(hubSlug: string, cityName: string): string[] {
  const tokens = new Set<string>();
  for (const alias of CITY_ALIASES[hubSlug] || [hubSlug]) {
    const normalized = normalizeText(alias);
    if (normalized) tokens.add(normalized);
  }
  const name = normalizeText(cityName);
  if (name) {
    tokens.add(name);
    for (const part of name.split(' ').filter((p) => p.length >= 4)) {
      tokens.add(part);
    }
  }
  return [...tokens].filter(Boolean);
}

function isBroadCityMarker(value: string): boolean {
  return /(^|\s)(multi|all|region|regions|russia|росси|регион|города|все)(\s|$)/.test(value);
}

function containsForeignCitySignal(text: string, currentAliases: Set<string>): boolean {
  for (const alias of KNOWN_CITY_ALIASES) {
    if (currentAliases.has(alias)) continue;
    if (text.includes(alias)) return true;
  }
  return false;
}

function articleMentionsCity(article: BlogCardDto, hubSlug: string, tokens: string[]): boolean {
  const aliases = CITY_ALIASES[hubSlug] || [hubSlug];
  const aliasSet = new Set(tokens);
  const articleSlug = normalizeBlogCitySlug(article.citySlug, article.city);

  // Phase 3: явный CMS citySlug — только точное совпадение (без эвристик по title).
  if (articleSlug) {
    if (isBroadCityMarker(articleSlug)) return false;
    return aliases.includes(articleSlug) || articleSlug === hubSlug;
  }

  const articleCity = normalizeText(article.city);
  if (articleCity && tokens.some((token) => token.length >= 4 && articleCity.includes(token))) {
    const hay = normalizeText(`${article.slug} ${article.title}`);
    if (containsForeignCitySignal(hay, aliasSet)) return false;
    return true;
  }

  const hay = normalizeText(`${article.slug} ${article.title} ${article.excerpt || ''}`);
  if (containsForeignCitySignal(hay, aliasSet)) return false;
  return tokens.some((token) => token.length >= 3 && hay.includes(token));
}

function isBroadUseful(article: BlogCardDto, hubTokens: string[]): boolean {
  const explicit = normalizeText(article.citySlug) || normalizeText(article.city);
  const hay = normalizeText(`${article.slug} ${article.title}`);
  if (explicit && !isBroadCityMarker(explicit)) return false;
  if (containsForeignCitySignal(hay, new Set(hubTokens))) return false;
  if (explicit && isBroadCityMarker(explicit)) return true;
  return false;
}

function isGenericUseful(article: BlogCardDto, hubTokens: string[]): boolean {
  const hay = normalizeText(`${article.slug} ${article.title}`);
  if (containsForeignCitySignal(hay, new Set(hubTokens))) return false;

  const type = String(article.articleType || '').toLowerCase();
  if (type === 'gid' || type === 'obzor') return true;
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
    if (ABOUT_RE.test(hay)) score += 20;
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
    if (type === 'column' && !cityHit) score += 8;
  } else if (bucket === 'more') {
    if (MORE_RE.test(hay)) score += 20;
    if (cityHit) score += 10;
    if (type === 'gid') score += 5;
  }

  return score;
}

function publishedTime(article: BlogCardDto): number {
  const value = article.publishedAt ? new Date(article.publishedAt).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
}

/**
 * Подбор тизеров блога для секций city hub.
 * Одна статья — максимум в одной секции. Пустые бакеты допустимы.
 * Улучшения из Codex: кириллические алиасы, отсев чужих городов, broad multi/regions.
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
  const broadBySlug = new Map<string, boolean>();

  for (const article of articles) {
    const cityHit = articleMentionsCity(article, hubSlug, tokens);
    cityHitBySlug.set(article.slug, cityHit);
    broadBySlug.set(article.slug, !cityHit && isBroadUseful(article, tokens));
  }

  const cityPool = articles.filter((a) => cityHitBySlug.get(a.slug));
  const broadPool = articles.filter((a) => broadBySlug.get(a.slug));
  const genericPool = articles.filter(
    (a) => !cityHitBySlug.get(a.slug) && !broadBySlug.get(a.slug) && isGenericUseful(a, tokens),
  );
  const pool = [...cityPool, ...broadPool, ...genericPool];

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
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return publishedTime(b.article) - publishedTime(a.article);
      })
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
  else if (type === 'column') badges.push('От автора');
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

/** Минимальный контракт сессии для mini-row (phase 2). */
export type CityHubSessionMatchInput = {
  id: string;
  title: string;
  category?: string | null;
  venue?: string | null;
  tags?: string[] | null;
  subcategories?: string[] | null;
  startsAt?: string | null;
  imageUrl?: string | null;
  priceFrom?: number | null;
};

const ARTICLE_KEYWORD_STOP = new Set([
  'куда',
  'сходить',
  'город',
  'города',
  'гиде',
  'гид',
  'обзор',
  'лучшие',
  'лучшее',
  'билеты',
  'афиша',
  'материал',
  'статьи',
  'статья',
]);

function articleKeywords(article: BlogCardDto): string[] {
  return [
    ...new Set(normalizeText(`${article.title} ${article.slug} ${article.excerpt || ''}`).split(' ')),
  ]
    .filter((word) => word.length >= 4 && !ARTICLE_KEYWORD_STOP.has(word))
    .slice(0, 10);
}

function sessionHaystack(session: CityHubSessionMatchInput): string {
  return normalizeText(
    [session.title, session.category, session.venue, ...(session.tags || []), ...(session.subcategories || [])].join(
      ' ',
    ),
  );
}

function scoreArticleSession(session: CityHubSessionMatchInput, keywords: string[]): number {
  if (!keywords.length) return 0;
  const text = sessionHaystack(session);
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
}

/** Сильные сигналы категории события - для отсева ортогональных тем. */
const SESSION_TOPIC_RE: Array<{ topic: BlogTopicId; re: RegExp }> = [
  { topic: 'standup', re: /стендап|standup|stendap|комик|open\s*mic|открыт(ый|ого)\s+микрофон|юмор/i },
  { topic: 'kids', re: /детск|для\s+детей|семь|0\+|6\+|family|kids/i },
  { topic: 'concerts', re: /концерт|джаз|jazz|музык|рок[- ]?групп/i },
  { topic: 'river', re: /речн|теплоход|прогулка\s+на\s+воде|каналы|катер|причал|водн/i },
  { topic: 'tours', re: /экскурси|обзорн|автобус|загород|квест|escape|двор|парадн|маршрут/i },
  { topic: 'routes', re: /пешеходн|самостоятельн|маршрут\s+на\s+\d/i },
];

/**
 * Вертикали, которые нельзя подмешивать «через» общий tours/routes.
 * Пример бага: автобусная статья (topic=tours) + речная «обзорная экскурсия» (river+tours)
 * проходили intersect по tours и показывали теплоходы под автобусным тизером.
 */
const EXCLUSIVE_SESSION_TOPICS: ReadonlySet<BlogTopicId> = new Set([
  'river',
  'standup',
  'concerts',
]);

/** Если статья явно про вертикаль - событие обязано нести тот же сигнал (не только «обзорная/Москва»). */
const ARTICLE_VERTICAL_REQUIREMENTS: Array<{ articleRe: RegExp; sessionRe: RegExp }> = [
  {
    articleRe: /автобус|hop[\s-]?on|двухэтажн/i,
    sessionRe: /автобус|hop[\s-]?on|hop[\s-]?off|двухэтажн|city\s*tour|yutong|сити\s*тур/i,
  },
  {
    articleRe: /речн|теплоход|ужин\s+на\s+теплоход|москв[еа]-рек|каналы/i,
    sessionRe: /речн|теплоход|катер|причал|водн|каналы|нева/i,
  },
];

function detectSessionTopics(session: CityHubSessionMatchInput): BlogTopicId[] {
  const raw = [session.title, session.category, ...(session.tags || []), ...(session.subcategories || [])]
    .filter(Boolean)
    .join(' ');
  const found = new Set<BlogTopicId>();
  for (const rule of SESSION_TOPIC_RE) {
    if (rule.re.test(raw)) found.add(rule.topic);
  }
  return [...found];
}

function articleHaystack(article: BlogCardDto): string {
  return [article.slug, article.title, article.tag, article.excerpt].filter(Boolean).join(' ');
}

function sessionMatchesArticleVertical(article: BlogCardDto, session: CityHubSessionMatchInput): boolean {
  const articleText = articleHaystack(article);
  const sessionText = [
    session.title,
    session.category,
    session.venue,
    ...(session.tags || []),
    ...(session.subcategories || []),
  ]
    .filter(Boolean)
    .join(' ');

  for (const rule of ARTICLE_VERTICAL_REQUIREMENTS) {
    if (rule.articleRe.test(articleText) && !rule.sessionRe.test(sessionText)) {
      return false;
    }
  }
  return true;
}

/**
 * Если у статьи есть явные темы и у события тоже - требуем пересечение.
 * Иначе стендап может пролезть по слабому keyword (город/«места»).
 * Exclusive-вертикали (река/стендап/концерт) не проходят «через» общий tours.
 */
function isSessionTopicCompatible(articleTopics: BlogTopicId[], session: CityHubSessionMatchInput): boolean {
  if (!articleTopics.length) return true;
  const sessionTopics = detectSessionTopics(session);
  if (!sessionTopics.length) return true;

  for (const topic of sessionTopics) {
    if (EXCLUSIVE_SESSION_TOPICS.has(topic) && !articleTopics.includes(topic)) {
      return false;
    }
  }

  return sessionTopics.some((topic) => articleTopics.includes(topic));
}

function startsAtMs(session: CityHubSessionMatchInput): number {
  const value = session.startsAt ? new Date(session.startsAt).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

/**
 * До N сессий хаба под тизер статьи: keyword + совместимость тем + вертикальный сигнал.
 * Без quality fallback: лучше пустой список, чем чужие события (стендап/река у автобусной статьи).
 * Только уже загруженные sessions города - без новых запросов.
 */
export function matchArticleSessions<T extends CityHubSessionMatchInput>(
  article: BlogCardDto,
  sessions: T[],
  limit = 3,
): T[] {
  if (!sessions.length || limit <= 0) return [];
  const keywords = articleKeywords(article);
  if (!keywords.length) return [];

  const articleTopics = resolveBlogTopics({
    slug: article.slug,
    title: article.title,
    tag: article.tag,
    excerpt: article.excerpt,
  });

  return sessions
    .map((session) => ({ session, score: scoreArticleSession(session, keywords) }))
    .filter(
      (item) =>
        item.score > 0 &&
        isSessionTopicCompatible(articleTopics, item.session) &&
        sessionMatchesArticleVertical(article, item.session),
    )
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return startsAtMs(left.session) - startsAtMs(right.session);
    })
    .slice(0, limit)
    .map((item) => item.session);
}
