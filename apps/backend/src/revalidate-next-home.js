import { revalidateNextPaths } from './revalidate-next-blog.js';

/**
 * POST to Next internal revalidate after catalog sync (home ISR + unstable_cache).
 */
export async function revalidateNextHome(reason = 'manual') {
  return revalidateNextPaths({
    // Include destinations / public-surfaces so catalog sync also busts 24h chrome cache.
    tags: ['home-page', 'catalog-page', 'event-page', 'destinations', 'public-surfaces'],
    paths: [
      '/',
      '/events',
      '/cities',
      '/cities/sankt-peterburg',
      '/cities/moscow',
      '/rechnye-progulki',
      '/avtobusnye-ekskursii',
      '/api/public/stats',
    ],
    reason,
  });
}
