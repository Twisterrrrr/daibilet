import type { Metadata } from 'next';

import { resolveBlogCityHref } from '@/lib/blog-article-city';
import { stripColumnMetaPrefix } from '@/lib/blog-meta';
import type { BlogArticleDto } from '@/lib/blog-utils';
import { resolveBlogShareImage } from '@/lib/blog-og-image';
import { BLOG_LIST_OG_IMAGE, buildShareMetadata, pageTitle } from '@/lib/seo-meta';

export { publicAssetExists, resolveBlogShareImage } from '@/lib/blog-og-image';

function resolveBlogMetaDescription(article: BlogArticleDto): string {
  return (
    stripColumnMetaPrefix(article.seoDescription) ||
    stripColumnMetaPrefix(article.excerpt) ||
    article.title
  );
}

const SITE_URL = (process.env.DAIBILET_SITE_URL || 'https://daibilet.ru').replace(/\/$/, '');
const SITE_NAME = 'Дайбилет';

function absoluteUrl(pathName: string): string {
  if (/^https?:\/\//i.test(pathName)) return pathName;
  return `${SITE_URL}${pathName.startsWith('/') ? pathName : `/${pathName}`}`;
}

export function buildBlogArticleBreadcrumbs(article: BlogArticleDto): Array<{ name: string; path: string }> {
  const canonicalPath = resolveBlogArticleCanonicalPath(article);
  const cityLink = resolveBlogCityHref(article.city, article.citySlug);
  return [
    { name: 'Главная', path: '/' },
    { name: 'Блог', path: '/blog' },
    ...(article.city && cityLink ? [{ name: article.city, path: cityLink }] : []),
    { name: article.title, path: canonicalPath },
  ];
}

/**
 * Single canonical for article pages: always `/blog/{slug}`.
 * Ignores city-scoped query duplicates and non-blog canonicalPath overrides
 * that would split link equity across city mirrors.
 */
export function resolveBlogArticleCanonicalPath(article: Pick<BlogArticleDto, 'slug' | 'canonicalPath'>): string {
  const slug = String(article.slug || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  if (!slug) return '/blog';
  const raw = String(article.canonicalPath || '').trim();
  if (raw) {
    try {
      const path = raw.startsWith('http') ? new URL(raw).pathname : raw;
      const normalized = path.replace(/\/+$/, '') || '/';
      // Accept only same-slug blog paths (no /blog/city/... mirrors).
      if (normalized === `/blog/${slug}` || normalized === `/blog/${encodeURIComponent(slug)}`) {
        return `/blog/${slug}`;
      }
    } catch {
      // fall through
    }
  }
  return `/blog/${slug}`;
}

export function buildBlogArticleMetadata(article: BlogArticleDto): Metadata {
  // layout title template adds "| Дайбилет" - strip brand from seoTitle to avoid double suffix
  const title = pageTitle(article.seoTitle || article.title);
  const shareTitle = `${title} | ${SITE_NAME}`;
  const description = resolveBlogMetaDescription(article);
  const canonicalPath = resolveBlogArticleCanonicalPath(article);
  const image = resolveBlogShareImage(article.coverImageUrl, article.slug);
  const indexable = article.isIndexable !== false;
  const share = buildShareMetadata({
    title: shareTitle,
    description,
    path: canonicalPath,
    image,
    imageWidth: 1200,
    imageHeight: 630,
    type: 'article',
  });

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      ...share.openGraph,
      publishedTime: article.publishedAt || undefined,
      modifiedTime: article.publishedAt || undefined,
    },
    twitter: share.twitter,
  };
}

export function buildBlogArticleJsonLd(article: BlogArticleDto): Array<Record<string, unknown>> {
  const title = pageTitle(article.seoTitle || article.title);
  const description = resolveBlogMetaDescription(article);
  const canonicalPath = resolveBlogArticleCanonicalPath(article);
  const canonical = absoluteUrl(canonicalPath);
  const image = resolveBlogShareImage(article.coverImageUrl, article.slug);
  const breadcrumbs = buildBlogArticleBreadcrumbs(article);

  const blocks: Array<Record<string, unknown>> = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description,
      url: canonical,
      mainEntityOfPage: canonical,
      image: image ? [image] : undefined,
      datePublished: article.publishedAt || undefined,
      dateModified: article.publishedAt || undefined,
      author: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
  ];

  return blocks;
}

export function buildBlogListMetadata(): Metadata {
  const title = pageTitle('Блог - статьи и советы о событиях');
  const description =
    'Статьи по концертам, театру и городским прогулкам. Как выбрать билет, куда пойти с детьми, что смотреть на этой неделе.';

  return {
    title,
    description,
    alternates: { canonical: '/blog' },
    ...buildShareMetadata({
      title: `${title} | ${SITE_NAME}`,
      description,
      path: '/blog',
      image: BLOG_LIST_OG_IMAGE,
      imageWidth: 1200,
      imageHeight: 630,
    }),
  };
}
