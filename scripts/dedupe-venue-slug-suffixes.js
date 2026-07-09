/**
 * Убирает дублирующийся хвост в slug (напр. fontanki-51-53-53 → fontanki-51-53).
 *
 *   node scripts/dedupe-venue-slug-suffixes.js --dry-run
 *   node scripts/dedupe-venue-slug-suffixes.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const letters = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function publicCitySlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => letters[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function stripOpaqueVenueIdSuffix(slug) {
  const match = String(slug || '').match(/(?:^|[-_])([a-f0-9]{20,})$/i);
  if (!match) return slug;
  const suffix = match[1].toLowerCase();
  const trimmed = String(slug || '').replace(new RegExp(`[-_]${suffix}$`, 'i'), '');
  return trimmed || slug;
}

function dedupeVenueSlugSuffix(slug) {
  const parts = String(slug || '').split('-').filter(Boolean);
  if (parts.length < 2) return slug;
  if (parts[parts.length - 1] === parts[parts.length - 2]) {
    return parts.slice(0, -1).join('-');
  }
  return slug;
}

function publicVenueSlug(slug, title, id) {
  const raw = String(slug || '').trim();
  const normalized = publicCitySlug(raw);
  if (normalized && !/^[a-f0-9]{20,}$/i.test(normalized)) {
    return dedupeVenueSlugSuffix(stripOpaqueVenueIdSuffix(normalized));
  }
  const titleSlug = publicCitySlug(title) || 'venue';
  const rawId = String(id || '').replace(/^venue_/, '');
  const idSlug = publicCitySlug(rawId) || rawId;
  if (!idSlug) return dedupeVenueSlugSuffix(titleSlug);
  if (titleSlug.endsWith(`-${idSlug}`)) return dedupeVenueSlugSuffix(titleSlug);
  return dedupeVenueSlugSuffix(`${titleSlug}-${idSlug}`);
}

function venuePageTemplate(kind) {
  const institution = new Set(['MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'BAR']);
  return institution.has(String(kind || '').toUpperCase()) ? 'venues' : 'locations';
}

for (const name of ['.env', 'apps/backend/.env']) {
  const filePath = path.join(rootDir, name);
  if (!fs.existsSync(filePath)) continue;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

(async () => {
  const { rows } = await pool.query(`SELECT id, slug, title, kind::text as kind, "canonicalPath" FROM "Venue"`);
  let updated = 0;

  for (const row of rows) {
    const nextSlug = publicVenueSlug(row.slug, row.title, row.id);
    const base = venuePageTemplate(row.kind);
    const nextCanonical = `/${base}/${nextSlug}`;
    const currentSlug = dedupeVenueSlugSuffix(stripOpaqueVenueIdSuffix(publicCitySlug(row.slug)));
    if (nextSlug === currentSlug && row.canonicalPath === nextCanonical) continue;

    if (!dryRun) {
      await pool.query(
        `UPDATE "Venue" SET slug = $2, "canonicalPath" = $3, "updatedAt" = NOW() WHERE id = $1`,
        [row.id, nextSlug, nextCanonical],
      );
    }
    console.log(`${row.slug} -> ${nextSlug}`);
    updated += 1;
  }

  console.log(`Done: ${updated} ${dryRun ? '(dry-run)' : 'updated'}`);
  await pool.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
