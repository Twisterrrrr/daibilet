import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

const localDatabaseUrl = 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || localDatabaseUrl,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
