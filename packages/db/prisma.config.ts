import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

// Prisma CLI runs from packages/db; dotenv/config would search that directory
// and silently fall back to a different database than the applications use.
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for Prisma CLI; set it or provide repository-root .env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
