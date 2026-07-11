import { BLOG_POSTS } from '@/data/blog-posts';
import { blogCoverUrl } from '@/lib/blog-cover';

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
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
};

export function estimateReadMin(text?: string | null): number {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 180));
}

export function staticBlogCards(): BlogCardDto[] {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    city: post.city,
    citySlug: post.citySlug,
    coverImageUrl: post.imageUrl,
    publishedAt: null,
    readMin: post.readMin,
    tag: post.tag,
  }));
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
  }> | null,
): BlogCardDto[] {
  if (!apiArticles?.length) return staticBlogCards();

  return apiArticles.map((article) => {
    const staticPost = BLOG_POSTS.find((item) => item.slug === article.slug);
    return {
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt || staticPost?.excerpt || '',
      city: article.city,
      citySlug: article.citySlug,
      coverImageUrl: article.coverImageUrl || blogCoverUrl(article.slug),
      publishedAt: article.publishedAt,
      readMin: estimateReadMin(article.excerpt || article.title),
      tag: staticPost?.tag || (article.city ? 'Город' : 'Гид'),
    };
  });
}

export function resolveStaticArticle(slug: string): BlogArticleDto | null {
  const post = BLOG_POSTS.find((item) => item.slug === slug);
  if (!post) return null;
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.excerpt,
    coverImageUrl: post.imageUrl,
    city: post.city,
    citySlug: post.citySlug,
    seoTitle: `${post.title} | Блог Дайбилет`,
    seoDescription: post.excerpt,
    canonicalPath: `/blog/${post.slug}`,
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
