import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDb } from '../apps/backend/src/db.js';
import { runLandingAudit } from '../apps/backend/src/dto.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);

const audit = await runLandingAudit(db, rootDir);
console.log(JSON.stringify(audit, null, 2));

if (audit.summary.failed > 0) {
  process.exitCode = 1;
}
