import { Prisma } from './generated/prisma/client.ts';

/** Runtime SQL helpers for raw queries — import from `@daibilet/db/sql`. */
export const sql = Prisma.sql;
export const raw = Prisma.raw;
export const join = Prisma.join;
export const empty = Prisma.empty;
