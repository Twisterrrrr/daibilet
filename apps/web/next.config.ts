import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@daibilet/db', '@daibilet/contracts'],
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
};

export default nextConfig;
