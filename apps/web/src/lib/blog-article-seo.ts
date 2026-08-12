import { existsSync } from 'node:fs';
import path from 'node:path';

import type { Metadata } from 'next';

import { resolveBlogCityHref } from '@/lib/blog-article-city';
import { stripColumnMetaPrefix } from '@/lib/blog-meta';
import type { BlogArticleDto } from '@/lib/blog-utils';
import { BLOG_LIST_OG_IMAGE, DEFAULT_OG_IMAGE, buildShareMetadata, pageTitle } from '@/lib/seo-meta';

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

/** Local public asset check - scrapers 404 on invented *-og.jpg and drop the preview. */
export function publicAssetExists(urlPath: string): boolean {
  const rel = String(urlPath || '')
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .split(/[?#]/)[0]
    .replace(/^\/+/, '');
  if (!rel || rel.includes('..')) return false;
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'public', rel),
    path.join(cwd, 'apps', 'web', 'public', rel),
    path.join(cwd, 'apps', 'public', 'public', rel),
  ];
  return candidates.some((filePath) => existsSync(filePath));
}

/**
 * Prefer 1200x630 *-og.* next to the cover (Telegram/VK).
 * If the og file is missing on disk, fall back to the real cover URL - never emit a 404 image.
 */
export function resolveBlogShareImage(coverImageUrl?: string | null): string | undefined {
  if (!coverImageUrl) return undefined;
  const raw = coverImageUrl.trim();
  if (!raw) return undefined;
  if (/-og\.(jpe?g|png|webp)(\?|$)/i.test(raw)) return absoluteUrl(raw);
  if (/\/images\/blog\/[^?#]+\.(jpe?g|png|webp)(\?|$)/i.test(raw)) {
    const ogPath = raw.replace(/(\.(jpe?g|png|webp))(\?|$)/i, '-og$1$3');
    if (publicAssetExists(ogPath.split(/[?#]/)[0])) {
      return absoluteUrl(ogPath);
    }
    return absoluteUrl(raw);
  }
  return absoluteUrl(raw);
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
  const image = resolveBlogShareImage(article.coverImageUrl);
  const indexable = article.isIndexable !== false;
  const share = buildShareMetadata({
    title: shareTitle,
    description,
    path: canonicalPath,
    image: image || DEFAULT_OG_IMAGE,
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
  const image = resolveBlogShareImage(article.coverImageUrl) || (article.coverImageUrl ? absoluteUrl(article.coverImageUrl) : undefined);
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
