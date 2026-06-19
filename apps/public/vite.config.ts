import path from 'path';
import { fileURLToPath } from 'url';
import react from 'D:/coding/SPBBOATS/packages/frontend-admin-v4/node_modules/@vitejs/plugin-react/dist/index.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [react()],
  cacheDir: './.vite',
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
};
