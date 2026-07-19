import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPlaceholderEventImageUrl,
  pickFirstUsableEventImageUrl,
  stabilizeTeplohodImageUrl,
} from './event-image-url.js';

test('stabilizeTeplohodImageUrl converts signed S3 cache URLs', () => {
  const input =
    'https://s3.twcstorage.ru/teplohod-private/images/cache/Events/Event498/38b30dabbe-1.jpg?X-Amz-Expires=21600&X-Amz-Signature=abc';
  assert.equal(
    stabilizeTeplohodImageUrl(input),
    'https://api.teplohod.info/v1/image?item=Event498&dirtyAlias=38b30dabbe-1.jpg',
  );
});

test('stabilizeTeplohodImageUrl keeps already-stable proxy URLs', () => {
  const input = 'https://api.teplohod.info/v1/image?item=Event14&dirtyAlias=35fba5aab2-1.jpg';
  assert.equal(stabilizeTeplohodImageUrl(input), input);
});

test('pickFirstUsableEventImageUrl prefers stabilized cover over placeholder', () => {
  assert.equal(
    pickFirstUsableEventImageUrl(
      'https://api.teplohod.info/v1/image?item=&dirtyAlias=placeHolder.gif',
      'https://s3.twcstorage.ru/teplohod-private/images/cache/Events/Event179/b82266d150-1.jpg?X-Amz-Signature=x',
    ),
    'https://api.teplohod.info/v1/image?item=Event179&dirtyAlias=b82266d150-1.jpg',
  );
  assert.equal(isPlaceholderEventImageUrl(''), true);
});
