import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.VITE_ADMIN_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  cacheDir: './.vite',
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  server: {
    port: 5176,
  },
});
