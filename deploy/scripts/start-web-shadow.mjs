import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

const appRoot = process.env.APP_DIR || '/opt/daibilet';
const dir = process.env.SHADOW_WEB_DIR;
const port = Number(process.env.SHADOW_WEB_PORT || 3002);
if (!dir || !Number.isInteger(port)) throw new Error('Shadow directory and port are required');
const require = createRequire(join(appRoot, 'apps/web/package.json'));
const next = require('next');
const { config } = JSON.parse(readFileSync(join(dir, '.next/required-server-files.json'), 'utf8'));
const app = next({ dev: false, dir, conf: config, hostname: '127.0.0.1', port });
await app.prepare();
const server = createServer(app.getRequestHandler());
server.listen(port, '127.0.0.1', () => console.log(`Shadow web ready on 127.0.0.1:${port}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
