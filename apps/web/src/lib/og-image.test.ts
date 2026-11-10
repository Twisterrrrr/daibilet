import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { buildEventOgImage, resolveSsrOgImage, safeImageUrl } from '../server/og-image';
import { DEFAULT_OG_IMAGE } from './seo-meta';

const url = 'https://daibilet.ru/images/test.jpg';
const fake = (response: Response): typeof fetch => (async () => response) as typeof fetch;

test('OG image rejects missing and unsafe URLs without generating a proxy', async () => {
  for (const raw of ['', null, 'http://127.0.0.1/private', 'https://evil.test/a', 'https://daibilet.ru/og/event-image?source=loop', 'data:image/jpeg;base64,eA==']) {
    assert.equal(await resolveSsrOgImage(raw), DEFAULT_OG_IMAGE);
  }
  assert.equal(safeImageUrl('https://cdn.teplohod.info/images/event.jpg'), 'https://cdn.teplohod.info/images/event.jpg');
  assert.equal(safeImageUrl('https://cdn.teplohod.info.evil.test/images/event.jpg'), null);
});

test('OG image transformer rejects 404, HTML, corrupt bytes, network errors, oversized content', async () => {
  for (const response of [new Response('', { status: 404 }), new Response('<html>oops</html>', { headers: { 'content-type': 'text/html' } }), new Response('broken', { headers: { 'content-type': 'image/jpeg' } }), new Response('', { headers: { 'content-type': 'image/jpeg', 'content-length': '99999999' } })]) {
    assert.equal(await buildEventOgImage(url, fake(response)), null);
  }
  assert.equal(await buildEventOgImage(url, (async () => { throw new Error('timeout'); }) as typeof fetch), null);
});

test('OG metadata points to the local transformer and valid input becomes a compact 1200x630 JPEG', async () => {
  assert.equal(await resolveSsrOgImage(url), 'https://daibilet.ru/og/event-image?source=https%3A%2F%2Fdaibilet.ru%2Fimages%2Ftest.jpg');
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } }).jpeg().toBuffer();
  const output = await buildEventOgImage(url, fake(new Response(new Uint8Array(image), { headers: { 'content-type': 'image/jpeg' } })));
  assert.ok(output);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 630);
  assert.equal(metadata.format, 'jpeg');
});
