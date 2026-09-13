import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCatalogApiSearchParams,
  catalogFiltersCacheKey,
  catalogQueryCacheKey,
  parseCatalogApiQuery,
  parseCatalogPageQuery,
  resolveCatalogNextFetchPage,
} from '@/server/catalog-query';

test('parseCatalogApiQuery maps page + limit to offset for load-more', () => {
  for (const limit of [50, 100, 200] as const) {
    assert.equal(parseCatalogApiQuery({ limit: String(limit), page: '1' }).offset, 0);
    assert.equal(parseCatalogApiQuery({ limit: String(limit), page: '2' }).offset, limit);
    assert.equal(parseCatalogApiQuery({ limit: String(limit), page: '3' }).offset, limit * 2);
  }
});

test('parseCatalogApiQuery prefers explicit offset over page', () => {
  assert.equal(parseCatalogApiQuery({ limit: '100', page: '2', offset: '250' }).offset, 250);
});

test('parseCatalogPageQuery keeps user limit on page > 1', () => {
  for (const limit of [50, 100, 200] as const) {
    const page2 = parseCatalogPageQuery({ limit: String(limit), page: '2' });
    assert.equal(page2.limit, limit);
    assert.equal(page2.offset, limit);

    const page3 = parseCatalogPageQuery({ limit: String(limit), page: '3' });
    assert.equal(page3.limit, limit);
    assert.equal(page3.offset, limit * 2);
  }
});

test('catalogQueryCacheKey includes paging via page when offset omitted', () => {
  const page1 = catalogQueryCacheKey({ city: 'moscow', limit: 100, page: 1 });
  const page2 = catalogQueryCacheKey({ city: 'moscow', limit: 100, page: 2 });
  assert.notEqual(page1, page2);
  assert.equal(JSON.parse(page2).offset, 100);
});

test('catalogFiltersCacheKey ignores listPage in filters snapshot', () => {
  const base = { city: 'moscow', limit: 100 as const, sort: 'time' as const, page: 99 };
  assert.equal(catalogFiltersCacheKey(base, 1), catalogFiltersCacheKey({ ...base, page: 2 }, 1));
});

test('buildCatalogApiSearchParams maps page + limit for load-more (50/100/200)', () => {
  for (const limit of [50, 100, 200] as const) {
    const page1 = buildCatalogApiSearchParams({ city: 'moscow', limit }, 1);
    assert.equal(page1.get('page'), null);
    assert.equal(page1.get('offset'), null);
    assert.equal(page1.get('limit'), limit === 50 ? null : String(limit));

    const page2 = buildCatalogApiSearchParams({ city: 'moscow', limit }, 2);
    assert.equal(page2.get('page'), '2');
    assert.equal(page2.get('offset'), String(limit));
    assert.equal(parseCatalogApiQuery(page2).offset, limit);
    assert.equal(parseCatalogApiQuery(page2).limit, limit);

    const page3 = buildCatalogApiSearchParams({ city: 'moscow', limit }, 3);
    assert.equal(page3.get('offset'), String(limit * 2));
    assert.equal(parseCatalogApiQuery(page3).offset, limit * 2);
  }
});

test('resolveCatalogNextFetchPage uses catalog.offset for 50 / 100 / 200', () => {
  const items = (count: number) => Array.from({ length: count }, () => ({}));

  for (const limit of [50, 100, 200] as const) {
    assert.equal(
      resolveCatalogNextFetchPage({ offset: 0, total: limit * 5, items: items(limit) }, limit),
      2,
    );
    assert.equal(
      resolveCatalogNextFetchPage({ offset: limit, total: limit * 5, items: items(limit * 2) }, limit),
      3,
    );
    assert.equal(
      resolveCatalogNextFetchPage({ offset: limit * 4, total: limit * 5, items: items(limit * 5) }, limit),
      null,
    );
  }

  // Replace page 2 (offset 50, only one page visible) still requests page 3 on load-more.
  assert.equal(
    resolveCatalogNextFetchPage({ offset: 50, total: 250, items: items(50) }, 50),
    3,
  );

  // Failed append: listPage bumped but offset still on page 1 - retry page 2.
  assert.equal(
    resolveCatalogNextFetchPage({ offset: 0, total: 250, items: items(50) }, 50),
    2,
  );

  assert.equal(
    resolveCatalogNextFetchPage({ offset: 100, total: 201, items: items(200) }, 100),
    3,
  );
  assert.equal(
    resolveCatalogNextFetchPage({ offset: 200, total: 201, items: items(201) }, 100),
    null,
  );
});
