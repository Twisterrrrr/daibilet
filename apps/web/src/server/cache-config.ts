/** ISR interval (seconds). Use literal `300` in `export const revalidate` — Next.js requires a static value at build time. */
export const PUBLIC_PAGE_REVALIDATE = 300;

/** Same as PUBLIC_PAGE_REVALIDATE — for API route docs only. */
export const PUBLIC_API_REVALIDATE = 300;

/** `unstable_cache` tag for home page data (stats, catalog slice, destinations). */
export const HOME_PAGE_CACHE_TAG = 'home-page';

/** `unstable_cache` tag for /events catalog SSR + API slices. */
export const CATALOG_PAGE_CACHE_TAG = 'catalog-page';

/** `unstable_cache` tag for /events/[slug] DTO + aggregate rating. */
export const EVENT_PAGE_CACHE_TAG = 'event-page';

/** `unstable_cache` tag for /cities/[slug] DTO + hub articles. */
export const CITY_PAGE_CACHE_TAG = 'city-page';

/** Shared Cache-Control for CDN/nginx and browser. */
export const PUBLIC_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

/** `unstable_cache` tag for /podborki + venues/locations catalog DTOs. */
export const PUBLIC_SURFACES_CACHE_TAG = 'public-surfaces';

/** `unstable_cache` tag for `/blog` list + hero sidebar enrichment. */
export const BLOG_PAGE_CACHE_TAG = 'blog-page';
