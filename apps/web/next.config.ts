import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prod VPS ~4GB: full tsc/eslint during `next build` gets OOM-killed.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Cap SSG workers so page-data generation does not OOM on 3.8Gi hosts.
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 2,
    staticGenerationMinPagesPerWorker: 10,
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
      { protocol: 'https', hostname: 'ticketscloud-prod.storage.yandexcloud.net' },
      { protocol: 'https', hostname: 's3.twcstorage.ru' },
      { protocol: 'https', hostname: 'api.teplohod.info' },
      { protocol: 'https', hostname: 'daibilet.ru' },
      { protocol: 'https', hostname: 'www.daibilet.ru' },
      { protocol: 'https', hostname: 'staging.daibilet.ru' },
    ],
  },
  async redirects() {
    return [
      { source: '/my-orders', destination: '/account/purchases', permanent: true },
      { source: '/river-cruises', destination: '/rechnye-progulki', permanent: true },
      { source: '/river-cruises/:city', destination: '/rechnye-progulki/:city', permanent: true },
      { source: '/bus-tours', destination: '/avtobusnye-ekskursii', permanent: true },
      { source: '/bus-tours/:city', destination: '/avtobusnye-ekskursii/:city', permanent: true },
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
