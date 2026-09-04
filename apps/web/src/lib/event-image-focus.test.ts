import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveEventCardObjectPosition,
  resolveEventHeroObjectPosition,
} from './event-image-focus.ts';

test('keeps hero default at eye-line 18%', () => {
  assert.equal(resolveEventHeroObjectPosition({ slug: 'unknown-event' }), 'center 18%');
});

test('uses card default 20% for typical catalog headshots', () => {
  assert.equal(
    resolveEventCardObjectPosition({
      slug: 'tc-69b7b031b8d8225732539dfc-letnii-festival-pianissimo-solnyi-koncert-lev-chefanov-v-bolshom-petergofskom-dvorce',
    }),
    'center 20%',
  );
});

test('shares dense-headshot override between hero and card', () => {
  const key = 'tc-6a4cdfa9269f8c2690ba9ebb-aleksei-saprykin-chtenie';
  assert.equal(resolveEventHeroObjectPosition({ slug: key }), 'center 50%');
  assert.equal(resolveEventCardObjectPosition({ slug: key }), 'center 50%');
});

test('resolves nurminsky override via externalId', () => {
  assert.equal(resolveEventCardObjectPosition({ externalId: '6a319c0e3e6da873bc2af400' }), 'center 16%');
});
