import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAdminOrdersList } from './dto.js';
import { createDb } from './db.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

let legacyDb: ReturnType<typeof createDb> | null = null;

function getLegacyDb() {
  if (!legacyDb) legacyDb = createDb(projectRoot);
  return legacyDb;
}

export async function buildAdminOrdersListDto(searchParams: URLSearchParams = new URLSearchParams()) {
  return buildAdminOrdersList(getLegacyDb(), searchParams);
}
