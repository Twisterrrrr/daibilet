import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_OG_IMAGE } from './seo-meta.ts';
import { resolveBlogShareImage } from './blog-og-image.ts';

describe('resolveBlogShareImage', () => {
  it('uses absolute *-og.jpg when the asset exists on disk', () => {
    const url = resolveBlogShareImage('/images/blog/fentezi-fest-bylinnyy-bereg.jpg', 'fentezi-fest-bylinnyy-bereg');
    assert.ok(url.endsWith('/images/blog/fentezi-fest-bylinnyy-bereg-og.jpg'));
    assert.match(url, /^https:\/\//);
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
