import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  placeSlugAliasHref,
  placeSlugAliasRedirects,
  resolvePlaceSlugAlias,
} from './place-slug-aliases.ts';

describe('place slug aliases', () => {
  it('maps smoke typos to live catalog slugs', () => {
    assert.equal(resolvePlaceSlugAlias('ufa-monument-salavat-yulaev'), 'ufa-pamyatnik-salavatu-yulaevu');
    assert.equal(resolvePlaceSlugAlias('voronezh-kramskoy'), 'voronezh-hudozhestvennyy-muzey-kramskogo');
    assert.equal(resolvePlaceSlugAlias('ryazan-kreml'), 'ryazan-ryazanskiy-kreml');
    assert.equal(
      resolvePlaceSlugAlias('naprotiv-teatra-sovremennik-625af9838532f4ffe3fefe4b'),
      'moscow-sovremennik',
    );
    assert.equal(
      resolvePlaceSlugAlias('yusupovskiy-dvorec-63986bf7a7df'),
      'saint-petersburg-yusupovskiy-dvorets',
    );
    assert.equal(
      resolvePlaceSlugAlias('petrovskii-putevoi-dvorec-5cd1bf3d079a40000c1e0639'),
      'moscow-petrovskiy-putevoy-dvorets',
    );
  });

  it('leaves canonical slugs untouched', () => {
    assert.equal(resolvePlaceSlugAlias('ufa-pamyatnik-salavatu-yulaevu'), 'ufa-pamyatnik-salavatu-yulaevu');
    assert.equal(resolvePlaceSlugAlias(''), '');
  });

  it('builds canonical hrefs and both-family redirects', () => {
    assert.equal(
      placeSlugAliasHref('ufa-monument-salavat-yulaev'),
      '/locations/ufa-pamyatnik-salavatu-yulaevu',
    );
    assert.equal(
      placeSlugAliasHref('voronezh-kramskoy'),
      '/venues/voronezh-hudozhestvennyy-muzey-kramskogo',
    );
    assert.equal(placeSlugAliasHref('ryazan-kreml'), '/locations/ryazan-ryazanskiy-kreml');
    assert.equal(
      placeSlugAliasHref('naprotiv-teatra-sovremennik-625af9838532f4ffe3fefe4b'),
      '/venues/moscow-sovremennik',
    );
    assert.equal(placeSlugAliasHref('unknown-place'), null);

    const redirects = placeSlugAliasRedirects();
    assert.equal(redirects.length, 12);
    assert.ok(
      redirects.some(
        (row) =>
          row.source === '/locations/ryazan-kreml' &&
          row.destination === '/locations/ryazan-ryazanskiy-kreml' &&
          row.permanent,
      ),
    );
    assert.ok(
      redirects.some(
        (row) =>
          row.source === '/venues/voronezh-kramskoy' &&
          row.destination === '/venues/voronezh-hudozhestvennyy-muzey-kramskogo',
      ),
    );
  });
});
