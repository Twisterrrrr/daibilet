import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPlaceholderEventImageUrl,
  isUsableCatalogImageUrl,
  pickFirstUsableEventImageUrl,
  stabilizeTeplohodImageUrl,
} from './event-image-url.js';

const SIGNED_S3 =
  'https://s3.twcstorage.ru/teplohod-private/images/cache/Events/Event498/38b30dabbe-1.jpg'
  + '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=21600&X-Amz-Signature=deadbeef';

const STABLE_PROXY =
  'https://api.teplohod.info/v1/image?item=Event498&dirtyAlias=38b30dabbe-1.jpg';

test('stabilizeTeplohodImageUrl converts signed S3 cache URLs', () => {
  assert.equal(stabilizeTeplohodImageUrl(SIGNED_S3), STABLE_PROXY);
});

test('stabilizeTeplohodImageUrl never returns twcstorage or X-Amz-Signature', () => {
  const out = stabilizeTeplohodImageUrl(SIGNED_S3);
  assert.ok(out);
  assert.equal(/twcstorage/i.test(out!), false);
  assert.equal(/X-Amz-Signature/i.test(out!), false);
  assert.match(out!, /^https:\/\/api\.teplohod\.info\/v1\/image\?/);
});

test('stabilizeTeplohodImageUrl keeps already-stable proxy URLs', () => {
  const input = 'https://api.teplohod.info/v1/image?item=Event14&dirtyAlias=35fba5aab2-1.jpg';
  assert.equal(stabilizeTeplohodImageUrl(input), input);
});

test('stabilizeTeplohodImageUrl returns null for empty / whitespace', () => {
  assert.equal(stabilizeTeplohodImageUrl(null), null);
  assert.equal(stabilizeTeplohodImageUrl(''), null);
  assert.equal(stabilizeTeplohodImageUrl('   '), null);
});

test('stabilizeTeplohodImageUrl leaves non-Teplohod URLs untouched', () => {
  const yandex =
    'https://ticketscloud-prod.storage.yandexcloud.net/events/cover.jpg?X-Amz-Signature=x';
  assert.equal(stabilizeTeplohodImageUrl(yandex), yandex);

  const local = '/images/cities/spb.jpg';
  assert.equal(stabilizeTeplohodImageUrl(local), local);
});

test('stabilizeTeplohodImageUrl encodes special characters in dirtyAlias', () => {
  const input =
    'https://s3.twcstorage.ru/teplohod-private/images/cache/Events/Event7/file name+1.jpg?X-Amz-Signature=z';
  assert.equal(
    stabilizeTeplohodImageUrl(input),
    'https://api.teplohod.info/v1/image?item=Event7&dirtyAlias=file%20name%2B1.jpg',
  );
});

test('stabilizeTeplohodImageUrl matches path without query string', () => {
  const input =
    'https://s3.twcstorage.ru/teplohod-private/images/cache/Events/Event179/b82266d150-1.jpg';
  assert.equal(
    stabilizeTeplohodImageUrl(input),
    'https://api.teplohod.info/v1/image?item=Event179&dirtyAlias=b82266d150-1.jpg',
  );
});

test('pickFirstUsableEventImageUrl prefers stabilized cover over placeholder', () => {
  assert.equal(
    pickFirstUsableEventImageUrl(
      'https://api.teplohod.info/v1/image?item=&dirtyAlias=placeHolder.gif',
      SIGNED_S3,
    ),
    STABLE_PROXY,
  );
  assert.equal(isPlaceholderEventImageUrl(''), true);
  assert.equal(
    isPlaceholderEventImageUrl('https://api.teplohod.info/v1/image?item=&dirtyAlias=x.gif'),
    true,
  );
});

test('pickFirstUsableEventImageUrl never persists signed S3 as Event.imageUrl candidate', () => {
  const picked = pickFirstUsableEventImageUrl(SIGNED_S3);
  assert.equal(picked, STABLE_PROXY);
  assert.equal(/twcstorage|X-Amz-Signature/i.test(picked || ''), false);
});

test('pickFirstUsableEventImageUrl returns null when only placeholders remain', () => {
  assert.equal(
    pickFirstUsableEventImageUrl(
      null,
      '',
      'https://api.teplohod.info/v1/image?item=&dirtyAlias=placeHolder.gif',
    ),
    null,
  );
});

test('isUsableCatalogImageUrl accepts CDN and local events/venues, rejects cities', () => {
  assert.equal(
    isUsableCatalogImageUrl(
      'https://ticketscloud-prod.storage.yandexcloud.net/production/image/x.jpg',
    ),
    true,
  );
  assert.equal(
    isUsableCatalogImageUrl('/images/events/tc-6a3cdc3f5ac2fefed3240b7c-sortavala-ussr-museum.jpg'),
    true,
  );
  assert.equal(isUsableCatalogImageUrl('/images/venues/generated/venue-auto-abc.jpg'), true);
  assert.equal(isUsableCatalogImageUrl('/images/cities/moscow.png'), false);
  assert.equal(isUsableCatalogImageUrl(''), false);
  assert.equal(isUsableCatalogImageUrl(null), false);
});
