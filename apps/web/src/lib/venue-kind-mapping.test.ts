import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PRISMA_VENUE_KINDS,
  VENUE_KIND_MAP,
  venueChip,
  venueFamily,
  venueKindLabel,
  venueTemplate,
} from './venue-kind-mapping.ts';

describe('venue-kind-mapping', () => {
  it('exports helpers for every Prisma kind', () => {
    for (const kind of PRISMA_VENUE_KINDS) {
      assert.ok(VENUE_KIND_MAP[kind], kind);
      assert.equal(venueFamily(kind), VENUE_KIND_MAP[kind].family);
      assert.equal(venueTemplate(kind), VENUE_KIND_MAP[kind].template);
      assert.ok(venueKindLabel(kind));
      assert.ok(venueChip(kind));
    }
  });

  it('institution set is only museum/theater/hall/club', () => {
    const institutions = PRISMA_VENUE_KINDS.filter((k) => venueFamily(k) === 'institution');
    assert.deepEqual(institutions.sort(), [
      'CLUB_BAR_RESTAURANT',
      'CONCERT_HALL',
      'MUSEUM_ART_SPACE',
      'THEATER',
    ]);
  });

  it('public aliases resolve to same family as Prisma enum', () => {
    assert.equal(venueFamily('museum'), venueFamily('MUSEUM_ART_SPACE'));
    assert.equal(venueFamily('park'), venueFamily('PARK'));
    assert.equal(venueFamily('gastro'), venueFamily('GASTRO'));
    assert.equal(venueFamily('temple'), 'location');
    assert.equal(venueFamily('bus'), 'location');
  });
});
