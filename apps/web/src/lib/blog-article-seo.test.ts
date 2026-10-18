import assert from 'node:assert/strict';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { DEFAULT_OG_IMAGE } from './seo-meta.ts';
import { resolveBlogShareImage } from './blog-og-image.ts';

describe('resolveBlogShareImage', () => {
  it('uses absolute *-og.jpg when the asset exists on disk', () => {
    // apps/web/public/images is gitignored - seed a temporary fixture so this
    // test is self-contained in any fresh clone (no binary assets in git).
    const dir = path.join(process.cwd(), 'public', 'images', 'blog');
    const file = path.join(dir, '__og-fixture-test-og.jpg');
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, 'fixture');
    try {
      const url = resolveBlogShareImage(
        '/images/blog/__og-fixture-test.jpg',
        '__og-fixture-test',
      );
      assert.ok(url.endsWith('/images/blog/__og-fixture-test-og.jpg'));
      assert.match(url, /^https:\/\//);
    } finally {
      unlinkSync(file);
    }
  });

  it('falls back to default-og.jpg when *-og.jpg is missing', () => {
    const url = resolveBlogShareImage(
      '/images/blog/definitely-missing-og-slug-xyz.jpg',
      'definitely-missing-og-slug-xyz',
    );
    assert.equal(url, DEFAULT_OG_IMAGE);
    assert.ok(url.endsWith('/images/og/default-og.jpg'));
  });

  it('returns default OG for empty cover', () => {
    assert.equal(resolveBlogShareImage(null), DEFAULT_OG_IMAGE);
    assert.equal(resolveBlogShareImage('  '), DEFAULT_OG_IMAGE);
  });
});
