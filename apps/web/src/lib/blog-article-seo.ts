import type { Metadata } from 'next';

import { resolveBlogCityHref } from '@/lib/blog-article-city';
import type { BlogArticleDto } from '@/lib/blog-utils';

const SITE_URL = (process.env.DAIBILET_SITE_URL || 'https://daibilet.ru').replace(/\/$/, '');

function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
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
  const title = article.seoTitle || `${article.title} | Блог Дайбилет`;
  const description = article.seoDescription || article.excerpt || article.title;
  const canonicalPath = article.canonicalPath || `/blog/${article.slug}`;
  const canonical = absoluteUrl(canonicalPath);
  const image = article.coverImageUrl ? absoluteUrl(article.coverImageUrl) : undefined;
  const indexable = article.isIndexable !== false;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: 'article',
      url: canonical,
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt || undefined,
      publishedTime: article.publishedAt || undefined,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt || undefined,
      images: image ? [image] : undefined,
    },
  };
}

export function buildBlogArticleJsonLd(article: BlogArticleDto): Array<Record<string, unknown>> {
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt || article.title;
  const canonicalPath = article.canonicalPath || `/blog/${article.slug}`;
  const canonical = absoluteUrl(canonicalPath);
  const image = article.coverImageUrl ? absoluteUrl(article.coverImageUrl) : undefined;
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
        name: 'Дайбилет',
        url: SITE_URL,
      },
      publisher: {
        '@type': 'Organization',
        name: 'Дайбилет',
        url: SITE_URL,
      },
    },
  ];

  return blocks;
}

export function buildBlogListMetadata(): Metadata {
  const canonical = `${SITE_URL}/blog`;
  const title = 'Блог — гайды и советы о событиях | Дайбилет';
  const description =
    'Гайды по концертам, театру и городским прогулкам. Как выбрать билет, куда пойти с детьми, что смотреть на этой неделе.';

  return {
    title,
    description,
    alternates: { canonical: '/blog' },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}
