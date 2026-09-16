import assert from 'node:assert/strict';
import test from 'node:test';

import { isChunkLoadFailure, isNextStaticAssetUrl } from './chunk-load-recovery.ts';

test('isChunkLoadFailure matches webpack / Next import failures', () => {
  assert.equal(isChunkLoadFailure('ChunkLoadError: Loading chunk 123 failed'), true);
  assert.equal(isChunkLoadFailure('Failed to fetch dynamically imported module: /_next/static/chunks/app.js'), true);
  assert.equal(isChunkLoadFailure('error loading dynamically imported module'), true);
  assert.equal(isChunkLoadFailure('Loading CSS chunk 4 failed'), true);
  assert.equal(
    isChunkLoadFailure("TypeError: Cannot read properties of undefined (reading 'call')"),
    true,
  );
  assert.equal(isChunkLoadFailure('Hydration failed because the initial UI does not match'), false);
  assert.equal(isChunkLoadFailure('Application error: a client-side exception has occurred'), false);
});

test('isNextStaticAssetUrl matches Next hashed assets only', () => {
  assert.equal(isNextStaticAssetUrl('https://daibilet.ru/_next/static/chunks/app-abc.js'), true);
  assert.equal(isNextStaticAssetUrl('https://daibilet.ru/_next/static/css/app.css'), true);
  assert.equal(isNextStaticAssetUrl('https://daibilet.ru/images/logo.png'), false);
});
