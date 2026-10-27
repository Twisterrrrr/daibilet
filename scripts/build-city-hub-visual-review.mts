import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { CITY_INFO } from '../apps/web/src/lib/cityInfo-data.ts';
import { cityIdentitySlides } from '../apps/web/src/lib/city-hub-local-flavor.ts';
import { resolveVenueHeroImage } from '../apps/web/src/lib/city-place-images.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'apps/web/package.json'));
const sharp = require('sharp');
const publicDir = path.join(root, 'apps/public/public');
const outDir = path.join(process.env.TEMP || process.env.TMP || '.', 'daibilet-hub-visual-review');
// The active city hubs currently under the operational city routes. Moscow and
// Saint Petersburg are explicitly excluded from this image audit.
const activeHubs = new Set([
  'kazan', 'kaliningrad', 'yaroslavl', 'ekaterinburg', 'nizhny-novgorod',
  'novosibirsk', 'krasnoyarsk', 'tula', 'samara', 'omsk', 'ufa', 'tver',
  'krasnodar', 'sochi', 'tyumen', 'voronezh', 'rostov-na-donu', 'perm',
  'saratov', 'chelyabinsk', 'ryazan', 'ulyanovsk', 'penza', 'volgograd',
  'smolensk', 'kirov-kirovskaya-oblast', 'barnaul',
]);
const cities = Object.entries(CITY_INFO).filter(([city, info]) =>
  activeHubs.has(city) && Boolean(info.mustSee?.length || info.significantSuburbs?.length || cityIdentitySlides(city).length),
);
const tileW = 280;
const tileH = 160;
const labelH = 46;
const columns = 4;

function fileFor(url: string): string | null {
  const clean = url.split(/[?#]/, 1)[0];
  let candidate = path.join(publicDir, clean.replace(/^\/+/, ''));
  if (!fs.existsSync(candidate)) return null;
  if (candidate.endsWith('.jpg')) {
    const card = candidate.replace(/\.jpg$/i, '-card.jpg');
    if (fs.existsSync(card)) candidate = card;
  }
  return candidate;
}

function slugOf(item: any): string {
  return String(item?.venueSlug || item?.locationSlug || '').trim();
}

function collect(city: string, info: any) {
  const rows: { label: string; url: string }[] = [];
  for (const slide of cityIdentitySlides(city)) {
    if (slide.imageSrc) rows.push({ label: `IDENTITY · ${slide.title || slide.id}`, url: slide.imageSrc });
  }
  for (const place of info.mustSee || []) {
    const slug = slugOf(place);
    const revision = slug === 'ufa-natsionalnyy-muzey' ? '/images/venues/ufa/natsionalnyy-muzey-r20261009.jpg' : slug === 'ufa-dom-muzey-lenina' ? '/images/venues/ufa/dom-muzey-lenina-r20261009.jpg' : null;
    const url = revision || resolveVenueHeroImage(slug, place.imageUrl || null);
    if (url) rows.push({ label: `MUSTSEE · ${place.name} · ${slug}`, url });
  }
  for (const suburb of info.significantSuburbs || []) {
    const slug = slugOf(suburb);
    const url = resolveVenueHeroImage(slug, suburb.imageUrl || null);
    if (url) rows.push({ label: `SUBURB · ${suburb.name} · ${slug}`, url });
    for (const place of suburb.places || []) {
      const childSlug = slugOf(place);
      const revision = childSlug === 'ufa-glavnoe-uschele' ? '/images/venues/ufa/glavnoe-uschele-r20261009.jpg' : childSlug === 'ufa-beregovaya-polyana' ? '/images/venues/ufa/beregovaya-polyana-r20261009.jpg' : null;
      const childUrl = revision || resolveVenueHeroImage(childSlug, place.imageUrl || null);
      if (childUrl) rows.push({ label: `SUBURB POI · ${place.name} · ${childSlug}`, url: childUrl });
    }
  }
  const unique = new Map<string, (typeof rows)[number]>();
  for (const row of rows) unique.set(`${row.label}\0${row.url}`, row);
  return [...unique.values()];
}

await fs.promises.mkdir(outDir, { recursive: true });
const manifest: Record<string, unknown> = {};
for (const [city, info] of cities) {
  const rows = collect(city, info);
  const tiles: sharp.OverlayOptions[] = [];
  const missing: string[] = [];
  for (const [index, row] of rows.entries()) {
    const file = fileFor(row.url);
    if (!file) { missing.push(`${row.label} -> ${row.url}`); continue; }
    try {
      const photo = await sharp(file).rotate().resize(tileW, tileH, { fit: 'cover' }).jpeg({ quality: 78 }).toBuffer();
      const safe = row.label.replace(/[&<>"']/g, ' ');
      const label = Buffer.from(`<svg width="${tileW}" height="${labelH}"><rect width="100%" height="100%" fill="#fff"/><text x="6" y="16" font-size="12" font-family="Arial">${safe.slice(0, 62)}</text><text x="6" y="34" font-size="10" fill="#555" font-family="Arial">${row.url.slice(-62)}</text></svg>`);
      const tile = await sharp({ create: { width: tileW, height: tileH + labelH, channels: 3, background: '#fff' } })
        .composite([{ input: label, left: 0, top: 0 }, { input: photo, left: 0, top: labelH }]).jpeg({ quality: 82 }).toBuffer();
      tiles.push({ input: tile, left: (index % columns) * tileW, top: Math.floor(index / columns) * (tileH + labelH) });
    } catch (error) { missing.push(`${row.label} -> ${String(error)}`); }
  }
  const rowsCount = Math.ceil(rows.length / columns);
  const sheet = path.join(outDir, `${city}.jpg`);
  if (tiles.length) await sharp({ create: { width: columns * tileW, height: rowsCount * (tileH + labelH), channels: 3, background: '#ddd' } })
    .composite(tiles).jpeg({ quality: 85 }).toFile(sheet);
  manifest[city] = { count: rows.length, sheet, missing };
  console.log(`${city}\t${rows.length}\t${sheet}\tmissing=${missing.length}`);
}
await fs.promises.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`review sheets: ${outDir}`);
