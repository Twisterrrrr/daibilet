import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRootEnv } from './env.ts';

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(backendDirectory, '..', '..', '..');

// This side-effect module must be imported before modules that initialize Prisma.
// The backend's raw pg pool already loads the root .env; Prisma must see the same URL.
loadRootEnv(projectRoot);
