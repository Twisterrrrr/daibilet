/**
 * Seed blog articles (rich content + event links + CTAs).
 * Обложки: /images/blog/{slug}.jpg — см. scripts/data/blog-cover-path.js
 * node scripts/seed-blog-articles.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { randomUUID } = require('node:crypto');
const { blogCoverPath } = require('./data/blog-cover-path');

const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');
const ARTICLES_V2 = require('./data/blog-articles-v2.js');
const ARTICLES_SEO_BATCH = require('./data/blog-articles-seo-batch.js');
const ARTICLES = [...ARTICLES_V2, ...ARTICLES_SEO_BATCH];

function loadEnv() {
  for (const name of ['.env', 'apps/backend/.env']) {
    const filePath = path.join(rootDir, name);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

async function findCityId(client, cityName) {
  if (!cityName) return null;
  const { rows } = await client.query(`select id from "City" where lower(trim(title)) = lower(trim($1)) limit 1`, [cityName]);
  return rows[0]?.id || null;
}

async function main() {
  loadEnv();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();

  try {
    let inserted = 0;
    let updated = 0;

    for (const article of ARTICLES) {
      const cityId = await findCityId(client, article.city);
      const coverImageUrl = article.coverImageUrl || blogCoverPath(article.slug);
      const seoTitle = article.seoTitle || article.title;
      const seoDescription = article.seoDescription || article.excerpt;
      const { rows } = await client.query(`select id from "Article" where slug = $1 limit 1`, [article.slug]);

      if (dryRun) {
        console.log(`${rows[0] ? 'update' : 'insert'}: ${article.slug}`);
        continue;
      }

      if (rows[0]) {
        await client.query(
          `
            update "Article"
            set
              title = $2,
              excerpt = $3,
              content = $4,
              "coverImageUrl" = $5,
              "cityId" = $6,
              status = 'PUBLISHED'::"ArticleStatus",
              "isIndexable" = true,
              "seoTitle" = $7,
              "seoDescription" = $8,
              "canonicalPath" = $9,
              "publishedAt" = coalesce("publishedAt", $10::timestamptz),
              "updatedAt" = now()
            where id = $1
          `,
          [
            rows[0].id,
            article.title,
            article.excerpt,
            article.content,
            coverImageUrl,
            cityId,
            seoTitle,
            seoDescription,
            `/blog/${article.slug}`,
            article.publishedAt,
          ],
        );
        updated += 1;
      } else {
        const id = `article_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
        await client.query(
          `
            insert into "Article" (
              id, slug, status, title, excerpt, content, "coverImageUrl", "cityId",
              "seoTitle", "seoDescription", "canonicalPath", "isIndexable",
              "publishedAt", "createdAt", "updatedAt"
            )
            values (
              $1, $2, 'PUBLISHED', $3, $4, $5, $6, $7,
              $8, $9, $10, true,
              $11::timestamptz, now(), now()
            )
          `,
          [
            id,
            article.slug,
            article.title,
            article.excerpt,
            article.content,
            coverImageUrl,
            cityId,
            seoTitle,
            seoDescription,
            `/blog/${article.slug}`,
            article.publishedAt,
          ],
        );
        inserted += 1;
      }
    }

    console.log(`${dryRun ? '[DRY RUN] ' : ''}inserted: ${inserted}, updated: ${updated}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
