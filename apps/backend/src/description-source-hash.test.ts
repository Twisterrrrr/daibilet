import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { DESCRIPTION_SOURCE_HASH_VERSION, descriptionSourceHash } from './description-source-hash.js';

const BASE = {
  sourceText: 'Живой концерт на крыше.\n\nПрограмма из хитов.',
  title: 'Концерт группы X',
  city: 'Москва',
  venue: 'Клуб',
  venueAddress: 'ул. Тестовая, 1',
  ageLimit: '12',
  priceFromRub: 1500,
  durations: [120],
  futureSessions: 3,
  nextSession: '2026-11-13T16:00:00.000Z',
  category: 'Концерты',
  subcategory: 'Рок',
  kind: 'RECURRING',
};

test('descriptionSourceHash: same inputs produce the same hash', () => {
  assert.equal(descriptionSourceHash(BASE), descriptionSourceHash({ ...BASE }));
  assert.equal(descriptionSourceHash(BASE).length, 32);
  assert.equal(DESCRIPTION_SOURCE_HASH_VERSION, 'v2');
});

test('descriptionSourceHash: every significant input changes the hash', () => {
  const base = descriptionSourceHash(BASE);
  const variants: Record<string, typeof BASE> = {
    sourceText: { ...BASE, sourceText: 'Другое описание.' },
    title: { ...BASE, title: 'Концерт группы Y' },
    city: { ...BASE, city: 'Санкт-Петербург' },
    venue: { ...BASE, venue: 'Другая площадка' },
    venueAddress: { ...BASE, venueAddress: 'другой адрес' },
    ageLimit: { ...BASE, ageLimit: '18' },
    price: { ...BASE, priceFromRub: 1900 },
    duration: { ...BASE, durations: [95] },
    futureSessions: { ...BASE, futureSessions: 4 },
    nextSession: { ...BASE, nextSession: '2026-11-14T16:00:00.000Z' },
    category: { ...BASE, category: 'Театр' },
    subcategory: { ...BASE, subcategory: 'Джаз' },
    kind: { ...BASE, kind: 'OPEN_DATE' },
  };
  for (const [field, input] of Object.entries(variants)) {
    assert.notEqual(descriptionSourceHash(input), base, `${field} must change the hash`);
  }
});

test('descriptionSourceHash: run metadata and unknown keys are ignored', () => {
  const withMetadata = descriptionSourceHash({
    ...BASE,
    id: 'evt_123',
    seed: 'evt_123',
    createdAt: new Date(),
    updatedAt: '2026-10-20T12:00:00.000Z',
    priority: 'A',
    status: 'QUEUED',
  } as never);
  assert.equal(withMetadata, descriptionSourceHash(BASE));
});

test('descriptionSourceHash: whitespace, CRLF and duration order are normalized', () => {
  assert.equal(
    descriptionSourceHash({ ...BASE, sourceText: 'Живой концерт на крыше.\r\n\r\nПрограмма из хитов.' }),
    descriptionSourceHash(BASE),
  );
  assert.equal(
    descriptionSourceHash({ ...BASE, sourceText: '  Живой   концерт на крыше. Программа из хитов.  ' }),
    descriptionSourceHash(BASE),
  );
  assert.equal(
    descriptionSourceHash({ ...BASE, durations: [120, 90] }),
    descriptionSourceHash({ ...BASE, durations: [90, 120] }),
  );
});

test('descriptionSourceHash: durationMin is used when no durations array is given', () => {
  assert.equal(descriptionSourceHash({ ...BASE, durations: null, durationMin: 120 }), descriptionSourceHash(BASE));
  assert.notEqual(descriptionSourceHash({ ...BASE, durations: null, durationMin: 90 }), descriptionSourceHash(BASE));
});

test('descriptionSourceHash: regression - the old text-only fingerprint missed price changes', () => {
  const legacyFingerprint = (source: string) =>
    createHash('md5').update(String(source).replace(/\r\n?/g, '\n').trim()).digest('hex');

  // The shipped formula hashed the provider text alone, so a price change produced
  // the same hash and the card was never re-composed.
  assert.equal(legacyFingerprint(BASE.sourceText), legacyFingerprint(BASE.sourceText));
  assert.notEqual(legacyFingerprint(BASE.sourceText), descriptionSourceHash(BASE));
  assert.notEqual(
    descriptionSourceHash({ ...BASE, priceFromRub: 999 }),
    descriptionSourceHash(BASE),
    'a price change must change the hash',
  );
});
