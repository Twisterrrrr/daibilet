const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeEvent } = require('./lib/tc-catalog-fetch');
const { assertCatalogSnapshot } = require('./tc-import-catalog');

const dictionaries = {
  categoriesById: new Map([['category-1', { id: 'category-1', name: 'Музеи' }]]),
  venuesById: new Map(),
  tagsById: new Map(),
  citiesById: new Map(),
  metaEventsById: new Map(),
};

const sourceEvent = {
  id: 'tc-1',
  name: 'Мастер-класс',
  description: 'Описание',
  status: 'PUBLIC',
  category: 'category-1',
  tags: [],
  sets: [],
  media: {},
  lifetime: {},
};

test('full snapshot normalization omits duplicated raw protobuf payload', () => {
  const normalized = normalizeEvent(sourceEvent, dictionaries, { includeRaw: false });
  assert.equal(normalized.externalId, 'tc-1');
  assert.equal(Object.hasOwn(normalized, 'raw'), false);
});

test('ids normalization keeps raw payload for direct audit/upsert', () => {
  const normalized = normalizeEvent(sourceEvent, dictionaries);
  assert.equal(normalized.raw, sourceEvent);
});

test('snapshot integrity accepts matching unique rows', () => {
  assert.doesNotThrow(() =>
    assertCatalogSnapshot(
      [{ externalId: 'tc-1' }, { externalId: 'tc-2' }],
      { counts: { events: 2 } },
    ),
  );
});

test('snapshot integrity rejects count mismatch and duplicate ids', () => {
  assert.throws(
    () => assertCatalogSnapshot([{ externalId: 'tc-1' }], { counts: { events: 2 } }),
    /count mismatch/,
  );
  assert.throws(
    () =>
      assertCatalogSnapshot(
        [{ externalId: 'tc-1' }, { externalId: 'tc-1' }],
        { counts: { events: 2 } },
      ),
    /identity check failed/,
  );
});
