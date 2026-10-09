import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAdminEventDetail, buildAdminEventsList } from './dto.js';
import { createDb } from './db.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

let legacyDb: ReturnType<typeof createDb> | null = null;

function getLegacyDb() {
  if (!legacyDb) legacyDb = createDb(projectRoot);
  return legacyDb;
}

export async function buildAdminEventsListDto(searchParams: URLSearchParams = new URLSearchParams()) {
  return buildAdminEventsList(getLegacyDb(), searchParams);
}

export async function buildAdminEventDetailDto(eventId: string) {
  return buildAdminEventDetail(getLegacyDb(), eventId);
}
