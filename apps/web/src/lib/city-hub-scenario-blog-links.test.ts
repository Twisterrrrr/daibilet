import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CITY_INFO_SOURCE = fs.readFileSync(path.join(HERE, 'cityInfo-data.ts'), 'utf8');
const BLOG_POSTS_SOURCE = fs.readFileSync(
  path.join(HERE, '..', 'data', 'blog-posts.ts'),
  'utf8',
);
const CONTENT_BLOG_DIR = path.join(HERE, '..', '..', '..', '..', 'content', 'blog');

/** `slug: '...'` entries inside the published BLOG_POSTS canon. */
function staticBlogSlugs(): string[] {
  const start = BLOG_POSTS_SOURCE.indexOf('export const BLOG_POSTS');
  const block = start >= 0 ? BLOG_POSTS_SOURCE.slice(start) : BLOG_POSTS_SOURCE;
  return [...block.matchAll(/^\s*slug:\s*['"]([^'"]+)['"]/gm)].map((match) => match[1]);
}

/** CMS-only articles that `/blog/[slug]` serves from content/blog (PUBLISHED only). */
function cmsPublishedSlugs(): string[] {
  if (!fs.existsSync(CONTENT_BLOG_DIR)) return [];
  const out: string[] = [];
  for (const file of fs.readdirSync(CONTENT_BLOG_DIR)) {
    if (!file.endsWith('.md')) continue;
    const source = fs.readFileSync(path.join(CONTENT_BLOG_DIR, file), 'utf8');
    if (!/^status:\s*PUBLISHED\s*$/m.test(source)) continue;
    const slug = source.match(/^slug:\s*(.+?)\s*$/m)?.[1] || file.replace(/\.md$/, '');
    out.push(slug.replace(/^['"]|['"]$/g, ''));
  }
  return out;
}

/**
 * Scenario cards render `/blog/{blogSlug}` as a "Читать об этом в блоге" link.
 * A slug missing from BLOG_POSTS is a live 404 on every city hub that uses the
 * preset, so the data must stay inside the published article canon.
 */
test('every city-hub scenario blogSlug resolves to a published article', () => {
  const slugs = [...CITY_INFO_SOURCE.matchAll(/blogSlug:\s*['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  );
  const known = new Set([...staticBlogSlugs(), ...cmsPublishedSlugs()]);
  const missing = [...new Set(slugs.filter((slug) => !known.has(slug)))];
  assert.deepEqual(missing, [], `Unknown blog slugs: ${missing.join(', ')}`);
});
