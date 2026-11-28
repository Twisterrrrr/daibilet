#!/usr/bin/env node
/**
 * Build draft mustSee seed rows from dump + union (insert + expand hints).
 * Descriptions are short placeholders - fill «в один укус» before apply.
 *
 *   node scripts/build-moscow-mustsee-seed-draft.mjs
 *
 * Writes: docs/drafts/moscow-must-see-seed-draft.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

/**
 * Hub chips = MustSeeFilterId from apps/web/src/lib/must-see-filters.ts.
 * Catalog kinds = venue-meta public types (theater, museum, park, …).
 * Do NOT invent dump sections as new filters (family/unusual/theater tab).
 */
const VALID_MUST_SEE_FILTERS = new Set([
  'main',
  'gastro',
  'museum',
  'science',
  'literature',
  'views',
  'street',
  'park',
  'temple',
  'monument',
  'creative',
  'secret',
  'houses',
  'mansions',
]);

/** Weak hint from dump ## headers only; name inference wins. */
const SECTION_HINT = {
  'памятники и улицы': 'monument',
  памятники: 'monument',
  улицы: 'street',
  музеи: 'museum',
  виды: 'views',
  смотров: 'views',
  парки: 'park',
  храмы: 'temple',
  семейное: 'science',
  необычное: 'creative',
  архитектура: 'main',
  главные: 'main',
  гастро: 'gastro',
  театр: 'main',
  ресторан: 'gastro',
  бар: 'gastro',
};

/**
 * Infer catalog venue type + hub mustSeeFilter from display name.
 * Source of truth for kinds: venue-meta INSTITUTION_KINDS / labels.
 */
function classifyPlace(name, sectionHint) {
  const n = String(name || '').toLowerCase();

  if (
    /театр|мхт|ленком|современник|образцов|фоменко|кабаре|оперн|балет|филармон|консерватор/i.test(
      n,
    )
  ) {
    // Catalog type theater; hub has no «Театры» chip → main (not park).
    return { type: 'theater', mustSeeFilter: 'main' };
  }
  if (
    /ресторан|кафе|бар|гастро|рынок|депо|twins garden|white rabbit|пушкинъ|белуга|savva|живаго|угол[её]к|profсоюз|профсоюз/i.test(
      n,
    )
  ) {
    return { type: 'club_bar_restaurant', mustSeeFilter: 'gastro' };
  }
  if (/музей|галере|бункер-?42|третьяков|пушкинск/i.test(n)) {
    return { type: 'museum', mustSeeFilter: 'museum' };
  }
  if (/собор|церков|храм|монастыр|мечет|синагог|кирх|часовн/i.test(n)) {
    return { type: 'temple', mustSeeFilter: 'temple' };
  }
  if (/^памятник\b|^монумент\b|^скульптур/i.test(n) || /памятник /i.test(n)) {
    return { type: 'monument', mustSeeFilter: 'monument' };
  }
  if (/парк|сад |сквер|набережн|бульвар|цпкио|нескучн|музеон/i.test(n)) {
    return { type: 'park', mustSeeFilter: 'park' };
  }
  if (/смотров|стрелка|обзорн/i.test(n)) {
    return { type: 'outdoor_location', mustSeeFilter: 'views' };
  }
  if (/\bулица\b|\bпереулок\b|\bпроспект\b|^площадь\b/i.test(n)) {
    return { type: 'outdoor_location', mustSeeFilter: 'street' };
  }

  const hint = VALID_MUST_SEE_FILTERS.has(sectionHint) ? sectionHint : 'main';
  const typeByHint = {
    gastro: 'club_bar_restaurant',
    museum: 'museum',
    park: 'park',
    temple: 'temple',
    monument: 'monument',
    views: 'outdoor_location',
    street: 'outdoor_location',
    science: 'museum',
    creative: 'attraction',
    main: 'attraction',
  };
  return { type: typeByHint[hint] || 'attraction', mustSeeFilter: hint };
}

function slugify(name) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return (
    'moscow-' +
    name
      .toLowerCase()
      .split('')
      .map((c) => map[c] ?? c)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 72)
  );
}

function parseDump(md) {
  const rows = [];
  let sectionHint = 'main';
  for (const line of md.split(/\n/)) {
    const sec = line.match(/^##\s+(.+)/);
    if (sec) {
      const key = sec[1].toLowerCase();
      sectionHint = 'main';
      for (const [needle, f] of Object.entries(SECTION_HINT)) {
        if (key.includes(needle)) {
          sectionHint = f;
          break;
        }
      }
      continue;
    }
    const mm = line.match(/^\d+\.\s+(.+?)\s+\|\s+(.+?)\s+\|\s+([0-9.]+),\s*([0-9.]+)\s*$/);
    if (!mm) continue;
    const name = mm[1].replace(/\s*\*.*$/, '').trim();
    const classified = classifyPlace(name, sectionHint);
    rows.push({
      name,
      address: mm[2].trim(),
      lat: +mm[3],
      lon: +mm[4],
      type: classified.type,
      mustSeeFilter: classified.mustSeeFilter,
    });
  }
  return rows;
}

function placeholderDesc(name, address) {
  const where = address && address !== '—' ? ` (${address})` : '';
  return `${name}${where} - точка must-see хаба Москвы. Короткое описание «в один укус» TBD.`;
}

const dump = parseDump(
  fs.readFileSync(path.join(root, 'docs/drafts/moscow-must-see-201-edited.md'), 'utf8'),
);
const union = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/drafts/moscow-must-see-union.json'), 'utf8'),
);
const dumpMinus = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/drafts/moscow-dump-minus-hub.json'), 'utf8'),
);

const byName = new Map(dump.map((d) => [d.name, d]));

const inserts = union.items
  .filter((i) => i.role === 'insert')
  .map((i) => {
    const d = byName.get(i.name) || {};
    const classified = classifyPlace(i.name, d.mustSeeFilter || 'main');
    return {
      role: 'insert',
      name: i.name,
      desc: placeholderDesc(i.name, d.address),
      /** Catalog venue kind (venue-meta), not a new hub section. */
      type: d.type || classified.type,
      /** Hub chip only from MustSeeFilterId (must-see-filters.ts). */
      mustSeeFilter: d.mustSeeFilter || classified.mustSeeFilter,
      locationSlug: slugify(i.name),
      latitude: i.lat,
      longitude: i.lon,
      address: d.address || null,
      descStatus: 'placeholder',
      photoStatus: 'missing',
    };
  });

const expands = union.items
  .filter((i) => i.role === 'expand')
  .map((i) => ({
    role: 'expand',
    name: i.name,
    hubName: i.hubName,
    latitude: i.lat,
    longitude: i.lon,
    distM: i.distM,
    note: 'Hub is source of truth; dump may enrich desc/photo later',
  }));

const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  unionCount: union.unionCount,
  insertCount: inserts.length,
  expandCount: expands.length,
  hubOnlyCount: union.hubOnlyCount,
  nameReviewCount: dumpMinus.nameReviewCount,
  nameReview: dumpMinus.nameReview,
  note:
    'Draft only. Do not apply to MSK until desc+photo filled and name_review resolved. Do not force count to 200.',
  expands,
  inserts,
};

fs.writeFileSync(
  path.join(root, 'docs/drafts/moscow-must-see-seed-draft.json'),
  JSON.stringify(out, null, 2),
);
console.log(
  JSON.stringify(
    {
      inserts: inserts.length,
      expands: expands.length,
      nameReview: dumpMinus.nameReviewCount,
      filters: inserts.reduce((a, r) => {
        a[r.mustSeeFilter] = (a[r.mustSeeFilter] || 0) + 1;
        return a;
      }, {}),
      types: inserts.reduce((a, r) => {
        a[r.type] = (a[r.type] || 0) + 1;
        return a;
      }, {}),
    },
    null,
    2,
  ),
);
