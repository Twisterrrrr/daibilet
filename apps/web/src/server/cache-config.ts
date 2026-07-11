/** ISR interval (seconds). Use literal `300` in `export const revalidate` — Next.js requires a static value at build time. */
export const PUBLIC_PAGE_REVALIDATE = 300;

/** Same as PUBLIC_PAGE_REVALIDATE — for API route docs only. */
export const PUBLIC_API_REVALIDATE = 300;

/** Shared Cache-Control for CDN/nginx and browser. */
export const PUBLIC_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';
