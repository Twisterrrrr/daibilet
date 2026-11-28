import assert from 'node:assert/strict';
import test from 'node:test';
import { eventHref } from './routes.ts';

test('catalog event links prefer the stable EventPage slug', () => {
  assert.equal(
    eventHref({
      id: 'evt-123',
      slug: 'legacy-slot-6a12345678901234567890ab',
      eventPageSlug: 'regular-show-moscow',
      title: 'Регулярное шоу',
    }),
    '/events/regular-show-moscow',
  );
});

test('catalog event links keep the legacy slug as a fallback without EventPage mapping', () => {
  assert.equal(
    eventHref({ id: 'evt-123', slug: 'legacy-slot', title: 'Регулярное шоу' }),
    '/events/legacy-slot',
  );
});
