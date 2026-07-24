#!/usr/bin/env node
/**
 * Upsert статей из content/blog/*.md в таблицу Article.
 * По умолчанию status из frontmatter (обычно PUBLISHED).
 *
 * Usage:
 *   node scripts/blog-upsert-articles.js
 *   node scripts/blog-upsert-articles.js --slug=moskva-kvesty-escape-room
 *   node scripts/blog-upsert-articles.js --status=REVIEW
 *   node scripts/blog-upsert-articles.js --force-published-at
 *
 * Frontmatter `publishedAt` (ISO) задаёт дату публикации / расписания.
 * Без --force-published-at существующий publishedAt в БД не перезаписывается (coalesce).
 * С --force-published-at - всегда пишет значение из frontmatter (или now при PUBLISHED).
 *
 * Требует DATABASE_URL (или default local postgres).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createDb } from '../apps/backend/src/db.js';
import { blogCitySlugAliases, canonicalBlogCitySlug } from '../apps/backend/src/blog-city-slug.js';
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
const forcePublishedAt = hasFlag('force-published-at');

function resolvePublishedAt(meta, status) {
  const raw = meta.publishedAt != null ? String(meta.publishedAt).trim() : '';
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (status === 'PUBLISHED') return new Date().toISOString();
  return null;
}

const db = createDb(rootDir);

async function resolveCityId(citySlug) {
  if (!citySlug) return null;
  const aliases = blogCitySlugAliases(canonicalBlogCitySlug(citySlug) || citySlug);
  if (!aliases.length) return null;
  const { rows } = await db.query(`select id from "City" where slug = any($1::text[]) limit 1`, [aliases]);
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
  const citySlug = canonicalBlogCitySlug(meta.citySlug) || meta.citySlug || null;
  const cityId = await resolveCityId(citySlug);
  const authorId = meta.authorId || (meta.author === 'Макс' ? 'max' : null) || 'editorial';
  const authorName =
    meta.authorName || meta.author || meta.persona || (authorId === 'editorial' ? 'Редакция' : authorId);
  const articleType = String(meta.articleType || meta.tag || 'gid')
    .toLowerCase()
    .replace('колонка', 'column')
    .replace('гид', 'gid')
    .replace('обзор', 'obzor')
    .replace('дайджест', 'digest');
  const normalizedType = ['gid', 'column', 'digest', 'obzor'].includes(articleType)
    ? articleType
    : meta.tag === 'Колонка'
      ? 'column'
      : 'gid';
  const publishedAt = resolvePublishedAt(meta, status);

  if (dryRun) {
    console.log(
      `[dry-run] ${slug} status=${status} publishedAt=${publishedAt || '-'} force=${forcePublishedAt} city=${meta.citySlug || '-'} author=${authorId} type=${normalizedType} chars=${content.length}`,
    );
    return;
  }

  const existing = await db.query(`select id from "Article" where slug = $1 limit 1`, [slug]);
  if (existing.rows[0]?.id) {
    const publishedAtSql = forcePublishedAt
      ? `"publishedAt" = $17::timestamptz`
      : `"publishedAt" = coalesce("publishedAt", $17::timestamptz)`;
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
          "citySlug" = $8,
          "authorId" = $9,
          "authorName" = $10,
          "articleType" = $11,
          "seoH1" = $12,
          "seoTitle" = $13,
          "seoDescription" = $14,
          "canonicalPath" = $15,
          "isIndexable" = $16,
          ${publishedAtSql},
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
        citySlug,
        authorId,
        authorName,
        normalizedType,
        seoH1,
        seoTitle,
        seoDescription,
        canonicalPath,
        isIndexable,
        publishedAt,
      ],
    );
    console.log(
      `updated ${slug} (${status}) publishedAt=${publishedAt || '-'} force=${forcePublishedAt} author=${authorId} type=${normalizedType}`,
    );
    return;
  }

  const id = randomUUID().replace(/-/g, '').slice(0, 24);
  await db.query(
    `
      insert into "Article" (
        id, slug, status, title, excerpt, content, "coverImageUrl", "cityId", "citySlug",
        "authorId", "authorName", "articleType",
        "seoH1", "seoTitle", "seoDescription", "canonicalPath", "isIndexable",
        "publishedAt", "createdAt", "updatedAt"
      ) values (
        $1, $2, $3::"ArticleStatus", $4, $5, $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18::timestamptz, now(), now()
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
      citySlug,
      authorId,
      authorName,
      normalizedType,
      seoH1,
      seoTitle,
      seoDescription,
      canonicalPath,
      isIndexable,
      publishedAt,
    ],
  );
  console.log(`inserted ${slug} (${status}) author=${authorId} type=${normalizedType}`);
}

const articles = loadBlogMarkdownDir(contentDir).filter((a) => !onlySlug || a.slug === onlySlug);
if (!articles.length) {
  console.error('No articles found in content/blog');
  process.exit(1);
}

/** PUBLISHED guides should keep 1-2 distinct inline images in body (not just cover). */
function warnMissingInlineImages(article) {
  const status = String(article.meta?.status || '').toUpperCase();
  if (status !== 'PUBLISHED') return;
  const body = String(article.body || '');
  const shortcodes = body.match(/\[image\s+[^\]]+\]/gi) || [];
  const mdImgs = body.match(/^!\[[^\]]*\]\([^)]+\)/gm) || [];
  const count = shortcodes.length + mdImgs.length;
  if (count < 1) {
    console.warn(`[warn] ${article.slug}: PUBLISHED without inline [image]/![...](...) in body`);
  }
}

for (const article of articles) {
  warnMissingInlineImages(article);
  await upsertArticle(article);
}

console.log(`blog-upsert-articles: done (${articles.length})`);
process.exit(0);
