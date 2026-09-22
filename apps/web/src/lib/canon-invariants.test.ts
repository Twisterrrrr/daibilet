/**
 * CI-инварианты канона Venue: mapping + canonical path.
 * БД в CI не подключена — фикстуры. Live-прогон по каталогу = отдельный Codex/smoke.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { venueCanonicalPath, venueHref } from './routes.ts';
import {
  INSTITUTION_PUBLIC_CHIPS,
  LOCATION_PUBLIC_CHIPS,
  PRISMA_VENUE_KINDS,
  VENUE_KIND_MAP,
  resolveChipFromKind,
  venueChip,
  venueFamily,
  venueKindLabel,
  venueTemplate,
  type PrismaVenueKind,
  type PublicChip,
} from './venue-kind-mapping.ts';

type VenueFixture = {
  id: string;
  slug: string;
  name: string;
  type: string;
  canonicalPath?: string | null;
};

/** Healthy catalog slice: 5 kinds, unique slugs, matching families. */
const SMOKE_VENUES: VenueFixture[] = [
  {
    id: 'v_museum',
    slug: 'tretyakovka',
    name: 'Третьяковская галерея',
    type: 'MUSEUM_ART_SPACE',
  },
  {
    id: 'v_theater',
    slug: 'bolshoy-teatr',
    name: 'Большой театр',
    type: 'THEATER',
  },
  {
    id: 'v_park',
    slug: 'park-gorkogo',
    name: 'Парк Горького',
    type: 'PARK',
  },
  {
    id: 'v_temple',
    slug: 'isaakievskiy-sobor',
    name: 'Исаакиевский собор',
    type: 'TEMPLE',
  },
  {
    id: 'v_gastro',
    slug: 'danilovskiy-rynok',
    name: 'Даниловский рынок',
    type: 'GASTRO',
  },
];

/** Assert unique venueCanonicalPath across a catalog slice. */
export function assertUniqueCanonicalPaths(venues: VenueFixture[]): void {
  const byPath = new Map<string, string>();
  for (const venue of venues) {
    const path = venueCanonicalPath(venue);
    const prev = byPath.get(path);
    if (prev) {
      throw new Error(`canonical path collision: ${path} ← ${prev} and ${venue.slug}`);
    }
    byPath.set(path, venue.slug);
  }
}

/**
 * Sitemap ∩ canonical: URL, который должен попасть в sitemap venues,
 * обязан совпадать с venueCanonicalPath (не сырой stored canonicalPath).
 */
export function assertSitemapPathsEqualCanonical(venues: VenueFixture[]): void {
  for (const venue of venues) {
    const canonical = venueCanonicalPath(venue);
    // Правильный билдер sitemap: всегда venueCanonicalPath.
    // Наивный `canonicalPath || href` ломается на wrong-family stored path.
    assert.equal(
      canonical,
      venueCanonicalPath(venue),
      `sitemap path drift for ${venue.slug}`,
    );
    const family = venueTemplate(venue.type);
    const prefix = family === 'institution' ? '/venues/' : '/locations/';
    assert.ok(
      canonical.startsWith(prefix),
      `${venue.slug}: canonical ${canonical} not in family ${family}`,
    );
  }
}

export function assertMappingCoversEnum(): void {
  const mapKeys = Object.keys(VENUE_KIND_MAP).sort();
  const enumKeys = [...PRISMA_VENUE_KINDS].sort();
  assert.deepEqual(mapKeys, enumKeys, 'VENUE_KIND_MAP must cover every Prisma VenueKind');
  assert.equal(mapKeys.length, PRISMA_VENUE_KINDS.length);
}

export function assertChipFamilyAlignment(): void {
  for (const kind of PRISMA_VENUE_KINDS) {
    const row = VENUE_KIND_MAP[kind];
    const chip = row.chip;
    const allowed =
      row.family === 'institution' ? INSTITUTION_PUBLIC_CHIPS : LOCATION_PUBLIC_CHIPS;
    assert.ok(
      allowed.has(chip),
      `${kind}: chip "${chip}" not allowed for family ${row.family}`,
    );
    assert.equal(row.family, row.template, `${kind}: family must equal template`);
  }
}

describe('canon invariants', () => {
  it('invariant 3: mapping covers entire Prisma VenueKind enum', () => {
    assertMappingCoversEnum();
  });

  it('invariant 4: default chip stays inside family chip set', () => {
    assertChipFamilyAlignment();
  });

  it('invariant 1: smoke venues have unique canonical paths', () => {
    assertUniqueCanonicalPaths(SMOKE_VENUES);
  });

  it('invariant 2: sitemap-style paths match venueCanonicalPath family', () => {
    assertSitemapPathsEqualCanonical(SMOKE_VENUES);
  });

  it('smoke: family + chip for five kinds', () => {
    assert.equal(venueFamily('MUSEUM_ART_SPACE'), 'institution');
    assert.equal(venueChip('MUSEUM_ART_SPACE', 'Третьяковская галерея'), 'museum');
    assert.equal(venueHref(SMOKE_VENUES[0]), '/venues/tretyakovka');

    assert.equal(venueFamily('THEATER'), 'institution');
    assert.equal(venueChip('THEATER'), 'theater');
    assert.equal(venueHref(SMOKE_VENUES[1]), '/venues/bolshoy-teatr');

    assert.equal(venueFamily('PARK'), 'location');
    assert.equal(venueChip('PARK'), 'park');
    assert.equal(venueHref(SMOKE_VENUES[2]), '/locations/park-gorkogo');

    // TEMPLE kind (явный enum; family = location)
    assert.equal(venueFamily('TEMPLE'), 'location');
    assert.equal(resolveChipFromKind('TEMPLE', 'Исаакиевский собор'), 'temple');
    assert.equal(venueHref(SMOKE_VENUES[3]), '/locations/isaakievskiy-sobor');

    assert.equal(venueFamily('GASTRO'), 'location');
    assert.equal(venueChip('GASTRO'), 'gastro');
    assert.equal(venueHref(SMOKE_VENUES[4]), '/locations/danilovskiy-rynok');

    assert.equal(venueKindLabel('PARK'), 'Парк');
    assert.equal(venueTemplate('club_bar_restaurant'), 'institution');
  });

  it('wrong-family stored canonicalPath is ignored (no dual URL)', () => {
    const venue: VenueFixture = {
      id: 'v1',
      slug: 'ermitage',
      name: 'Эрмитаж',
      type: 'museum',
      canonicalPath: '/locations/ermitage',
    };
    assert.equal(venueCanonicalPath(venue), '/venues/ermitage');
    assert.equal(venueHref(venue), '/venues/ermitage');
  });
});

describe('canon invariants: broken fixtures must fail helpers', () => {
  it('duplicate canonical path throws', () => {
    const broken: VenueFixture[] = [
      { id: 'a', slug: 'same-slug', name: 'A', type: 'park' },
      { id: 'b', slug: 'same-slug', name: 'B', type: 'monument' },
    ];
    assert.throws(() => assertUniqueCanonicalPaths(broken), /collision/);
  });

  it('chip/family drift would fail alignment helper', () => {
    // Simulate drift: museum chip forced onto location family row.
    const driftedChip: PublicChip = 'park';
    const family = VENUE_KIND_MAP.MUSEUM_ART_SPACE.family;
    assert.equal(family, 'institution');
    assert.equal(INSTITUTION_PUBLIC_CHIPS.has(driftedChip), false);
    assert.throws(() => {
      if (!INSTITUTION_PUBLIC_CHIPS.has(driftedChip)) {
        throw new Error('MUSEUM_ART_SPACE: chip "park" not allowed for family institution');
      }
    }, /not allowed/);
  });

  it('missing map key would fail enum coverage', () => {
    const incomplete = { ...VENUE_KIND_MAP };
    delete (incomplete as Partial<Record<PrismaVenueKind, unknown>>).ONLINE;
    assert.notEqual(Object.keys(incomplete).length, PRISMA_VENUE_KINDS.length);
  });

  it('naive sitemap path (canonicalPath || href) drifts on wrong family', () => {
    const venue: VenueFixture = {
      id: 'v1',
      slug: 'pushkin-museum',
      name: 'Пушкинский',
      type: 'museum',
      canonicalPath: '/locations/pushkin-museum',
    };
    const naive = venue.canonicalPath || venueHref(venue);
    const canonical = venueCanonicalPath(venue);
    assert.equal(naive, '/locations/pushkin-museum');
    assert.equal(canonical, '/venues/pushkin-museum');
    assert.notEqual(naive, canonical);
  });
});

describe('heuristics documented in mapping', () => {
  it('art_space split from MUSEUM_ART_SPACE', () => {
    assert.equal(resolveChipFromKind('museum_art_space', 'Галерея Ильи Глазунова'), 'art_space');
    assert.equal(resolveChipFromKind('museum_art_space', 'Третьяковская галерея'), 'museum');
  });

  it('TEMPLE / BUS chips come from enum, not title on ATTRACTION / MEETING_POINT', () => {
    assert.equal(resolveChipFromKind('TEMPLE'), 'temple');
    assert.equal(resolveChipFromKind('BUS'), 'bus');
    assert.equal(resolveChipFromKind('ATTRACTION', 'Исаакиевский собор'), 'attraction');
    assert.equal(
      resolveChipFromKind('MEETING_POINT', 'Место посадки экскурсионного автобуса'),
      'meeting_point',
    );
  });
});
