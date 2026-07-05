/**
 * Генерация shortDescription, description и seoDescription для площадок.
 *
 * Источники: Wikipedia (ru), шаблоны по типу institution/location.
 *
 * Usage:
 *   node scripts/generate-venue-content.mjs
 *   node scripts/generate-venue-content.mjs --template=institution
 *   node scripts/generate-venue-content.mjs --limit=10 --force
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildVenueContent } from './lib/venue-content-writer.mjs';
import { isOperationalShort, normalizeCity, searchWikipedia, sleep } from './lib/venue-content-sources.mjs';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const inputPath = path.join(rootDir, 'scripts', 'data', 'venues-api.json');
const outputPath = path.join(rootDir, 'scripts', 'data', 'venue-content-draft.json');

if (!fs.existsSync(inputPath)) {
  console.error('Missing venues-api.json — run: curl https://daibilet.ru/api/public/venues?limit=500 -o scripts/data/venues-api.json');
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
let venues = catalog.venues || [];

if (args.template) {
  venues = venues.filter((v) => v.template === args.template);
}
if (args.limit) {
  venues = venues.slice(0, Number(args.limit));
}

const force = Boolean(args.force);
const delayMs = Number(args.delay || 350);

console.log(`Generating content for ${venues.length} venues (force=${force}, delay=${delayMs}ms)...`);

const results = [];
let wikiHits = 0;
let skipped = 0;

for (let i = 0; i < venues.length; i += 1) {
  const venue = venues[i];
  const city = normalizeCity(venue);
  const hasGoodShort = isOperationalShort(venue.shortDescription);

  if (!force && hasGoodShort) {
    skipped += 1;
    results.push({
      id: venue.id,
      slug: venue.slug,
      name: venue.name,
      template: venue.template,
      skipped: true,
      reason: 'existing_short_description',
      shortDescription: venue.shortDescription,
    });
    continue;
  }

  let wiki = null;
  try {
    wiki = await searchWikipedia(venue.name, city);
    if (wiki) wikiHits += 1;
  } catch (error) {
    console.warn(`Wiki error for ${venue.name}:`, error.message);
  }

  const content = buildVenueContent(venue, wiki);
  results.push({
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    city,
    template: venue.template,
    type: venue.type,
    events: venue.events,
    ...content,
  });

  if ((i + 1) % 10 === 0) {
    console.log(`  ${i + 1}/${venues.length} (wiki hits: ${wikiHits}, skipped: ${skipped})`);
  }
  await sleep(delayMs);
}

const payload = {
  generatedAt: new Date().toISOString(),
  total: results.length,
  wikiHits,
  skipped,
  updated: results.filter((r) => !r.skipped).length,
  results,
};

fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(`Done. Wiki: ${wikiHits}, skipped: ${skipped}, written: ${outputPath}`);

process.exit(0);
