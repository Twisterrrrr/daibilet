const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

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

function buildPublicVenueSlug(title, id) {
  const titleSlug = publicCitySlug(title) || 'venue';
  const rawId = String(id || '').replace(/^venue_/, '');
  const idSlug = publicCitySlug(rawId) || rawId;
  return idSlug ? `${titleSlug}-${idSlug}` : titleSlug;
}

function publicVenueSlug(slug, title, id) {
  const raw = String(slug || '').trim();
  const normalized = publicCitySlug(raw);
  if (normalized && !/^[a-f0-9]{20,}$/i.test(normalized)) return normalized;
  if (title && id) return buildPublicVenueSlug(title, id);
  return normalized || raw;
}

function venuePageTemplate(kind) {
  const institution = new Set([
    'museum_art_space', 'theater', 'concert_hall', 'bar', 'club_bar_restaurant',
  ]);
  const normalized = String(kind || '').trim().toUpperCase().replace(/-/g, '_');
  return institution.has(normalized) ? 'institution' : 'location';
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query(`
    select venue.id, venue.slug, venue.title, venue.kind, venue."canonicalPath"
    from "Venue" venue
    order by venue.title
  `);

  let updated = 0;
  for (const row of rows) {
    const nextSlug = publicVenueSlug(row.slug, row.title, row.id);
    const basePath = venuePageTemplate(row.kind) === 'location' ? '/locations' : '/venues';
    const nextCanonical = `${basePath}/${nextSlug}`;
    if (nextSlug === row.slug && row.canonicalPath === nextCanonical) continue;

    if (!dryRun) {
      await pool.query(
        `update "Venue" set slug = $2, "canonicalPath" = $3, "updatedAt" = now() where id = $1`,
        [row.id, nextSlug, nextCanonical],
      );
    }
    updated += 1;
    console.log(`${row.slug} -> ${nextSlug}`);
  }

  console.log(`[venue-slugs] updated=${updated} dryRun=${dryRun}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
