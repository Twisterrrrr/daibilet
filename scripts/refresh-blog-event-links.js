/**
 * Обновляет /events/... ссылки в blog-articles-*.js по актуальному каталогу prod API.
 * node scripts/refresh-blog-event-links.js [--dry-run] [--api=https://api.daibilet.ru]
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');
const apiBase = (process.argv.find((arg) => arg.startsWith('--api=')) || '--api=https://api.daibilet.ru')
  .split('=')
  .slice(1)
  .join('=')
  .replace(/\/+$/, '');

const FILES = [
  path.join(__dirname, 'data', 'blog-articles-v2.js'),
  path.join(__dirname, 'data', 'blog-articles-seo-batch.js'),
];

const LINK_RE = /\[([^\]]+)\]\(\/events\/([^)]+)\)/g;
const ID_RE = /(?:^|[-_])([a-f0-9]{24})(?:[-_]|$)/i;

/** ID, устаревшие после full sync — подменяем на актуальную группу. */
const STALE_ID_REDIRECTS = new Map([
  ['69ef78ffdbd64fff6c6fea29', 'tc-69ef7932dbd64fff6c6febf0-planetarii-1'],
]);

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const text = await response.text();
  if (!text || text === 'null') return null;
  return JSON.parse(text);
}

async function loadCatalogIndex() {
  const bySlug = new Map();
  const byId = new Map();
  const byTitle = new Map();
  let offset = 0;
  const limit = 240;
  let total = Infinity;

  while (offset < total) {
    const payload = await fetchJson(`${apiBase}/api/public/events?limit=${limit}&offset=${offset}`);
    total = Number(payload?.total || 0);
    for (const item of payload?.items || []) {
      bySlug.set(item.slug, item);
      const titleKey = normalizeTitle(item.title);
      if (titleKey && !byTitle.has(titleKey)) byTitle.set(titleKey, item);
      const ids = new Set([item.id, ...(item.groupEventIds || [])]);
      for (const rawId of ids) {
        const hex = String(rawId || '').replace(/^evt_/, '');
        if (hex) byId.set(hex, item);
      }
    }
    if (!payload?.items?.length) break;
    offset += limit;
  }

  return { bySlug, byId, byTitle };
}

function normalizeTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim();
}

function extractHexId(slug) {
  const match = String(slug || '').match(ID_RE);
  return match ? match[1].toLowerCase() : null;
}

function buildSlugCandidates(slug, index) {
  const normalized = String(slug || '').trim();
  const candidates = new Set();
  if (!normalized) return candidates;

  candidates.add(normalized);

  const hex = extractHexId(normalized);
  if (hex) {
    const redirect = STALE_ID_REDIRECTS.get(hex);
    if (redirect) candidates.add(redirect);
    const fromId = index.byId.get(hex);
    if (fromId?.slug) candidates.add(fromId.slug);
  }

  const tcMatch = normalized.match(/^tc-([a-f0-9]{24})-(.+)$/i);
  if (tcMatch) candidates.add(`${tcMatch[2]}-${tcMatch[1]}`);

  if (index.bySlug.has(normalized)) candidates.add(normalized);

  return candidates;
}

async function fetchEventPage(slug) {
  try {
    return await fetchJson(`${apiBase}/api/public/events/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

async function pickWorkingSlug(slug, index, linkTitle = '') {
  const candidates = buildSlugCandidates(slug, index);

  for (const candidate of candidates) {
    const page = await fetchEventPage(candidate);
    if (page?.event?.slug) return page.event.slug;
  }

  const titleKey = normalizeTitle(linkTitle);
  if (titleKey) {
    const fromTitle = index.byTitle.get(titleKey);
    if (fromTitle?.slug) {
      const page = await fetchEventPage(fromTitle.slug);
      if (page?.event?.slug) return page.event.slug;
    }
  }

  return null;
}

async function refreshFile(filePath, index) {
  const source = fs.readFileSync(filePath, 'utf8');
  const seen = new Map();
  const replacements = [];

  let match;
  while ((match = LINK_RE.exec(source)) !== null) {
    const linkTitle = match[1];
    const oldSlug = match[2];
    if (seen.has(oldSlug)) continue;
    seen.set(oldSlug, null);
    const nextSlug = await pickWorkingSlug(oldSlug, index, linkTitle);
    seen.set(oldSlug, nextSlug);
    if (nextSlug && nextSlug !== oldSlug) {
      replacements.push({ oldSlug, nextSlug });
    } else if (!nextSlug) {
      replacements.push({ oldSlug, nextSlug: null });
    }
  }

  let nextSource = source;
  for (const { oldSlug, nextSlug } of replacements.filter((item) => item.nextSlug)) {
    const pattern = new RegExp(`\\]\\(/events/${escapeRegExp(oldSlug)}\\)`, 'g');
    nextSource = nextSource.replace(pattern, `](/events/${nextSlug})`);
  }

  if (nextSource !== source && !dryRun) {
    fs.writeFileSync(filePath, nextSource, 'utf8');
  }

  return replacements;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  console.log(`[blog-links] api=${apiBase} dryRun=${dryRun}`);
  const index = await loadCatalogIndex();
  console.log(`[blog-links] catalog slugs=${index.bySlug.size} ids=${index.byId.size}`);

  for (const filePath of FILES) {
    const replacements = await refreshFile(filePath, index);
    const updated = replacements.filter((item) => item.nextSlug);
    const missing = replacements.filter((item) => !item.nextSlug);
    console.log(`\n${path.basename(filePath)}`);
    console.log(`  updated: ${updated.length}`);
    for (const item of updated.slice(0, 20)) {
      console.log(`    ${item.oldSlug} -> ${item.nextSlug}`);
    }
    if (updated.length > 20) console.log(`    ... +${updated.length - 20} more`);
    if (missing.length) {
      console.log(`  unresolved: ${missing.length}`);
      for (const item of missing.slice(0, 10)) {
        console.log(`    ${item.oldSlug}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
