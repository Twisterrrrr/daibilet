import type { Metadata } from 'next';

import { resolveBlogCityHref } from '@/lib/blog-article-city';
import type { BlogArticleDto } from '@/lib/blog-utils';
import { pageTitle } from '@/lib/seo-meta';

const SITE_URL = (process.env.DAIBILET_SITE_URL || 'https://daibilet.ru').replace(/\/$/, '');
const SITE_NAME = 'Дайбилет';

function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Для шаринга: 1200x630 *-og.* рядом с обложкой блога (Telegram/VK капризны к progressive и «не тому» кадру). */
function resolveBlogShareImage(coverImageUrl?: string | null): string | undefined {
  if (!coverImageUrl) return undefined;
  const raw = coverImageUrl.trim();
  if (!raw) return undefined;
  if (/-og\.(jpe?g|png|webp)(\?|$)/i.test(raw)) return absoluteUrl(raw);
  if (/\/images\/blog\/[^?#]+\.(jpe?g|png|webp)(\?|$)/i.test(raw)) {
    return absoluteUrl(raw.replace(/(\.(jpe?g|png|webp))(\?|$)/i, '-og$1$3'));
  }
  return absoluteUrl(raw);
}

export function buildBlogArticleBreadcrumbs(article: BlogArticleDto): Array<{ name: string; path: string }> {
  const canonicalPath = article.canonicalPath || `/blog/${article.slug}`;
  const cityLink = resolveBlogCityHref(article.city, article.citySlug);
  return [
    { name: 'Главная', path: '/' },
    { name: 'Блог', path: '/blog' },
    ...(article.city && cityLink ? [{ name: article.city, path: cityLink }] : []),
    { name: article.title, path: canonicalPath },
  ];
}

export function buildBlogArticleMetadata(article: BlogArticleDto): Metadata {
  // layout title template adds "| Дайбилет" - strip brand from seoTitle to avoid double suffix
  const title = pageTitle(article.seoTitle || article.title);
  const shareTitle = `${title} | ${SITE_NAME}`;
  const description = article.seoDescription || article.excerpt || article.title;
  const canonicalPath = article.canonicalPath || `/blog/${article.slug}`;
  const canonical = absoluteUrl(canonicalPath);
  const image = resolveBlogShareImage(article.coverImageUrl);
  const indexable = article.isIndexable !== false;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: 'article',
      locale: 'ru_RU',
      siteName: SITE_NAME,
      url: canonical,
      title: shareTitle,
      description,
      publishedTime: article.publishedAt || undefined,
      modifiedTime: article.publishedAt || undefined,
      images: image
        ? [
            {
              url: image,
              secureUrl: image,
              width: 1200,
              height: 630,
              alt: article.title,
              type: 'image/jpeg',
            },
          ]
        : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: shareTitle,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function buildBlogArticleJsonLd(article: BlogArticleDto): Array<Record<string, unknown>> {
  const title = pageTitle(article.seoTitle || article.title);
  const description = article.seoDescription || article.excerpt || article.title;
  const canonicalPath = article.canonicalPath || `/blog/${article.slug}`;
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
  const canonical = `${SITE_URL}/blog`;
  const title = pageTitle('Блог - гайды и советы о событиях');
  const description =
    'Гайды по концертам, театру и городским прогулкам. Как выбрать билет, куда пойти с детьми, что смотреть на этой неделе.';

  return {
    title,
    description,
    alternates: { canonical: '/blog' },
    openGraph: {
      type: 'website',
      locale: 'ru_RU',
      siteName: SITE_NAME,
      url: canonical,
      title: `${title} | ${SITE_NAME}`,
      description,
    },
    twitter: {
      card: 'summary',
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  };
}
