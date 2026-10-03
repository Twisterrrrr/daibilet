import assert from 'node:assert/strict';
import test from 'node:test';

import {
  landingContentPackSlugs,
  resolveLandingContentPack,
} from '../data/landing-content-packs.ts';

test('content packs cover GPT matrix A-G', () => {
  const expected = [
    'new-year',
    'planetarium',
    'rooftops',
    'country-tours',
    'river-party',
    'family-kids',
    'bridges-night',
  ];
  for (const slug of expected) {
    const pack = resolveLandingContentPack(slug);
    assert.ok(pack, `missing pack for ${slug}`);
    assert.equal(pack!.howToSteps.length, 4);
    assert.ok(pack!.faq.length >= 4);
    assert.ok(pack!.checklist.length >= 4);
    assert.equal(pack!.howToTitle.includes('—') || pack!.howToTitle.includes('–'), false);
  }
  assert.ok(landingContentPackSlugs().includes('bridges-night'));
});

test('bridges alias resolves content pack', () => {
  assert.equal(resolveLandingContentPack('night-bridges')?.slug, 'bridges-night');
});
