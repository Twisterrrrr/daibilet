import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizePublicSessionImageKey, spreadCatalogSessionsByCoverImage } from './public-catalog-spread.js';

test('normalizePublicSessionImageKey strips resize suffix', () => {
  assert.equal(
    normalizePublicSessionImageKey('https://cdn.example/a/b/poster-640x360.jpg'),
    normalizePublicSessionImageKey('https://cdn.example/a/b/poster.jpg'),
  );
});

test('spreadCatalogSessionsByCoverImage interleaves same-cover rows', () => {
  const img = 'https://cdn.example/party.jpg';
  const sessions = [
    { id: 'a1', imageUrl: img, title: 'Youth' },
    { id: 'a2', imageUrl: img, title: 'Middle' },
    { id: 'a3', imageUrl: img, title: 'Ultra youth' },
    { id: 'b1', imageUrl: 'https://cdn.example/other.jpg', title: 'Other' },
    { id: 'c1', imageUrl: 'https://cdn.example/third.jpg', title: 'Third' },
  ];

  const spread = spreadCatalogSessionsByCoverImage(sessions);
  assert.equal(spread.length, sessions.length);

  for (let i = 1; i < spread.length; i += 1) {
    const prev = normalizePublicSessionImageKey(spread[i - 1]!.imageUrl);
    const curr = normalizePublicSessionImageKey(spread[i]!.imageUrl);
    if (prev && curr) assert.notEqual(prev, curr, `adjacent duplicate at ${i - 1}/${i}`);
  }
});

test('spreadCatalogSessionsByCoverImage avoids three identical covers in a row', () => {
  const img = 'https://cdn.example/standup.jpg';
  const sessions = [
    { id: '1', imageUrl: img },
    { id: '2', imageUrl: img },
    { id: '3', imageUrl: img },
    { id: '4', imageUrl: 'https://cdn.example/cinema.jpg' },
    { id: '5', imageUrl: 'https://cdn.example/garden.jpg' },
  ];

  const spread = spreadCatalogSessionsByCoverImage(sessions);
  const keys = spread.map((s) => normalizePublicSessionImageKey(s.imageUrl));
  assert.notDeepEqual(keys.slice(0, 3), [keys[0], keys[0], keys[0]]);
});
