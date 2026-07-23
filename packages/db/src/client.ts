import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { Prisma, PrismaClient } from './generated/prisma/client.ts';

const defaultDatabaseUrl = 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

type GlobalWithPrisma = typeof globalThis & {
  __daibiletPrisma?: PrismaClient;
  __daibiletPgPool?: Pool;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

export const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl;

function getSharedPool(): Pool {
  if (!globalForPrisma.__daibiletPgPool) {
    globalForPrisma.__daibiletPgPool = new Pool({
      connectionString: databaseUrl,
      // Next/API share one process pool; keep modest on 4Gi prod hosts.
      max: Number(process.env.DAIBILET_PG_POOL_MAX || 8),
    });
  }
  return globalForPrisma.__daibiletPgPool;
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg(getSharedPool()),
  });
}

/**
 * Classic Next.js singleton: always pin on `globalThis` (dev HMR + prod workers).
 * Without this, adapter-pg opens a new Pool per module re-eval / duplicate import graph.
 */
export const prisma = globalForPrisma.__daibiletPrisma ?? createPrismaClient();
globalForPrisma.__daibiletPrisma = prisma;

export async function disconnectPrisma() {
  await prisma.$disconnect();
  const pool = globalForPrisma.__daibiletPgPool;
  if (pool) {
    await pool.end();
    globalForPrisma.__daibiletPgPool = undefined;
  }
  globalForPrisma.__daibiletPrisma = undefined;
}

export { PrismaClient } from './generated/prisma/client.ts';
export type { Prisma } from './generated/prisma/client.ts';
export * from './generated/prisma/enums.ts';
