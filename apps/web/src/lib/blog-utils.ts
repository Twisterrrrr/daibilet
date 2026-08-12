import { BLOG_ARTICLE_BODIES } from '@/data/blog-article-bodies';
import { BLOG_POSTS } from '@/data/blog-posts';
import { blogCoverUrl } from '@/lib/blog-cover';
import { resolveBlogPrimaryLandingSlug } from '@/lib/blog-listing-links';
import {
  authorLabel,
  normalizeBlogCitySlug,
  resolveSlugBlogMeta,
  stripColumnMetaPrefix,
} from '@/lib/blog-meta';
import { resolveBlogTopics, type BlogTopicId } from '@/lib/blog-topics';

export type BlogCardDto = {
  slug: string;
  title: string;
  excerpt: string;
  city?: string | null;
  citySlug?: string | null;
  coverImageUrl: string;
  publishedAt?: string | null;
  /** Дата редакции для карточек, если publishedAt пустой (из static frontmatter). */
  editorialDate?: string | null;
  readMin: number;
  tag: string;
  authorId?: string | null;
  authorName?: string | null;
  articleType?: string | null;
  topics?: BlogTopicId[];
  /** Нижний регистр: title + excerpt + tag + slug + фрагмент body для поиска на `/blog`. */
  searchText?: string;
  /** Админский флаг Blog Hero (isFeatured). */
  isFeatured?: boolean;
};

export type BlogArticleDto = {
  slug: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  coverImageUrl?: string | null;
  city?: string | null;
  citySlug?: string | null;
  publishedAt?: string | null;
  isIndexable?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  articleType?: string | null;
};

export function estimateReadMin(text?: string | null): number {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 180));
}

/** Plain lead from static body for listing teaser (large cards need a full paragraph). */
function plainLeadFromBody(slug: string): string {
  const body = BLOG_ARTICLE_BODIES[slug];
  if (!body) return '';
  return body
    .replace(/\[image[^\]]*\]/gi, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+.+$/gm, ' ')
    .replace(/^\|.*$/gm, ' ')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/`+/g, '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 40 && !/^авторская колонка/i.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBlogPlainText(text: string): string {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split on real sentence ends (`.?!…` before space or EOL), not `?` inside «…». */
function splitIntoSentences(text: string): string[] {
  const value = normalizeBlogPlainText(text);
  if (!value) return [];

  const parts = value
    .split(/(?<=[.!?…])(?=\s+|$)/u)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  return parts.length ? parts : [value];
}

function lastSentenceEndBefore(text: string, maxChars: number): number {
  const window = text.slice(0, maxChars);
  let last = -1;
  const re = /[.!?…](?=\s+|$)/gu;
  let match: RegExpExecArray | null;
  while ((match = re.exec(window)) !== null) {
    last = match.index + 1;
  }
  return last;
}

/** Ensure teaser copy ends with a real sentence terminator (owner: «и точка»). */
function ensureSentenceTerminator(text: string): string {
  const value = text.trim();
  if (!value) return '';
  if (/[.!?…]$/u.test(value)) return value;
  return `${value}.`;
}

/**
 * Clip at sentence boundary: up to `maxSentences` full sentences within `maxChars`.
 * Always finishes a sentence - never mid-phrase / word-clip. Soft `maxChars`:
 * the first sentence is kept whole even when longer than the budget.
 */
export function truncateAtSentence(
  text: string,
  maxChars: number,
  maxSentences = 2,
): string {
  return clipAtSentenceBoundary(text, maxChars, maxSentences);
}

/** Alias for listing/card excerpt clipping at sentence boundaries. */
export function clipAtSentenceBoundary(
  text: string,
  maxChars: number,
  maxSentences = 2,
): string {
  const value = normalizeBlogPlainText(text);
  if (!value) return '';

  const sentences = splitIntoSentences(value);
  let picked = '';
  let count = 0;

  for (const sentence of sentences) {
    if (maxSentences > 0 && count >= maxSentences) break;
    const candidate = picked ? `${picked} ${sentence}` : sentence;
    if (!picked) {
      // First sentence always in full - never cut mid-thought for card teasers.
      picked = sentence;
      count = 1;
      if (picked.length > maxChars) break;
      continue;
    }
    if (candidate.length <= maxChars) {
      picked = candidate;
      count += 1;
      continue;
    }
    break;
  }

  if (!picked) {
    const endAt = lastSentenceEndBefore(value, Math.max(maxChars, value.length));
    picked = endAt > 0 ? value.slice(0, endAt).trim() : value;
  }

  return ensureSentenceTerminator(picked);
}

/**
 * Soft clip for listing titles: whole words only, never mid-word.
 * Prefer showing the full title in UI; this is a safety net for extreme lengths.
 */
export function truncateAtWord(text: string, maxChars: number): string {
  const value = normalizeBlogPlainText(text);
  if (!value) return '';
  if (value.length <= maxChars) return value;

  const hard = value.slice(0, maxChars);
  const atWord = hard.replace(/\s+\S*$/u, '').trim();
  if (atWord.length >= Math.floor(maxChars * 0.5)) return atWord;

  const lastSpace = hard.lastIndexOf(' ');
  return lastSpace > 0 ? hard.slice(0, lastSpace).trim() : hard.trim();
}

/** Titles: return full string when possible; word-safe clip only for extreme overflow. */
export function clipBlogCardTitle(text: string, maxChars = 240): string {
  return truncateAtWord(text, maxChars);
}

/** Card excerpt: 1-2 complete sentences ending with `.` / `!` / `?`. Soft char budget. */
export function clipBlogCardExcerpt(text: string, maxChars = 280): string {
  return truncateAtSentence(text, maxChars, 2);
}

/** Featured hero lead: 2-3 full sentences from body or excerpt. */
export function clipBlogFeaturedLead(
  slug: string,
  excerpt: string,
  maxSentences = 3,
  maxChars = 520,
): string {
  const lead = plainLeadFromBody(slug) || stripColumnMetaPrefix(excerpt);
  return truncateAtSentence(lead, maxChars, maxSentences);
}

/**
 * Listing teaser: excerpt only (never mash with body lead).
 * Body lead is a fallback when frontmatter excerpt is empty.
 */
export function expandListingExcerpt(slug: string, excerpt: string, maxChars = 420): string {
  const base = stripColumnMetaPrefix(excerpt);
  if (base) return truncateAtSentence(base, maxChars, 2);
  const lead = plainLeadFromBody(slug);
  return lead ? truncateAtSentence(lead, maxChars, 2) : '';
}

/**
 * Large / featured cards: body preview OR excerpt, never concatenated.
 * Prefer body lead to fill magazine space; fall back to clean excerpt.
 */
export function expandLargeListingCopy(
  slug: string,
  excerpt: string,
  maxChars = 900,
): { primary: string; secondary: string } {
  const lead = plainLeadFromBody(slug);
  const base = stripColumnMetaPrefix(excerpt);
  const source = normalizeBlogPlainText(lead || base);
  if (!source) return { primary: '', secondary: '' };

  const sentences = splitIntoSentences(source);
  if (sentences.length <= 2) {
    return { primary: truncateAtSentence(source, maxChars, 2), secondary: '' };
  }

  const primary = truncateAtSentence(sentences.slice(0, 2).join(' '), maxChars, 2);
  const rest = source.slice(primary.length).trim();
  const secondary = rest ? truncateAtSentence(rest, Math.floor(maxChars * 0.55), 2) : '';
  return { primary, secondary };
}

function buildSearchText(input: {
  slug: string;
  title: string;
  excerpt?: string | null;
  tag?: string | null;
  city?: string | null;
}): string {
  const body = plainLeadFromBody(input.slug).slice(0, 900);
  return [input.slug, input.title, input.excerpt, input.tag, input.city, body]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function enrichCardFields(slug: string, partial: Partial<BlogCardDto>): Pick<
  BlogCardDto,
  'city' | 'citySlug' | 'authorId' | 'authorName' | 'articleType' | 'tag' | 'topics'
> {
  const meta = resolveSlugBlogMeta(slug);
  const authorId = partial.authorId || meta.authorId;
  const articleType = partial.articleType || meta.articleType;
  const citySlug =
    normalizeBlogCitySlug(partial.citySlug, partial.city, meta.citySlug) || meta.citySlug;
  const partialCity = String(partial.city || '').trim();
  const metaCity = String(meta.city || '').trim();
  const genericCityLabels = new Set(['', 'Без города', 'Несколько городов']);
  const city =
    (partialCity && !genericCityLabels.has(partialCity) ? partialCity : null) ||
    metaCity ||
    partialCity ||
    null;
  const tag =
    partial.tag ||
    (articleType === 'column'
      ? 'От автора'
      : articleType === 'obzor'
        ? 'Обзор'
        : articleType === 'digest'
          ? 'Дайджест'
          : city
            ? 'Город'
            : 'Гид');
  const landingSlug = resolveBlogPrimaryLandingSlug(
    slug,
    String(partial.title || ''),
    tag,
    citySlug,
  );
  const topics = resolveBlogTopics({
    slug,
    title: partial.title,
    tag,
    excerpt: partial.excerpt,
    landingSlug,
  });

  return {
    city,
    citySlug,
    authorId,
    authorName: partial.authorName || authorLabel(authorId),
    articleType,
    tag,
    topics,
  };
}

export function staticBlogCards(): BlogCardDto[] {
  return BLOG_POSTS.map((post) => {
    const enriched = enrichCardFields(post.slug, {
      title: post.title,
      excerpt: post.excerpt,
      city: post.city,
      citySlug: post.citySlug,
      authorId: post.authorId,
      authorName: post.authorName,
      articleType: post.articleType,
      tag: post.tag,
    });
    return {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      coverImageUrl: post.imageUrl,
      publishedAt: null,
      editorialDate: post.date || null,
      readMin: post.readMin,
      searchText: buildSearchText({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        tag: enriched.tag,
        city: enriched.city,
      }),
      ...enriched,
    };
  });
}

export function mergeBlogCards(
  apiArticles?: Array<{
    slug: string;
    title: string;
    excerpt?: string | null;
    city?: string | null;
    citySlug?: string | null;
    coverImageUrl?: string | null;
    publishedAt?: string | null;
    authorId?: string | null;
    authorName?: string | null;
    articleType?: string | null;
    isFeatured?: boolean | null;
  }> | null,
): BlogCardDto[] {
  if (!apiArticles?.length) return staticBlogCards();

  return apiArticles.map((article) => {
    const staticPost = BLOG_POSTS.find((item) => item.slug === article.slug);
    const excerpt = article.excerpt || staticPost?.excerpt || '';
    const enriched = enrichCardFields(article.slug, {
      title: article.title,
      excerpt,
      city: article.city ?? staticPost?.city,
      citySlug: article.citySlug ?? staticPost?.citySlug,
      authorId: article.authorId ?? staticPost?.authorId,
      authorName: article.authorName ?? staticPost?.authorName,
      articleType: article.articleType ?? staticPost?.articleType,
      tag: staticPost?.tag,
    });
    return {
      slug: article.slug,
      title: article.title,
      excerpt,
      coverImageUrl: article.coverImageUrl || blogCoverUrl(article.slug),
      publishedAt: article.publishedAt,
      editorialDate: staticPost?.date || null,
      readMin: estimateReadMin(article.excerpt || article.title),
      searchText: buildSearchText({
        slug: article.slug,
        title: article.title,
        excerpt,
        tag: enriched.tag,
        city: enriched.city,
      }),
      isFeatured: article.isFeatured === true,
      ...enriched,
    };
  });
}

/**
 * Series titles like «Топ-100 мест Петербурга. Часть 1: …» /
 * «Больше чем ТОП-100. Часть 4: …» → intentional hero line break after the period.
 * Plain title string stays intact for SEO, cards, and OG.
 */
const BLOG_SERIES_PART_BREAK = /^(.+\.)\s+(Часть\s+\d+:[\s\S]*)$/u;

export function splitBlogSeriesHeroTitle(
  title: string,
): { lead: string; rest: string } | null {
  const trimmed = String(title || '').trim();
  if (!trimmed) return null;
  const match = trimmed.match(BLOG_SERIES_PART_BREAK);
  if (!match?.[1] || !match[2]) return null;
  return { lead: match[1], rest: match[2] };
}

/**
 * Hero / feed split for `/blog`:
 * - featured = isFeatured, else latest (first in list)
 * - feed = everything except featured (no duplicate in magazine first slot)
 * - hot = next 3 for «Свежее» sidebar
 */
export function splitBlogListingHero(
  posts: BlogCardDto[],
  hotLimit = 3,
): {
  featured: BlogCardDto | null;
  feed: BlogCardDto[];
  hot: BlogCardDto[];
} {
  if (!posts.length) return { featured: null, feed: [], hot: [] };

  const flagged = posts.find((post) => post.isFeatured);
  const featured = flagged || posts[0] || null;
  if (!featured) return { featured: null, feed: [], hot: [] };

  const feed = posts.filter((post) => post.slug !== featured.slug);
  const limit = Math.max(1, Math.min(hotLimit, 3));
  return {
    featured,
    feed,
    hot: feed.slice(0, limit),
  };
}

export function resolveStaticArticle(slug: string): BlogArticleDto | null {
  const post = BLOG_POSTS.find((item) => item.slug === slug);
  if (!post) return null;
  const body = BLOG_ARTICLE_BODIES[post.slug];
  const enriched = enrichCardFields(post.slug, {
    title: post.title,
    excerpt: post.excerpt,
    city: post.city,
    citySlug: post.citySlug,
    authorId: post.authorId,
    authorName: post.authorName,
    articleType: post.articleType,
    tag: post.tag,
  });
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: body || post.excerpt,
    coverImageUrl: post.imageUrl,
    city: enriched.city,
    citySlug: enriched.citySlug,
    authorId: enriched.authorId,
    authorName: enriched.authorName,
    articleType: enriched.articleType,
    seoTitle: `${post.title} | Блог Дайбилет`,
    seoDescription: stripColumnMetaPrefix(post.excerpt),
    canonicalPath: `/blog/${post.slug}`,
    isIndexable: true,
  };
}

export function formatBlogPublishedAt(value?: string | null, fallback = ''): string {
  const fb = String(fallback || '').trim();
  if (!value) return fb;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fb;
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  } catch {
    return fb;
  }
}

/** Дата на карточке: publishedAt → editorialDate (static) → ''. */
export function resolveBlogCardDateLabel(post: Pick<BlogCardDto, 'publishedAt' | 'editorialDate' | 'slug'>): string {
  const staticDate = BLOG_POSTS.find((item) => item.slug === post.slug)?.date || '';
  return formatBlogPublishedAt(post.publishedAt, post.editorialDate || staticDate || '');
}

/** Похожие статьи для сайдбара: город → автор → тип → остальные. */
export function pickRelatedBlogCards(
  current: Pick<BlogArticleDto, 'slug' | 'citySlug' | 'authorId' | 'articleType'>,
  posts: BlogCardDto[],
  limit = 5,
): BlogCardDto[] {
  const others = posts.filter((post) => post.slug && post.slug !== current.slug);
  if (!others.length || limit <= 0) return [];

  const city = String(current.citySlug || '').trim().toLowerCase();
  const author = String(current.authorId || '').trim().toLowerCase();
  const type = String(current.articleType || '').trim().toLowerCase();

  const score = (post: BlogCardDto): number => {
    let value = 0;
    if (city && String(post.citySlug || '').toLowerCase() === city) value += 100;
    if (author && String(post.authorId || '').toLowerCase() === author) value += 40;
    if (type && String(post.articleType || '').toLowerCase() === type) value += 20;
    return value;
  };

  return [...others]
    .sort((a, b) => {
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      const ta = Date.parse(String(a.publishedAt || '')) || 0;
      const tb = Date.parse(String(b.publishedAt || '')) || 0;
      if (tb !== ta) return tb - ta;
      return a.title.localeCompare(b.title, 'ru');
    })
    .slice(0, limit);
}
