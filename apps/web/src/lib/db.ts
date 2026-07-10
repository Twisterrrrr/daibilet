import { loadRootEnv } from './load-root-env';

loadRootEnv();

export { prisma, Prisma, disconnectPrisma, databaseUrl } from '@daibilet/db';
