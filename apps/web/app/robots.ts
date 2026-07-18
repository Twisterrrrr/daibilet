import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://daibilet.ru';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account/', '/login'],
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
    sitemap: `${SITE_URL.replace(/\/$/, '')}/sitemap.xml`,
  };
}
