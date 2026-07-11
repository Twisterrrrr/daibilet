/** ISR for public HTML pages (seconds). */
export const PUBLIC_PAGE_REVALIDATE = 300;

/** ISR for public read-only JSON API routes (seconds). */
export const PUBLIC_API_REVALIDATE = 300;

/** Shared Cache-Control for CDN/nginx and browser. */
export const PUBLIC_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';
