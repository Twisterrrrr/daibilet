import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_PATH,
  EVENTS_HUB_DESCRIPTION,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_TYPE,
  OG_IMAGE_WIDTH,
  PLACES_HUB_DESCRIPTION,
  absoluteUrl,
  buildShareMetadata,
  canonicalHref,
  ensureSeoDescription,
  eventsCityDescriptionFallback,
  getOpenGraphMediaTags,
  placesCityDescriptionFallback,
} from './seo-meta.ts';

const SAMPLE_DEFAULT_OG = 'https://daibilet.ru/images/og/default-og.jpg';

test('DEFAULT_OG_IMAGE is absolute JPEG on canonical host', () => {
  assert.equal(DEFAULT_OG_IMAGE_PATH, '/images/og/default-og.jpg');
  assert.ok(DEFAULT_OG_IMAGE.endsWith('/images/og/default-og.jpg'));
  assert.match(DEFAULT_OG_IMAGE, /^https:\/\//);
  assert.doesNotMatch(DEFAULT_OG_IMAGE, /home-hero-friends-selfie/);
  assert.doesNotMatch(DEFAULT_OG_IMAGE, /your-domain\.com/i);
  if (!process.env.DAIBILET_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_APP_URL) {
    assert.equal(DEFAULT_OG_IMAGE, SAMPLE_DEFAULT_OG);
  }
});

test('getOpenGraphMediaTags with no args uses default-og.jpg pack', () => {
  const media = getOpenGraphMediaTags();
  assert.equal(media.url, DEFAULT_OG_IMAGE);
  assert.equal(media.twitterCard, 'summary_large_image');
  assert.deepEqual(media.twitterImages, [media.url]);
  const image = media.images[0];
  assert.ok(image);
  assert.equal(image.url, media.url);
  assert.equal(image.secureUrl, media.url.replace(/^http:\/\//i, 'https://'));
  assert.equal(image.width, OG_IMAGE_WIDTH);
  assert.equal(image.height, OG_IMAGE_HEIGHT);
  assert.equal(image.type, OG_IMAGE_TYPE);
  assert.equal(image.alt, 'Дайбилет');
});

test('getOpenGraphMediaTags makes relative paths absolute and keeps https URLs', () => {
  const relative = getOpenGraphMediaTags('/images/blog/foo-og.jpg', 'Статья');
  assert.ok(relative.url.endsWith('/images/blog/foo-og.jpg'));
  assert.match(relative.url, /^https:\/\//);
  assert.equal(relative.images[0]?.alt, 'Статья');
  assert.equal(relative.images[0]?.type, 'image/jpeg');

  const absolute = getOpenGraphMediaTags('https://daibilet.ru/images/og/my-day.jpg');
  assert.equal(absolute.url, 'https://daibilet.ru/images/og/my-day.jpg');
  assert.equal(absolute.images[0]?.secureUrl, 'https://daibilet.ru/images/og/my-day.jpg');
  assert.equal(absolute.images[0]?.width, 1200);
  assert.equal(absolute.images[0]?.height, 630);
  assert.equal(absolute.images[0]?.type, 'image/jpeg');
});

test('canonicalHref is absolute https and never drops catalog hubs to /', () => {
  const places = canonicalHref('/places');
  const events = canonicalHref('/events');
  assert.match(places, /^https:\/\//);
  assert.match(places, /\/places$/);
  assert.ok(!places.endsWith('/') || places === 'https://daibilet.ru/');
  assert.notEqual(places, canonicalHref('/'));
  assert.match(events, /\/events$/);
  assert.ok(!events.includes('?'));
});

test('ensureSeoDescription never returns empty and strips em-dash', () => {
  assert.equal(ensureSeoDescription('  ', PLACES_HUB_DESCRIPTION), PLACES_HUB_DESCRIPTION);
  assert.equal(ensureSeoDescription(null, EVENTS_HUB_DESCRIPTION), EVENTS_HUB_DESCRIPTION);
  assert.equal(ensureSeoDescription('Текст\u2014хвост', 'x'), 'Текст-хвост');
  assert.match(placesCityDescriptionFallback('Москве'), /в Москве/);
  assert.match(eventsCityDescriptionFallback('Казани'), /в Казани/);
});

test('buildShareMetadata without image uses default OG pack', () => {
  const share = buildShareMetadata({
    title: 'Афиша',
    description: 'Описание',
    path: '/places',
  });
  const image = share.openGraph?.images;
  const first = Array.isArray(image) ? image[0] : image;
  assert.ok(first && typeof first === 'object');
  assert.equal(first.url, DEFAULT_OG_IMAGE);
  assert.equal(first.secureUrl, DEFAULT_OG_IMAGE.replace(/^http:\/\//i, 'https://'));
  assert.equal(first.width, 1200);
  assert.equal(first.height, 630);
  assert.equal(first.type, 'image/jpeg');
  assert.equal(share.twitter?.card, 'summary_large_image');
  assert.deepEqual(share.twitter?.images, [DEFAULT_OG_IMAGE]);
});
