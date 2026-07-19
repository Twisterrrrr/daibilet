import type { MetadataRoute } from 'next';

const SITE_URL = (
  process.env.DAIBILET_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://daibilet.ru'
).replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account/', '/login'],
      },
      // Explicit allow for major crawlers (do not block Googlebot / Yandex)
      {
        userAgent: 'Googlebot',
        allow: '/',
      },
      {
        userAgent: 'Yandex',
        allow: '/',
      },
      // Known content scrapers (mirror sites like liliabots.ru)
      {
        userAgent: 'liliabots',
        disallow: '/',
      },
      {
        userAgent: 'liliabot',
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
