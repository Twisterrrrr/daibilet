import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildVenueCatalogSearchParams, venueCatalogCacheKey } from './venue-catalog-feed.ts';

describe('venue catalog subtype filters', () => {
  it('sends subtype to the API and includes it in the cache key', () => {
    const query = { city: 'moscow', type: 'gastro,bar,club_bar_restaurant', subtype: 'restaurant,cafe,bar', limit: 24 };
    const params = buildVenueCatalogSearchParams(query);
    assert.equal(params.get('city'), 'moscow');
    assert.equal(params.get('type'), 'gastro,bar,club_bar_restaurant');
    assert.equal(params.get('subtype'), 'restaurant,cafe,bar');
    const clubQuery = { city: 'moscow', subtype: 'club', limit: 24 };
    assert.equal(buildVenueCatalogSearchParams(clubQuery).get('subtype'), 'club');
    assert.notEqual(venueCatalogCacheKey(query), venueCatalogCacheKey({ city: 'moscow', subtype: 'restaurant', limit: 24 }));
  });
});
