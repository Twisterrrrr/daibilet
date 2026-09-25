import { venueCanonicalPath } from './routes';

/** Shared by the sitemap renderer and the full-catalog canonical audit. */
export function venueSitemapEntry(
  venue: Parameters<typeof venueCanonicalPath>[0],
  site: string,
  now = new Date(),
) {
  return {
    url: `${site.replace(/\/+$/, '')}${venueCanonicalPath(venue)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  };
}
