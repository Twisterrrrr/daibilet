import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clearPublicDataCaches,
  publicCatalogSessions,
  sessionHasCoverImage,
} from '../src/dto.js';
import { createDb } from '../src/db.js';
import { clearPublicCatalogDtoCache, getPublicCatalogSessions } from '../src/public-catalog.dto.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const db = createDb(projectRoot);

clearPublicDataCaches();
clearPublicCatalogDtoCache();

const [legacyAll, typedAll] = await Promise.all([
  publicCatalogSessions(db, true),
  getPublicCatalogSessions(true),
]);

const legacyCover = legacyAll.filter(sessionHasCoverImage);
const typedCover = typedAll.filter(sessionHasCoverImage);

console.log('raw legacy', legacyAll.length, 'raw typed', typedAll.length);
console.log('cover legacy', legacyCover.length, 'cover typed', typedCover.length);

const legacyByGroup = new Map(legacyCover.map((item) => [item.groupKey, item]));
const typedByGroup = new Map(typedCover.map((item) => [item.groupKey, item]));

const onlyTypedGroups = typedCover.filter((item) => !legacyByGroup.has(item.groupKey));
const onlyLegacyGroups = legacyCover.filter((item) => !typedByGroup.has(item.groupKey));
const sharedGroups = typedCover.filter((item) => legacyByGroup.has(item.groupKey));
const idMismatches = sharedGroups.filter((item) => legacyByGroup.get(item.groupKey)?.id !== item.id);

console.log('only typed groups', onlyTypedGroups.length);
for (const item of onlyTypedGroups) {
  console.log('  +', item.id, item.groupKey, item.title);
}
console.log('only legacy groups', onlyLegacyGroups.length);
for (const item of onlyLegacyGroups) {
  console.log('  -', item.id, item.groupKey, item.title);
}
console.log('representative id mismatches', idMismatches.length);
for (const item of idMismatches.slice(0, 20)) {
  const legacyItem = legacyByGroup.get(item.groupKey);
  console.log('  ~', item.groupKey, 'legacy', legacyItem?.id, 'typed', item.id);
}
