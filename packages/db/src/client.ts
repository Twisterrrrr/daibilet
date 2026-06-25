import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/prisma/client.ts';

const defaultDatabaseUrl = 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

type GlobalWithPrisma = typeof globalThis & {
  __daibiletPrisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

export const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl;

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

export const prisma = globalForPrisma.__daibiletPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__daibiletPrisma = prisma;
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}

export { Prisma };
export type { PrismaClient };
export * from './generated/prisma/enums.ts';
