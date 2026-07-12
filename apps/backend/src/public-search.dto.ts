import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDb } from './db.js';
import { buildPublicSearch } from './dto.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export async function buildPublicSearchDto(
  searchParams: URLSearchParams,
): Promise<Awaited<ReturnType<typeof buildPublicSearch>>> {
  const db = createDb(projectRoot);
  return buildPublicSearch(db, searchParams);
}
