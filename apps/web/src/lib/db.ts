import '@/lib/env';

export { prisma, disconnectPrisma, databaseUrl } from '@daibilet/db';
export { sql, raw, join, empty } from '@daibilet/db/sql';
export type { Prisma } from '@daibilet/db';
