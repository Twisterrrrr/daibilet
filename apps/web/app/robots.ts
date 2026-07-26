import type { MetadataRoute } from 'next';

const SITE_URL = (
  process.env.DAIBILET_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://daibilet.ru'
).replace(/\/$/, '');

const CRAWL_DISALLOW = [
  '/api/',
  '/account/',
  '/login',
  '/admin/',
  '/reviews/write',
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /admin on daibilet.ru; admin.daibilet.ru is also Basic Auth + noindex layout.
        // Checkout success is external (partner iframe); account purchases covered by /account/.
        disallow: [...CRAWL_DISALLOW],
      },
      // Explicit allow for major crawlers (do not block Googlebot / Yandex site-wide)
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [...CRAWL_DISALLOW],
      },
      {
        userAgent: 'Yandex',
        allow: '/',
        disallow: [...CRAWL_DISALLOW],
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
