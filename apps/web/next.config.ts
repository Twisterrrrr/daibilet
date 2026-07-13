import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@daibilet/contracts'],
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg', '@daibilet/db', '@daibilet/backend'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
