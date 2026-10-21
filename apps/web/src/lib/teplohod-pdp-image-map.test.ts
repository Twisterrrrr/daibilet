import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveTeplohodPdpImage } from './teplohod-pdp-image-map.ts';

test('maps only the measured Teplohod PDP hero source files to responsive WebP assets', () => {
  const result = resolveTeplohodPdpImage(
    'https://cdn.teplohod.info/images/cache/Events/Event1360/611db9f32d-1.jpg',
  );

  assert.deepEqual(result, {
    fallback: '/images/events/teplohod-pdp/event-1360-750.webp',
    srcSet: [
      '/images/events/teplohod-pdp/event-1360-750.webp 750w',
      '/images/events/teplohod-pdp/event-1360-1125.webp 1125w',
      '/images/events/teplohod-pdp/event-1360-1280.webp 1280w',
      '/images/events/teplohod-pdp/event-1360-1536.webp 1536w',
    ].join(', '),
  });
});

test('leaves unmeasured images and lookalike URLs on the existing path', () => {
  assert.equal(
    resolveTeplohodPdpImage('https://cdn.teplohod.info/images/cache/Events/Event51/other.jpg'),
    null,
  );
  assert.equal(
    resolveTeplohodPdpImage('https://other.example/images/cache/Events/Event51/4bf789e910-1.jpg'),
    null,
  );
  assert.equal(
    resolveTeplohodPdpImage('/images/cache/Events/Event1360/611db9f32d-1.jpg'),
    null,
  );
});
