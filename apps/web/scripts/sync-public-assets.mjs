/**
 * Legacy Vite images in apps/public are archived externally and must not be
 * copied into the Next app during builds. Production/staging serve the
 * persistent apps/web/public/images root independently of the build artifact.
 * CI builds do not need local image files to render their /images URLs.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetRoot = path.join(webRoot, 'public/images');
console.log(`sync-public-assets: legacy copying disabled; runtime image root is ${targetRoot}`);
