#!/usr/bin/env node
/**
 * Upsert статей из content/blog/*.md в таблицу Article.
 * По умолчанию status из frontmatter (обычно PUBLISHED).
 *
 * Usage:
 *   node scripts/blog-upsert-articles.js
 *   node scripts/blog-upsert-articles.js --slug=moskva-kvesty-escape-room
 *   node scripts/blog-upsert-articles.js --status=REVIEW
 *
 * Требует DATABASE_URL (или default local postgres).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createDb } from '../apps/backend/src/db.js';
import { loadBlogMarkdownDir } from './lib/blog-content.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(rootDir, 'content', 'blog');

function argValue(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const onlySlug = argValue('slug');
const statusOverride = argValue('status');
const dryRun = hasFlag('dry-run');

const db = createDb(rootDir);

async function resolveCityId(citySlug) {
  if (!citySlug) return null;
  const { rows } = await db.query(`select id from "City" where slug = $1 limit 1`, [citySlug]);
  return rows[0]?.id || null;
}

async function upsertArticle(article) {
  const meta = article.meta;
  const slug = article.slug;
  const title = meta.title || slug;
  const excerpt = meta.excerpt || null;
  const content = article.body;
  const coverImageUrl = meta.coverImageUrl || `/images/blog/${slug}.jpg`;
  const status = String(statusOverride || meta.status || 'PUBLISHED').toUpperCase();
  const seoTitle = meta.seoTitle || `${title} | Дайбилет`;
  const seoDescription = meta.seoDescription || excerpt;
  const seoH1 = meta.seoH1 || title;
  const canonicalPath = meta.canonicalPath || `/blog/${slug}`;
  const isIndexable = status === 'PUBLISHED';
  const cityId = await resolveCityId(meta.citySlug);
  const publishedAt = status === 'PUBLISHED' ? new Date().toISOString() : null;

  if (dryRun) {
    console.log(`[dry-run] ${slug} status=${status} city=${meta.citySlug || '-'} chars=${content.length}`);
    return;
  }

  const existing = await db.query(`select id from "Article" where slug = $1 limit 1`, [slug]);
  if (existing.rows[0]?.id) {
    await db.query(
      `
        update "Article"
        set
          status = $2::"ArticleStatus",
          title = $3,
          excerpt = $4,
          content = $5,
          "coverImageUrl" = $6,
          "cityId" = $7,
          "seoH1" = $8,
          "seoTitle" = $9,
          "seoDescription" = $10,
          "canonicalPath" = $11,
          "isIndexable" = $12,
          "publishedAt" = coalesce("publishedAt", $13::timestamptz),
          "updatedAt" = now()
        where id = $1
      `,
      [
        existing.rows[0].id,
        status,
        title,
        excerpt,
        content,
        coverImageUrl,
        cityId,
        seoH1,
        seoTitle,
        seoDescription,
        canonicalPath,
        isIndexable,
        publishedAt,
      ],
    );
    console.log(`updated ${slug} (${status})`);
    return;
  }

  const id = randomUUID().replace(/-/g, '').slice(0, 24);
  await db.query(
    `
      insert into "Article" (
        id, slug, status, title, excerpt, content, "coverImageUrl", "cityId",
        "seoH1", "seoTitle", "seoDescription", "canonicalPath", "isIndexable",
        "publishedAt", "createdAt", "updatedAt"
      ) values (
        $1, $2, $3::"ArticleStatus", $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14::timestamptz, now(), now()
      )
    `,
    [
      id,
      slug,
      status,
      title,
      excerpt,
      content,
      coverImageUrl,
      cityId,
      seoH1,
      seoTitle,
      seoDescription,
      canonicalPath,
      isIndexable,
      publishedAt,
    ],
  );
  console.log(`inserted ${slug} (${status})`);
}

const articles = loadBlogMarkdownDir(contentDir).filter((a) => !onlySlug || a.slug === onlySlug);
if (!articles.length) {
  console.error('No articles found in content/blog');
  process.exit(1);
}

for (const article of articles) {
  await upsertArticle(article);
}

console.log(`blog-upsert-articles: done (${articles.length})`);
process.exit(0);
