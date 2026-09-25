import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cityInfoPath = path.join(root, 'apps/web/src/lib/cityInfo.ts');
const publicCityInfoPath = path.join(root, 'apps/public/src/lib/cityInfo.ts');
const editorialPath = path.join(root, 'scripts/data/must-see-editorial-moscow.json');

const dry = process.argv.includes('--dry-run');
const apply = process.argv.includes('--apply');
if (!dry && !apply) {
  console.error('Usage: node scripts/wire-moscow-expand-to-hub.mjs --dry-run | --apply');
  process.exit(1);
}

const ed = JSON.parse(readFileSync(editorialPath, 'utf8'));
const expands = ed.filter((e) => e.role === 'expand');

function esc(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function shortDesc(row) {
  const s = String(row.shortDescription || row.description || '').trim();
  if (!s) return row.title;
  // one line for hub card; keep ~160 chars
  const one = s.split(/\n+/)[0].trim();
  return one.length > 180 ? `${one.slice(0, 177)}...` : one;
}

function inferFilter(row, parentFilter) {
  if (row.mustSeeFilter) return row.mustSeeFilter;
  const t = `${row.title} ${row.slug}`.toLowerCase();
  if (/музей|галере|третяков|гмии|гараж|бункер|импрессион/.test(t)) return 'museum';
  if (/храм|собор|монастыр|обител|церк|николай/.test(t)) return 'temple';
  if (/парк|сад|огород|царицын|коломен|кусков|сокольн|зарядь|вднх/.test(t)) return 'park';
  if (/театр|вахтанг/.test(t)) return 'main';
  if (/памятник|стена|монумент/.test(t)) return 'monument';
  if (/смотров|высотк|панорама|мост/.test(t)) return 'views';
  if (/рынок|гум|арт-объект|глина/.test(t)) return 'creative';
  if (/площад|арбат|пруд|улиц/.test(t)) return 'street';
  if (parentFilter) return parentFilter;
  return 'main';
}

function inferLinkKey(slug) {
  // museums/theaters typically venueSlug in current hub; outdoor = locationSlug
  if (
    /muzey|tretyakov|gmii|garazh|bunker|politeh|evreysk|impression|bol-shoy-teatr|planetari|moskvarium|eksperiment/.test(
      slug,
    )
  ) {
    return 'venueSlug';
  }
  return 'locationSlug';
}

function parseMustSeeBlock(src) {
  const start = src.indexOf('  moscow: {');
  if (start < 0) throw new Error('moscow block not found');
  const end = src.indexOf('\n  kazan:', start);
  if (end < 0) throw new Error('kazan marker not found after moscow');
  const block = src.slice(start, end);
  const m = block.match(/mustSee:\s*\[([\s\S]*?)\],\s*\n\s*significantSuburbs/);
  if (!m) throw new Error('mustSee array not found in moscow');
  return { start, end, block, arrayStart: start + m.index, arrayInner: m[1], fullMatch: m[0] };
}

function parseItems(arrayInner) {
  const items = [];
  // naive object split on top-level `{...}` with name field
  const re = /\{\s*name:\s*(["'])((?:\\\1|(?!\1).)*)\1([\s\S]*?)(?=\n\s*\{|\n\s*$)/g;
  // fallback simpler: find name lines
  const nameRe = /name:\s*(["'])((?:\\\1|(?!\1).)*)\1/g;
  let nm;
  const names = [];
  while ((nm = nameRe.exec(arrayInner))) {
    names.push({ name: nm[2].replace(/\\'/g, "'").replace(/\\"/g, '"'), index: nm.index });
  }
  for (let i = 0; i < names.length; i++) {
    const from = names[i].index;
    const to = i + 1 < names.length ? names[i + 1].index : arrayInner.length;
    // walk back to nearest `{`
    let brace = arrayInner.lastIndexOf('{', from);
    const chunk = arrayInner.slice(brace, to);
    const loc = chunk.match(/locationSlug:\s*['"]([^'"]+)['"]/)?.[1] || null;
    const ven = chunk.match(/venueSlug:\s*['"]([^'"]+)['"]/)?.[1] || null;
    const filter = chunk.match(/mustSeeFilter:\s*['"]([^'"]+)['"]/)?.[1] || null;
    items.push({ name: names[i].name, loc, ven, filter, chunk, brace, end: brace + chunk.length });
  }
  return items;
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'()№]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameExactMatch(a, b) {
  return norm(a) === norm(b);
}

function typeFamily(title) {
  const t = norm(title);
  if (/^(храм|собор|церковь|монастыр|обител)/.test(t)) return 'temple';
  if (/^(музей-заповедник|музей|галере)/.test(t)) return 'museum';
  if (/^(парк|сад|усадьба|огород)/.test(t)) return 'park';
  if (/^(улица|переулок)/.test(t)) return 'street';
  if (/^(смотровая|панорама)/.test(t)) return 'view';
  if (/^(памятник|стена|монумент)/.test(t)) return 'monument';
  if (/^(театр)/.test(t)) return 'theater';
  return null;
}

function coreTitle(title) {
  return norm(title)
    .replace(
      /^(храм|собор|церковь|монастырь|обитель|музей-заповедник|музей современн\w*|музей|галерея|парк|сад|усадьба|улица|переулок|смотровая площадка|смотровая|памятник|стена|монумент|театр)\s+/i,
      '',
    )
    .replace(/^«|»$/g, '')
    .trim();
}

function nearParentTitle(parentName, expandTitle) {
  const pn = norm(parentName);
  const en = norm(expandTitle);
  if (!pn || !en) return false;
  if (pn === en) return true;
  // Short editorial label inside longer official hub title («Гараж», «Кусково»).
  if (en.length >= 5 && pn.includes(en)) return true;
  if (pn.length >= 5 && en.includes(pn) && pn.length >= en.length * 0.55) return true;

  const pc = coreTitle(parentName);
  const ec = coreTitle(expandTitle);
  if (pc && ec && (pc === ec || (ec.length >= 5 && pc.includes(ec)) || (pc.length >= 5 && ec.includes(pc)))) {
    const pf = typeFamily(parentName);
    const ef = typeFamily(expandTitle);
    if (pf && ef && pf !== ef) return false;
    return true;
  }

  // Shared significant token (Пушкина, Котельнической) on single-slug expands.
  const tokens = ec
    .split(' ')
    .map((w) => w.replace(/[^a-zа-я0-9]/gi, ''))
    .filter((w) => w.length >= 6);
  if (tokens.some((w) => pn.includes(w))) {
    const pf = typeFamily(parentName);
    const ef = typeFamily(expandTitle);
    if (pf && ef && pf !== ef) return false;
    return true;
  }
  return false;
}

function buildExpandEntry(row, parentFilter) {
  const filter = inferFilter(row, parentFilter);
  const linkKey = inferLinkKey(row.slug);
  const desc = esc(shortDesc(row));
  const name = esc(row.title);
  const lat = row.latitude != null ? `, latitude: ${row.latitude}` : '';
  const lng = row.longitude != null ? `, longitude: ${row.longitude}` : '';
  return `      { name: '${name}', desc: '${desc}', mustSeeFilter: '${filter}', ${linkKey}: '${row.slug}'${lat}${lng} },`;
}

function wireFile(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const parsed = parseMustSeeBlock(src);
  const items = parseItems(parsed.arrayInner);

  const bySlug = new Map();
  for (const it of items) {
    const slug = it.loc || it.ven;
    if (!slug) continue;
    const list = bySlug.get(slug) || [];
    list.push(it);
    bySlug.set(slug, list);
  }

  const expandCountBySlug = new Map();
  for (const row of expands) {
    expandCountBySlug.set(row.slug, (expandCountBySlug.get(row.slug) || 0) + 1);
  }

  const report = { file: path.relative(root, filePath), add: [], update: [], skipDup: [] };
  const additions = [];

  for (const row of expands) {
    const siblings = bySlug.get(row.slug) || [];
    const sameName = items.find((it) => nameExactMatch(it.name, row.title));
    const parentFilter = siblings[0]?.filter || sameName?.filter || null;
    const expandSiblings = expandCountBySlug.get(row.slug) || 0;

    if (sameName) {
      report.skipDup.push({
        title: row.title,
        existing: sameName.name,
        slug: row.slug,
        reason: 'exact-name',
      });
      continue;
    }

    // Single expand on a slug that already has a hub card:
    // skip only when it's the same/near place («Гараж» ≈ full museum name).
    // Keep distinct POIs that share a hub slug (Николай на Берсеневке ≠ Патриарший мост).
    if (
      expandSiblings <= 1 &&
      siblings.length >= 1 &&
      siblings.some((s) => nameExactMatch(s.name, row.title) || nearParentTitle(s.name, row.title))
    ) {
      report.skipDup.push({
        title: row.title,
        existing: siblings.map((s) => s.name).join(' | '),
        slug: row.slug,
        reason: 'same-slug-near-parent',
      });
      continue;
    }

    // Multi-expand: skip near-duplicate of existing parent title
    // («Собор Василия» ≈ «Храм Василия»), keep true siblings (Минин, Парк Царицыно).
    if (expandSiblings > 1 && siblings.some((s) => nearParentTitle(s.name, row.title))) {
      report.skipDup.push({
        title: row.title,
        existing: siblings.map((s) => s.name).join(' | '),
        slug: row.slug,
        reason: 'near-parent-multi',
      });
      continue;
    }

    const entry = buildExpandEntry(row, parentFilter);
    additions.push({ row, entry, parentNames: siblings.map((s) => s.name) });
    report.add.push({ title: row.title, slug: row.slug, parents: siblings.map((s) => s.name) });
  }

  if (!additions.length) {
    return { ...report, changed: false, mustSeeBefore: items.length, mustSeeAfter: items.length };
  }

  // Insert additions just before closing of mustSee array (after last item).
  // Ensure the previous last object has a trailing comma (TS arrays require it).
  const insertBlock =
    `\n      // --- expand sections from must-see-editorial-moscow (${additions.length}) ---\n` +
    additions.map((a) => a.entry).join('\n') +
    '\n';

  const fullMatch = parsed.fullMatch;
  // fullMatch ends with `],\n    significantSuburbs` - inject before `],`
  // Also normalize `}\n    ]` → `},\n   ]` so inject does not create a syntax error.
  const withComma = fullMatch.replace(/\}\s*\],\s*\n\s*significantSuburbs/, '},\n    ],\n    significantSuburbs');
  const injected = withComma.replace(/\],\s*\n\s*significantSuburbs/, `${insertBlock}    ],\n    significantSuburbs`);
  const after = src.slice(0, parsed.arrayStart) + injected + src.slice(parsed.arrayStart + fullMatch.length);

  if (apply) writeFileSync(filePath, after, 'utf8');

  return {
    ...report,
    changed: true,
    dryRun: dry,
    mustSeeBefore: items.length,
    mustSeeAfter: items.length + additions.length,
  };
}

function fileExists(p) {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
}

const reports = [wireFile(cityInfoPath)];
if (fileExists(publicCityInfoPath)) {
  try {
    reports.push(wireFile(publicCityInfoPath));
  } catch (e) {
    reports.push({ file: 'apps/public/src/lib/cityInfo.ts', error: String(e.message || e) });
  }
}

console.log(JSON.stringify({ dry, apply, expands: expands.length, reports }, null, 2));
