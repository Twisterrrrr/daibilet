import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server-entry.ts'],
  outDir: 'dist',
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  bundle: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  noExternal: ['@daibilet/contracts', '@daibilet/db'],
  external: ['@prisma/adapter-pg', '@prisma/client', '@prisma/client/runtime/client', 'pg'],
});
