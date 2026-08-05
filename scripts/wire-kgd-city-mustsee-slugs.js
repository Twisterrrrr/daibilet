/**
 * Wire KGD city mustSee slugs from must-see-editorial-kaliningrad-city.json
 * into apps/web + apps/public cityInfo.ts. Idempotent.
 *
 * Usage: node scripts/wire-kgd-city-mustsee-slugs.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pack = JSON.parse(
  fs.readFileSync(path.join(root, 'scripts/data/must-see-editorial-kaliningrad-city.json'), 'utf8'),
);

const TITLE_TO_SLUG = new Map();
for (const row of pack) {
  TITLE_TO_SLUG.set(norm(row.title), {
    slug: row.slug,
    field: row.familyHint === 'institution' ? 'venueSlug' : 'locationSlug',
  });
}

// Антидубль здания музея ИЗО. Gastro (5) - в каталоге /locations как ATTRACTION.
const HUB_ONLY = new Set(['Здание Кёнигсбергской биржи'].map(norm));

const files = [
  path.join(root, 'apps/web/src/lib/cityInfo.ts'),
  path.join(root, 'apps/public/src/lib/cityInfo.ts'),
];

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lookup(name) {
  const key = norm(name);
  if (TITLE_TO_SLUG.has(key)) return TITLE_TO_SLUG.get(key);
  for (const [t, v] of TITLE_TO_SLUG) {
    if (key.includes(t) || t.includes(key)) return v;
  }
  return null;
}

function patchFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  const start = src.indexOf('kaliningrad:');
  if (start < 0) throw new Error('kaliningrad block missing: ' + filePath);
  const suburbs = src.indexOf('significantSuburbs:', start);
  const head = src.slice(0, start);
  let block = src.slice(start, suburbs);
  let tail = src.slice(suburbs);

  let wired = 0;
  let skipped = 0;
  block = block.replace(
    /\{\s*name:\s*'((?:\\'|[^'])*)',\s*desc:\s*'((?:\\'|[^'])*)',([\s\S]*?)\}/g,
    (full, rawName, desc, rest) => {
      if (!/mustSeeFilter:/.test(rest)) return full;
      const name = rawName.replace(/\\'/g, "'");
      if (/\b(?:venueSlug|locationSlug):/.test(rest)) {
        skipped += 1;
        return full;
      }
      if (HUB_ONLY.has(norm(name))) return full;
      const hit = lookup(name);
      if (!hit) return full;
      const filter = (rest.match(/mustSeeFilter:\s*'([^']+)'/) || [])[1];
      if (!filter) return full;
      wired += 1;
      return `{ name: '${rawName}', desc: '${desc}',\n        ${hit.field}: '${hit.slug}',\n        mustSeeFilter: '${filter}',\n      }`;
    },
  );

  if (!/locationSlug: 'kaliningrad-ostrov-kanta'/.test(tail)) {
    tail = tail.replace(
      /(\{\s*name:\s*'Остров Канта \(Кнайпхоф\)',\s*desc:\s*'Парк и могила философа')(\s*\})/,
      `$1, locationSlug: 'kaliningrad-ostrov-kanta'$2`,
    );
  }
  if (!/locationSlug: 'kaliningrad-rayon-vill-amalienau'/.test(tail) || !/Прогулка среди вилл/.test(tail)) {
    tail = tail.replace(
      /(\{\s*name:\s*'Район Амалиенау',\s*desc:\s*'Прогулка среди вилл')(\s*\})/,
      `$1, locationSlug: 'kaliningrad-rayon-vill-amalienau'$2`,
    );
  }

  const after = head + block + tail;
  fs.writeFileSync(filePath, after, 'utf8');
  return { file: path.relative(root, filePath), wired, skippedExisting: skipped, changed: after !== src };
}

const report = files.filter((f) => fs.existsSync(f)).map(patchFile);
console.log(JSON.stringify({ packSize: pack.length, report }, null, 2));
