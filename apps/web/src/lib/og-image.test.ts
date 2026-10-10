import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { resolveSsrOgImage } from '../server/og-image';
import { DEFAULT_OG_IMAGE } from './seo-meta';

const url = 'https://daibilet.ru/images/test.jpg';
const fake = (response: Response): typeof fetch => (async () => response) as typeof fetch;

test('SSR image rejects missing/unsafe URLs without fetching', async () => {
  const noFetch = (async () => { throw new Error('unexpected request'); }) as typeof fetch;
  for (const raw of ['', null, 'http://127.0.0.1/private', 'https://evil.test/a', 'data:image/jpeg;base64,eA==']) {
    assert.equal(await resolveSsrOgImage(raw, noFetch), DEFAULT_OG_IMAGE);
  }
});

test('SSR image falls back for 404, HTML, corrupt bytes, network errors, oversized content', async () => {
  for (const response of [new Response('', { status: 404 }), new Response('<html>oops</html>', { headers: { 'content-type': 'text/html' } }), new Response('broken', { headers: { 'content-type': 'image/jpeg' } }), new Response('', { headers: { 'content-type': 'image/jpeg', 'content-length': '99999999' } })]) {
    assert.equal(await resolveSsrOgImage(url, fake(response)), DEFAULT_OG_IMAGE);
  }
  assert.equal(await resolveSsrOgImage(url, (async () => { throw new Error('timeout'); }) as typeof fetch), DEFAULT_OG_IMAGE);
});

test('SSR image preserves a valid decodable image', async () => {
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } }).jpeg().toBuffer();
  assert.equal(await resolveSsrOgImage(url, fake(new Response(new Uint8Array(image), { headers: { 'content-type': 'image/jpeg' } }))), url);
});
