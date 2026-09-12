import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPdfFromJpegPages } from './day-route-pdf';

/** 1x1 JPEG so the PDF stream is a valid DCTDecode payload. */
const TINY_JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAD/r/9k=',
  ),
  (ch) => ch.charCodeAt(0),
);

test('buildPdfFromJpegPages writes a multi-page PDF with JPEG XObjects', () => {
  const pdf = buildPdfFromJpegPages([
    { width: 10, height: 14, jpeg: TINY_JPEG },
    { width: 10, height: 14, jpeg: TINY_JPEG },
  ]);
  const text = new TextDecoder('latin1').decode(pdf);
  assert.equal(text.startsWith('%PDF-1.4'), true);
  assert.equal(text.includes('%%EOF'), true);
  assert.equal(text.includes('/Count 2'), true);
  assert.equal(text.includes('/Filter /DCTDecode'), true);
  assert.equal(text.includes('/Subtype /Image'), true);
});
