import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // MSK prod ~8Gi / 4 CPU: allow parallel build. (SPB 3.8Gi used cpus:1 + workerThreads:false.)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
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
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
  // Image optimizer: WebP/AVIF + long cache to avoid re-encode CPU spikes on small VPS.
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
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
      // Legacy-транслитерация не должна вызывать city DTO с неканоническим slug.
      { source: '/cities/sankt-peterburg', destination: '/cities/saint-petersburg', permanent: true },
      { source: '/my-orders', destination: '/account/purchases', permanent: true },
      { source: '/river-cruises', destination: '/rechnye-progulki', permanent: true },
      { source: '/river-cruises/:city', destination: '/rechnye-progulki/:city', permanent: true },
      { source: '/bus-tours', destination: '/avtobusnye-ekskursii', permanent: true },
      { source: '/bus-tours/:city', destination: '/avtobusnye-ekskursii/:city', permanent: true },
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
