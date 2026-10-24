import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const WEB_ROOT = path.resolve(__dirname, '../..');
const PAGE = path.join(WEB_ROOT, 'app/blog/[slug]/page.tsx');

/**
 * Three articles exist(ed) on the same subject - Bylinny Bereg + Fentezi Fest
 * on the Volkhov. `bylinnyy-bereg-fentezi-fest` was already redirected, but the
 * `-volhov` variant was missed and stayed a fully indexable page: 200,
 * self-canonical, isIndexable=true, listed in blog.xml. Two indexable pages on
 * one query split its signals.
 *
 * A soft canonical was not an option: resolveBlogArticleCanonicalPath only
 * accepts a canonicalPath equal to the article's own slug, so a cross-article
 * canonical is rejected by design. A 301 is the correct treatment.
 */
test('the missed Fentezi Fest duplicate redirects to the live canonical', () => {
  const source = fs.readFileSync(PAGE, 'utf8');
  assert.match(
    source,
    /'bylinnyy-bereg-fentezi-fest-volhov':\s*'\/blog\/fentezi-fest-bylinnyy-bereg'/,
  );
});

test('every blog redirect target is a path shape the page can serve', () => {
  const source = fs.readFileSync(PAGE, 'utf8');
  const block = source.slice(
    source.indexOf('const BLOG_SLUG_REDIRECTS'),
    source.indexOf('};', source.indexOf('const BLOG_SLUG_REDIRECTS')),
  );
  const entries = [...block.matchAll(/'([^']+)':\s*'([^']+)'/g)];
  assert.ok(entries.length >= 3, `expected at least 3 redirects, found ${entries.length}`);
  for (const [, from, to] of entries) {
    assert.doesNotMatch(to, /\/\/|\s/, `redirect target must be a clean path: ${to}`);
    assert.ok(to.startsWith('/blog/'), `redirect target must live under /blog/: ${to}`);
    assert.notEqual(from, to.replace(/^\/blog\//, ''), 'redirect must not be a self-redirect');
  }
});

test('redirected slugs are excluded from generateStaticParams', () => {
  // generateStaticParams filters BLOG_SLUG_REDIRECTS out, so a redirected slug
  // must never be prebuilt as a real page.
  const source = fs.readFileSync(PAGE, 'utf8');
  assert.match(source, /BLOG_POSTS\.filter\(\(post\) => post\.slug && !BLOG_SLUG_REDIRECTS\[post\.slug\]\)/);
  assert.match(source, /permanentRedirect\(redirectTo\)/);
});

test('the redirect is one reversible map entry', () => {
  // Documented escape hatch: delete the one line to restore the page.
  const source = fs.readFileSync(PAGE, 'utf8');
  const volhovLines = source
    .split('\n')
    .filter((l) => l.includes('bylinnyy-bereg-fentezi-fest-volhov'));
  assert.equal(volhovLines.length, 1, 'expected exactly one redirect entry for the -volhov slug');
});
