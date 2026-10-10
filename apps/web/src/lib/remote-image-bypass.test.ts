import assert from 'node:assert/strict';
import test from 'node:test';

import { isLocalStaticImageUrl, shouldBypassNextImageOptimizer } from './remote-image-bypass.ts';

test('bypasses local /images/* static assets', () => {
  assert.equal(shouldBypassNextImageOptimizer('/images/events/foo.jpg'), true);
  assert.equal(isLocalStaticImageUrl('/images/cities/moscow.png'), true);
});

test('bypasses teplohod API image proxy', () => {
  assert.equal(
    shouldBypassNextImageOptimizer('https://api.teplohod.info/v1/image?item=Event123&dirtyAlias=abc.jpg'),
    true,
  );
});

test('allows ticketscloud / yandexcloud through Next image optimizer', () => {
  assert.equal(
    shouldBypassNextImageOptimizer('https://storage.yandexcloud.net/ticketscloud/foo.jpg'),
    false,
  );
  assert.equal(
    shouldBypassNextImageOptimizer('https://cdn.ticketscloud.com/bar.jpg'),
    false,
  );
});

test('allows empty and relative non-static paths through optimizer', () => {
  assert.equal(shouldBypassNextImageOptimizer(''), false);
  assert.equal(shouldBypassNextImageOptimizer('/api/public/image-proxy?url=x'), false);
});
