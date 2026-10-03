#!/usr/bin/env node
/**
 * Audit destination coverage: hub suburbs vs unified registry.
 *
 * Usage:
 *   node --import ./apps/backend/node_modules/tsx/dist/loader.mjs scripts/audit-destination-coverage.mjs
 *   node --import ./apps/backend/node_modules/tsx/dist/loader.mjs scripts/audit-destination-coverage.mjs --json
 */

import { CITY_INFO } from '../apps/web/src/lib/cityInfo.ts';
import {
  DESTINATION_REGISTRY,
  hydrateDestinationRegistryFromCityInfo,
  listDestinationCoverageRows,
} from '../apps/web/src/lib/city-destination-registry.ts';

hydrateDestinationRegistryFromCityInfo(CITY_INFO);

const asJson = process.argv.includes('--json');
const rows = listDestinationCoverageRows(CITY_INFO);

const summary = {
  totalRows: rows.length,
  migrated: rows.filter((row) => row.registryStatus === 'migrated').length,
  pending: rows.filter((row) => row.registryStatus === 'pending').length,
  wiredInHub: rows.filter((row) => row.wiredInHub).length,
  standaloneCandidates: rows.filter((row) => row.hasStandalonePage).length,
};

if (asJson) {
  console.log(JSON.stringify({ summary, rows }, null, 2));
  process.exit(0);
}

console.log('Destination coverage audit');
console.log('==========================');
console.log(`Total suburb rows: ${summary.totalRows}`);
console.log(`Registry migrated: ${summary.migrated}`);
console.log(`Pending (inline only): ${summary.pending}`);
console.log(`Wired in hub: ${summary.wiredInHub}`);
console.log(`Standalone page candidates: ${summary.standaloneCandidates}`);
console.log('');
console.log(
  [
    'hub_slug',
    'suburb_name',
    'destination_id',
    'kind',
    'catalog_slug',
    'region_slug',
    'standalone',
    'status',
    'wired',
    'places',
  ].join('\t'),
);

for (const row of rows) {
  console.log(
    [
      row.hubSlug,
      row.suburbName,
      row.destinationId,
      row.kind,
      row.catalogSlug || '-',
      row.regionSlug || '-',
      row.hasStandalonePage ? 'yes' : 'no',
      row.registryStatus,
      row.wiredInHub ? 'yes' : 'no',
      row.placeCount,
    ].join('\t'),
  );
}
