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
        // /admin on daibilet.ru; admin.daibilet.ru is also Basic Auth + noindex layout
        disallow: ['/account/', '/login', '/admin/'],
      },
      // Explicit allow for major crawlers (do not block Googlebot / Yandex site-wide)
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/account/', '/login', '/admin/'],
      },
      {
        userAgent: 'Yandex',
        allow: '/',
        disallow: ['/account/', '/login', '/admin/'],
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
