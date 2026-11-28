import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDb } from './db.js';
import { buildPublicStats } from './dto.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export async function buildPublicStatsDto(forceRefresh = false): Promise<Awaited<ReturnType<typeof buildPublicStats>>> {
  if (forceRefresh) {
    const { clearPublicDataCaches } = await import('./dto.js');
    clearPublicDataCaches();
  }
  const db = createDb(projectRoot);
  return buildPublicStats(db);
}
