import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prod VPS ~4GB: full tsc/eslint during `next build` gets OOM-killed.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['@daibilet/backend', '@daibilet/db', '@daibilet/contracts'],
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
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
