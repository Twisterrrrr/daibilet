import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@daibilet/backend', '@daibilet/db', '@daibilet/contracts'],
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
  async redirects() {
    return [{ source: '/my-orders', destination: '/account/purchases', permanent: true }];
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
