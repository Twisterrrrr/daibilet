import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveBlogShareImage } from './blog-article-seo';

describe('resolveBlogShareImage', () => {
  it('uses absolute *-og.jpg when the asset exists on disk', () => {
    const url = resolveBlogShareImage('/images/blog/fentezi-fest-bylinnyy-bereg.jpg');
    assert.equal(url, 'https://daibilet.ru/images/blog/fentezi-fest-bylinnyy-bereg-og.jpg');
  });

  it('falls back to cover URL when *-og.jpg is missing', () => {
    const url = resolveBlogShareImage('/images/blog/definitely-missing-og-slug-xyz.jpg');
    assert.equal(url, 'https://daibilet.ru/images/blog/definitely-missing-og-slug-xyz.jpg');
  });

  it('returns undefined for empty cover', () => {
    assert.equal(resolveBlogShareImage(null), undefined);
    assert.equal(resolveBlogShareImage('  '), undefined);
  });
});
