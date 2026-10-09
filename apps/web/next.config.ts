import type { NextConfig } from 'next';

import { placeSlugAliasRedirects } from './src/lib/place-slug-aliases';

const nextConfig: NextConfig = {
  // MSK prod ~8Gi / 4 CPU: allow parallel build. (Legacy SPB 3.8Gi used cpus:1 + workerThreads:false.)
  // Type errors are closed (web typecheck: 0 as of 30.09), so the build may fail on them again -
  // that is the point of the TS-debt cleanup. Do not re-enable the ignore.
  typescript: { ignoreBuildErrors: false },

  // /places/institution and /places/location are the public ЧПУ for the two
  // family facets. They rewrite to the same hub with the family query so the
  // rendering path stays single-sourced while the address is a clean path.
  async rewrites() {
    return [
      { source: '/places/institution', destination: '/places?family=institution' },
      { source: '/places/location', destination: '/places?family=location' },
    ];
  },
  productionBrowserSourceMaps: false,
  experimental: {
    // Soft cap: Cyrillic event prerender races at 2 on MSK; keep 1 until stable.
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 20,
    // Client router cache: avoid refetching dynamic RSC on every back/forward / revisit
    // (default dynamic staleTime is 0 → soft nav always waits on a new flight).
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  transpilePackages: ['@daibilet/backend', '@daibilet/db', '@daibilet/contracts'],
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg', 'nodemailer'],
  // Image optimizer: WebP/AVIF + long cache to avoid re-encode CPU spikes on small VPS.
  images: {
    formats: ['image/avif', 'image/webp'],
    // Allow sharp catalog/affiche q=90/92/95 (Next 16 will require this list).
    qualities: [75, 85, 88, 90, 92, 95],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // 480 bridges card tiles (~480 CSS x retina) before jumping to deviceSizes 640.
    imageSizes: [64, 96, 128, 256, 320, 384, 480],
    remotePatterns: [
      // TC CDN: catalog historically used both Yandex and GCS hostnames for the same bucket.
      { protocol: 'https', hostname: 'ticketscloud-prod.storage.yandexcloud.net' },
      { protocol: 'https', hostname: 'ticketscloud-prod.storage.googleapis.com' },
      { protocol: 'https', hostname: 's3.twcstorage.ru' },
      { protocol: 'https', hostname: 'api.teplohod.info' },
      { protocol: 'https', hostname: 'daibilet.ru' },
      { protocol: 'https', hostname: 'www.daibilet.ru' },
      { protocol: 'https', hostname: 'staging.daibilet.ru' },
    ],
  },
  async redirects() {
    return [
      // /places?family=* is now addressable as /places/institution and /places/location.
      // Both facets render distinct hub copy (Площадки / Локации), so a single
      // /places canonical merged them. Verified 2026-10-01 that no inbound
      // external links target the query form, so the 301 is free.
      { source: '/places', has: [{ type: 'query', key: 'family', value: 'institution' }], destination: '/places/institution', permanent: true },
      { source: '/places', has: [{ type: 'query', key: 'family', value: 'location' }], destination: '/places/location', permanent: true },
      // English alias should resolve to the imported/canonical city slug used by catalog DTOs.
      { source: '/cities/saint-petersburg', destination: '/cities/sankt-peterburg', permanent: true },
      { source: '/my-orders', destination: '/account/purchases', permanent: true },
      { source: '/river-cruises', destination: '/rechnye-progulki', permanent: true },
      { source: '/river-cruises/:city', destination: '/rechnye-progulki/:city', permanent: true },
      { source: '/bus-tours', destination: '/avtobusnye-ekskursii', permanent: true },
      { source: '/bus-tours/:city', destination: '/avtobusnye-ekskursii/:city', permanent: true },
      // Buyer seed / editorial typos / TC twin → live venue slugs
      {
        source: '/venues/gosudarstvennyy-ermitazh',
        destination: '/venues/ermitazh',
        permanent: true,
      },
      {
        source: '/venues/gosudarstvennyi-ermitazh',
        destination: '/venues/ermitazh',
        permanent: true,
      },
      {
        source: '/venues/tretyakovskaya-galereya',
        destination: '/venues/moscow-tret-yakovskaya-galereya',
        permanent: true,
      },
      // Smoke/typo slugs → live catalog twins (Salavat, Kramskoy, Ryazan kremlin).
      ...placeSlugAliasRedirects(),
      // Listing indexes → unified `/places`. Entity `/venues/:slug` and `/locations/:slug` stay.
      {
        source: '/venues',
        destination: '/places?family=institution',
        permanent: true,
      },
      {
        source: '/locations',
        destination: '/places?family=location',
        permanent: true,
      },
      // HIDDEN blog twins → live канон
      {
        source: '/blog/bylinnyy-bereg-fentezi-fest',
        destination: '/blog/fentezi-fest-bylinnyy-bereg',
        permanent: true,
      },
      {
        source: '/blog/open-air-festy-vyhodnoi-ru',
        destination: '/blog/moskva-parki-open-air-vyhodnye',
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;

