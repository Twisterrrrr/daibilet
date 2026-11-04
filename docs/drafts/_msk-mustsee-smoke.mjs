import { readFileSync } from 'node:fs';

const ed = JSON.parse(
  readFileSync(new URL('../../scripts/data/must-see-editorial-moscow.json', import.meta.url), 'utf8'),
);
const bySlug = new Map();
for (const e of ed) {
  if (!bySlug.has(e.slug)) bySlug.set(e.slug, []);
  bySlug.get(e.slug).push(e);
}

const sampleSlugs = [
  'moscow-pamyatnik-a-s-pushkinu',
  'moscow-art-obekt-bolshaya-glina-4',
  'moscow-izmaylovskiy-park',
  'moscow-izmaylovskiy-park-i-kreml',
  'moscow-kafe-pushkin',
  'moscow-usadba-izmaylovo',
  'moscow-pamyatnik-yuriyu-gagarinu',
  'moscow-monument-rabochiy-i-kolhoznitsa',
  'moscow-moskovskiy-kreml',
  'moscow-park-gorkogo',
  'moscow-staryy-arbat',
  'moscow-pamyatnik-petru-i',
  'moscow-pamyatnik-vladimiru-velikomu',
  'moscow-pamyatnik-marshalu-zhukovu',
  'moscow-pamyatnik-yuriyu-dolgorukomu',
];

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}

function decode(s) {
  return s
    ? s
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
    : s;
}

async function fetchPage(path) {
  const url = 'https://daibilet.ru' + path;
  const res = await fetch(url, { redirect: 'manual' });
  const status = res.status;
  const loc = res.headers.get('location');
  let html = '';
  if (status >= 200 && status < 300) html = await res.text();
  return { status, loc, html, url };
}

function analyze(html) {
  const title = decode(pick(html, /<title[^>]*>([^<]*)<\/title>/i));
  const h1Raw = pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = decode(h1Raw?.replace(/<[^>]+>/g, ''));
  const canonical =
    pick(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
    pick(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const og =
    pick(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    pick(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const ldBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return { parseError: true, raw: m[1].slice(0, 120) };
      }
    },
  );
  const types = [];
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (o['@type']) types.push(o['@type']);
    if (o['@graph']) walk(o['@graph']);
    for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v);
  };
  ldBlocks.forEach(walk);
  const expandHits = ['Окуджава', 'Цоя', 'Вахтангов'].map((t) => ({
    t,
    count: (html.match(new RegExp(t, 'g')) || []).length,
  }));
  const imgBrokenHints = (html.match(/src=["'][^"']*(undefined|null)[^"']*["']/gi) || []).length;
  return {
    title,
    h1,
    canonical,
    og,
    ldTypes: [...new Set(types.flat())],
    ldParseErrors: ldBlocks.filter((b) => b?.parseError).length,
    expandHits,
    imgBrokenHints,
    htmlLen: html.length,
  };
}

function titleRoughMatch(h1, expected) {
  if (!h1 || !expected) return null;
  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/[«»""']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const a = norm(h1);
  const b = norm(expected);
  if (a === b) return true;
  if (a.includes(b.slice(0, 18)) || b.includes(a.slice(0, 18))) return true;
  return false;
}

const results = [];
for (const slug of sampleSlugs) {
  const rows = bySlug.get(slug) || [];
  const expectedTitle = rows.length === 1 ? rows[0].title : rows.map((r) => r.title).join(' | ');
  const path = '/locations/' + slug;
  const page = await fetchPage(path);
  const a = page.html ? analyze(page.html) : {};
  const titleOk =
    rows.length === 1 ? titleRoughMatch(a.h1, rows[0].title) : rows.length > 1 ? 'multi-expand-hub' : null;
  results.push({
    slug,
    role: rows.map((r) => r.role).join('|'),
    expected: expectedTitle,
    status: page.status,
    loc: page.loc,
    h1: a.h1,
    title: a.title,
    canonical: a.canonical,
    og: a.og,
    ld: a.ldTypes,
    ldErr: a.ldParseErrors,
    expand: a.expandHits,
    titleOk,
    imgBrokenHints: a.imgBrokenHints,
  });
}

for (const path of ['/cities/moscow', '/cities/moskva']) {
  const page = await fetchPage(path);
  const a = page.html ? analyze(page.html) : {};
  const okud = (page.html.match(/Окуджава/g) || []).length;
  const tsoy = (page.html.match(/Цоя/g) || []).length;
  const vakht = (page.html.match(/Вахтангов/g) || []).length;
  results.push({
    slug: path,
    role: 'hub',
    expected: null,
    status: page.status,
    loc: page.loc,
    h1: a.h1,
    title: a.title,
    canonical: a.canonical,
    og: a.og,
    ld: a.ldTypes,
    expand: { okud, tsoy, vakht },
    mustSeeMentions: (page.html.match(/Стоит увидеть|Что посмотреть|mustSee/gi) || []).length,
  });
}

console.log(JSON.stringify(results, null, 2));
