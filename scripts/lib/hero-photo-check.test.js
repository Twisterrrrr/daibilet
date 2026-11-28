import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assessHeroPhoto,
  parseImageDimensions,
  pickHeroCandidate,
} from './hero-photo-check.js';

function pngHeader(width, height) {
  const b = Buffer.alloc(32);
  b.writeUInt32BE(0x89504e47, 0);
  b.writeUInt32BE(0x0d0a1a0a, 4);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

function jpegHeader(width, height) {
  const b = Buffer.alloc(16);
  b[0] = 0xff;
  b[1] = 0xd8;
  b[2] = 0xff;
  b[3] = 0xc0;
  b.writeUInt16BE(8, 4);
  b[6] = 8; // precision
  b.writeUInt16BE(height, 7);
  b.writeUInt16BE(width, 9);
  return b;
}

function webpVp8x(width, height) {
  const b = Buffer.alloc(32);
  b.write('RIFF', 0, 'ascii');
  b.write('WEBP', 8, 'ascii');
  b.write('VP8X', 12, 'ascii');
  b.writeUIntLE(width - 1, 24, 3);
  b.writeUIntLE(height - 1, 27, 3);
  return b;
}

test('parses PNG / JPEG / WebP dimensions from headers', () => {
  assert.deepEqual(parseImageDimensions(pngHeader(1600, 900)), { width: 1600, height: 900, format: 'png' });
  assert.deepEqual(parseImageDimensions(jpegHeader(1280, 720)), { width: 1280, height: 720, format: 'jpeg' });
  assert.deepEqual(parseImageDimensions(webpVp8x(1024, 768)), { width: 1024, height: 768, format: 'webp' });
  assert.equal(parseImageDimensions(Buffer.from('not an image at all, really')), null);
});

test('hero assessment: size, orientation, aspect and brightness gates', () => {
  assert.equal(assessHeroPhoto({ width: 1600, height: 900 }, 0.5).ok, true);
  assert.equal(assessHeroPhoto({ width: 1000, height: 750 }, 0.5).ok, true); // 4:3 ok
  assert.match(assessHeroPhoto({ width: 640, height: 480 }, 0.5).reason, /too small/);
  assert.match(assessHeroPhoto({ width: 900, height: 1600 }, 0.5).reason, /not horizontal/);
  assert.match(assessHeroPhoto({ width: 1000, height: 1000 }, 0.5).reason, /not horizontal/);
  assert.match(assessHeroPhoto({ width: 2000, height: 800 }, 0.5).reason, /aspect out of range/);
  assert.match(assessHeroPhoto({ width: 1600, height: 900 }, 0.05).reason, /too dark/);
  assert.match(assessHeroPhoto({ width: 1600, height: 900 }, 0.97).reason, /blown out/);
  // Without luminance the check is skipped but flagged.
  const noBright = assessHeroPhoto({ width: 1600, height: 900 });
  assert.equal(noBright.ok, true);
  assert.match(noBright.reason, /unchecked/);
});

test('hero score prefers 16:9 / 4:3 shapes and bigger resolution', () => {
  const wide = assessHeroPhoto({ width: 1920, height: 1080 }, 0.5);
  const odd = assessHeroPhoto({ width: 1600, height: 1000 }, 0.5);
  assert.ok(wide.score > odd.score);
  const big = assessHeroPhoto({ width: 2400, height: 1800 }, 0.5);
  const small = assessHeroPhoto({ width: 1200, height: 900 }, 0.5);
  assert.ok(big.score > small.score);
});

test('pickHeroCandidate takes the best and returns null when nothing qualifies', () => {
  const candidates = [
    { name: 'a', assessment: assessHeroPhoto({ width: 900, height: 1600 }, 0.5) },
    { name: 'b', assessment: assessHeroPhoto({ width: 1280, height: 720 }, 0.5) },
    { name: 'c', assessment: assessHeroPhoto({ width: 1920, height: 1080 }, 0.5) },
    { name: 'd', assessment: assessHeroPhoto({ width: 640, height: 480 }, 0.5) },
  ];
  assert.equal(pickHeroCandidate(candidates).name, 'c');
  assert.equal(pickHeroCandidate([candidates[0], candidates[3]]), null);
  assert.equal(pickHeroCandidate([]), null);
});
