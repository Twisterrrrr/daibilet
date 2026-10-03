import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePlaceSlugAlias } from './place-slug-aliases.js';

test('resolvePlaceSlugAlias maps smoke typos to live slugs', () => {
  assert.equal(resolvePlaceSlugAlias('ufa-monument-salavat-yulaev'), 'ufa-pamyatnik-salavatu-yulaevu');
  assert.equal(resolvePlaceSlugAlias('voronezh-kramskoy'), 'voronezh-hudozhestvennyy-muzey-kramskogo');
  assert.equal(resolvePlaceSlugAlias('ryazan-kreml'), 'ryazan-ryazanskiy-kreml');
  assert.equal(resolvePlaceSlugAlias('ufa-pamyatnik-salavatu-yulaevu'), 'ufa-pamyatnik-salavatu-yulaevu');
});
