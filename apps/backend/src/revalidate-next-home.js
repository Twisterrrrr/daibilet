import { revalidateNextPaths } from './revalidate-next-blog.js';

/**
 * POST to Next internal revalidate after catalog sync (home ISR + unstable_cache).
 */
export async function revalidateNextHome(reason = 'manual') {
  return revalidateNextPaths({
    tags: ['home-page', 'catalog-page'],
    paths: [
      '/',
      '/events',
      '/cities/sankt-peterburg',
      '/cities/moscow',
      '/rechnye-progulki',
      '/avtobusnye-ekskursii',
      '/api/public/stats',
    ],
    reason,
  });
}
