import assert from 'node:assert/strict';
import test from 'node:test';

import { isLocalStaticImageUrl, shouldBypassNextImageOptimizer } from './remote-image-bypass.ts';

test('bypasses local /images/* static assets', () => {
  assert.equal(shouldBypassNextImageOptimizer('/images/events/foo.jpg'), true);
  assert.equal(isLocalStaticImageUrl('/images/cities/moscow.png'), true);
});

test('bypasses teplohod API image proxy by default (flag off)', () => {
  assert.equal(
    shouldBypassNextImageOptimizer('https://api.teplohod.info/v1/image?item=Event123&dirtyAlias=abc.jpg'),
    true,
  );
  assert.equal(
    shouldBypassNextImageOptimizer('https://cdn.teplohod.info/foo.jpg'),
    true,
  );
});

test('allows teplohod through optimizer when NEXT_PUBLIC_TEPLOHOD_IMAGE_OPTIMIZE=true', () => {
  const prev = process.env.NEXT_PUBLIC_TEPLOHOD_IMAGE_OPTIMIZE;
  process.env.NEXT_PUBLIC_TEPLOHOD_IMAGE_OPTIMIZE = 'true';
  try {
    assert.equal(
      shouldBypassNextImageOptimizer('https://cdn.teplohod.info/foo.jpg'),
      false,
    );
    assert.equal(
      shouldBypassNextImageOptimizer('https://api.teplohod.info/v1/image?item=Event123'),
      false,
    );
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_TEPLOHOD_IMAGE_OPTIMIZE;
    else process.env.NEXT_PUBLIC_TEPLOHOD_IMAGE_OPTIMIZE = prev;
  }
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
