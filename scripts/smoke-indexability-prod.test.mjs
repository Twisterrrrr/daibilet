#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCheckedPage } from './smoke-indexability-prod.mjs';

test('retries a transient HTTP error and accepts recovered catalog HTML', async () => {
  let calls = 0;
  const result = await fetchCheckedPage({
    url: 'https://example.test/places/c/moskva',
    userAgent: 'Googlebot',
    check: (html) => html.includes('data-city-places-catalog'),
    attempts: 4,
    wait: async () => {},
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return new Response('temporary', { status: 500 });
      return new Response('<main data-city-places-catalog></main>', { status: 200 });
    },
  });

  assert.deepEqual(result, { okay: true, status: 200, attempt: 2 });
  assert.equal(calls, 2);
});

test('keeps failing when a dynamic page remains empty after retries', async () => {
  let calls = 0;
  const result = await fetchCheckedPage({
    url: 'https://example.test/venues',
    userAgent: 'Googlebot',
    check: (html) => html.includes('/venues/'),
    attempts: 3,
    wait: async () => {},
    fetchImpl: async () => {
      calls += 1;
      return new Response('<main></main>', { status: 200 });
    },
  });

  assert.deepEqual(result, {
    okay: false,
    status: 200,
    attempt: 3,
    error: 'content assertion failed',
  });
  assert.equal(calls, 3);
});

test('retries a thrown network error on dynamic pages', async () => {
  let calls = 0;
  const result = await fetchCheckedPage({
    url: 'https://example.test/cities/moskva',
    userAgent: 'YandexBot',
    check: (html) => html.includes('event'),
    attempts: 2,
    wait: async () => {},
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) throw new Error('socket reset');
      return new Response('<main>event</main>', { status: 200 });
    },
  });

  assert.equal(result.okay, true);
  assert.equal(result.attempt, 2);
  assert.equal(calls, 2);
});
