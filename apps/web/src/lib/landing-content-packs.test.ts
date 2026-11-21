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

test('all content packs meet the wave-2 quality bar', () => {
  for (const slug of landingContentPackSlugs()) {
    // active-sport is out of the podborki selection (owner 2026-10-11); its
    // pack stays as-is for the still-reachable direct URL.
    if (slug === 'active-sport') continue;
    const pack = resolveLandingContentPack(slug);
    assert.ok(pack, `missing pack for ${slug}`);
    // standup howTo is three steps by design.
    assert.ok(pack!.howToSteps.length >= 3, `${slug}: howToSteps >= 3`);
    assert.ok(pack!.faq.length >= 5, `${slug}: faq >= 5, got ${pack!.faq.length}`);
    assert.ok(pack!.checklist.length >= 4, `${slug}: checklist >= 4, got ${pack!.checklist.length}`);
    assert.equal(pack!.howToTitle.includes('—') || pack!.howToTitle.includes('–'), false, `${slug}: title dash`);
    for (const item of pack!.faq) {
      assert.ok(item.question.trim() && item.answer.trim(), `${slug}: empty faq item`);
    }
  }
});

test('wave-2 holiday packs resolve with full faq', () => {
  assert.equal(resolveLandingContentPack('salute-9-may')?.faq.length, 5);
  assert.equal(resolveLandingContentPack('moscow-city-day')?.faq.length, 5);
  assert.ok(resolveLandingContentPack('salute-9-may')!.checklist.length >= 4);
  assert.ok(resolveLandingContentPack('moscow-city-day')!.checklist.length >= 4);
});
