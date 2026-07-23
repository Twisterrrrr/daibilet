import { BLOG_ARTICLE_BODIES } from '@/data/blog-article-bodies';
import { BLOG_POSTS } from '@/data/blog-posts';
import { blogCoverUrl } from '@/lib/blog-cover';
import {
  authorLabel,
  normalizeBlogCitySlug,
  resolveSlugBlogMeta,
} from '@/lib/blog-meta';

export type BlogCardDto = {
  slug: string;
  title: string;
  excerpt: string;
  city?: string | null;
  citySlug?: string | null;
  coverImageUrl: string;
  publishedAt?: string | null;
  readMin: number;
  tag: string;
  authorId?: string | null;
  authorName?: string | null;
  articleType?: string | null;
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

/** Longer listing excerpt: short frontmatter + lead, capped for ~5-6 lines. */
export function expandListingExcerpt(slug: string, excerpt: string, maxChars = 420): string {
  const base = String(excerpt || '').trim();
  const lead = plainLeadFromBody(slug);
  if (!lead) return base;

  const baseKey = base.slice(0, 48).toLowerCase();
  const leadHasBase = Boolean(baseKey) && lead.toLowerCase().includes(baseKey);
  const combined = !base ? lead : leadHasBase ? lead : `${base} ${lead}`;
  if (combined.length <= maxChars) return combined;

  const sliced = combined.slice(0, maxChars).replace(/\s+\S*$/, '').trim();
  return sliced || base || lead.slice(0, maxChars);
}

/** Split expanded lead into two paragraphs for large magazine cards (text below chips). */
export function expandLargeListingCopy(
  slug: string,
  excerpt: string,
  maxChars = 760,
): { primary: string; secondary: string } {
  const full = expandListingExcerpt(slug, excerpt, maxChars).trim();
  if (!full) return { primary: '', secondary: '' };
  if (full.length < 280) return { primary: full, secondary: '' };

  const mid = Math.floor(full.length * 0.42);
  const from = Math.max(100, mid - 90);
  const to = Math.min(full.length - 60, mid + 140);
  const window = full.slice(from, to);
  const sentenceEnd = window.search(/[.!?][\s\u00a0]+/);
  let splitAt: number;
  if (sentenceEnd >= 0) {
    splitAt = from + sentenceEnd + 1;
  } else {
    const space = full.indexOf(' ', mid);
    splitAt = space > 0 ? space : mid;
  }

  const primary = full.slice(0, splitAt).trim();
  const secondary = full.slice(splitAt).trim();
  return { primary, secondary };
}

function enrichCardFields(slug: string, partial: Partial<BlogCardDto>): Pick<
  BlogCardDto,
  'city' | 'citySlug' | 'authorId' | 'authorName' | 'articleType' | 'tag'
> {
  const meta = resolveSlugBlogMeta(slug);
  const authorId = partial.authorId || meta.authorId;
  const articleType = partial.articleType || meta.articleType;
  const citySlug =
    normalizeBlogCitySlug(partial.citySlug, partial.city, meta.citySlug) || meta.citySlug;
  const city = partial.city || meta.city || null;
  const tag =
    partial.tag ||
    (articleType === 'column'
      ? 'Колонка'
      : articleType === 'obzor'
        ? 'Обзор'
        : articleType === 'digest'
          ? 'Дайджест'
          : city
            ? 'Город'
            : 'Гид');

  return {
    city,
    citySlug,
    authorId,
    authorName: partial.authorName || authorLabel(authorId),
    articleType,
    tag,
  };
}

export function staticBlogCards(): BlogCardDto[] {
  return BLOG_POSTS.map((post) => {
    const enriched = enrichCardFields(post.slug, {
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
      readMin: post.readMin,
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
  }> | null,
): BlogCardDto[] {
  if (!apiArticles?.length) return staticBlogCards();

  return apiArticles.map((article) => {
    const staticPost = BLOG_POSTS.find((item) => item.slug === article.slug);
    const enriched = enrichCardFields(article.slug, {
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
      excerpt: article.excerpt || staticPost?.excerpt || '',
      coverImageUrl: article.coverImageUrl || blogCoverUrl(article.slug),
      publishedAt: article.publishedAt,
      readMin: estimateReadMin(article.excerpt || article.title),
      ...enriched,
    };
  });
}

export function resolveStaticArticle(slug: string): BlogArticleDto | null {
  const post = BLOG_POSTS.find((item) => item.slug === slug);
  if (!post) return null;
  const body = BLOG_ARTICLE_BODIES[post.slug];
  const enriched = enrichCardFields(post.slug, {
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
    seoDescription: post.excerpt,
    canonicalPath: `/blog/${post.slug}`,
    isIndexable: true,
  };
}

export function formatBlogPublishedAt(value?: string | null, fallback = ''): string {
  if (!value) return fallback;
  try {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  } catch {
    return fallback;
  }
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
