/**
 * TDD red: isVenuePublic contract for broken-venues 2026-09-25.
 * Do NOT add to scripts/ci-test-files.txt until Codex implements (green).
 * Run: node --import tsx --test src/lib/venue-public.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isVenuePublic } from './venue-public.ts';

describe('isVenuePublic (broken venues Group A/B)', () => {
  it('1. CANDIDATE + events≥1 → public (Group A)', () => {
    assert.equal(
      isVenuePublic({ pageStatus: 'CANDIDATE', events: 3 }),
      true,
      'candidate with events must be eligible for list/sitemap/detail',
    );
  });

  it('2. NONE + events → not public (Group B)', () => {
    assert.equal(
      isVenuePublic({ pageStatus: 'NONE', events: 68 }),
      false,
      'NONE must be excluded from list and sitemap even with events',
    );
  });

  it('3. PUBLISHED + events≥1 → public', () => {
    assert.equal(
      isVenuePublic({ pageStatus: 'PUBLISHED', events: 1 }),
      true,
    );
  });

  it('4. HIDDEN → never public', () => {
    assert.equal(
      isVenuePublic({ pageStatus: 'HIDDEN', events: 10 }),
      false,
    );
  });

  it('5. CANDIDATE + events=0 → not public', () => {
    assert.equal(
      isVenuePublic({ pageStatus: 'candidate', events: 0 }),
      false,
      'candidate without events must not enter sitemap/list',
    );
  });
});
