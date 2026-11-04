import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_PATH,
  EVENTS_HUB_DESCRIPTION,
  HOME_SEO_DESCRIPTION_FALLBACK,
  HOME_SEO_TITLE,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_TYPE,
  OG_IMAGE_WIDTH,
  PLACES_HUB_DESCRIPTION,
  absoluteUrl,
  buildHomeSeoDescription,
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
  // `openGraph.images` is typed `URL | OGImageDescriptor`, and `assert.ok` is a
  // runtime check that does not narrow the type. Narrow it here so the
  // descriptor fields below are visible to the compiler.
  assert.ok(first && typeof first === 'object' && !(first instanceof URL));
  const descriptor = first as { url: string; secureUrl: string; width: number; height: number; type: string };
  assert.equal(descriptor.url, DEFAULT_OG_IMAGE);
  assert.equal(descriptor.secureUrl, DEFAULT_OG_IMAGE.replace(/^http:\/\//i, 'https://'));
  assert.equal(descriptor.width, 1200);
  assert.equal(descriptor.height, 630);
  assert.equal(descriptor.type, 'image/jpeg');
  // `Metadata['twitter']` does not declare `card`, only the card family members,
  // so read it off a widened view rather than asserting on a field the type
  // does not carry.
  const twitter = share.twitter as { card?: string; images?: unknown } | undefined;
  assert.equal(twitter?.card, 'summary_large_image');
  assert.deepEqual(twitter?.images, [DEFAULT_OG_IMAGE]);
});

const dest = (name: string, slug: string, events: number, type = 'city') => ({
  name,
  slug,
  events,
  type,
});

/**
 * The home snippet used to be a numbers dump: "Купите билеты ...: Москва - 852,
 * Санкт-Петербург - 877, Казань - 48, Екатеринбург - 90. Афиша городов России на
 * Дайбилет." The four per-city counts took ~40% of the description, Google cut the
 * snippet right after the last number, and the brand plus the value proposition
 * never made it into view. The title was brand-first across a dash, and for a
 * brand query like "дай билет" Google served the site as plain "Дайбилет".
 */
test('home title leads with keywords and carries the brand last', () => {
  assert.equal(HOME_SEO_TITLE, 'Экскурсии, музеи и мероприятия в городах России | Дайбилет');
  assert.doesNotMatch(HOME_SEO_TITLE, /^Дайбилет\s*[-\u2013\u2014|]/);
  assert.ok(HOME_SEO_TITLE.endsWith('| Дайбилет'));
  assert.ok(HOME_SEO_TITLE.length <= 60, `title is ${HOME_SEO_TITLE.length} chars, want <= 60`);
});

test('home description fits the SERP and keeps the brand visible', () => {
  const description = buildHomeSeoDescription([
    dest('Москва', 'moskva', 852),
    dest('Санкт-Петербург', 'sankt-peterburg', 877),
    dest('Казань', 'kazan', 48),
    dest('Екатеринбург', 'ekaterinburg', 90),
  ]);
  assert.ok(description.length <= 160, `description is ${description.length} chars, want <= 160`);
  assert.ok(description.endsWith('Дайбилет.'), 'brand must survive the snippet cut');
  assert.doesNotMatch(description, /Москва|Санкт-Петербург|Екатеринбург/);
  // Must survive ensureSeoDescription() unchanged, or the served copy differs.
  assert.equal(ensureSeoDescription(description, HOME_SEO_DESCRIPTION_FALLBACK), description);
});

test('home description carries one stable number, not per-city counts', () => {
  const a = buildHomeSeoDescription([dest('Москва', 'moskva', 852), dest('Казань', 'kazan', 48)]);
  const b = buildHomeSeoDescription([dest('Москва', 'moskva', 801), dest('Казань', 'kazan', 61)]);
  assert.equal(a, b, 'description must not churn when event counts move');
  assert.match(a, /в 2 городах России/);
});

test('home description counts only cities that actually have events', () => {
  const description = buildHomeSeoDescription([
    dest('Москва', 'moskva', 852),
    dest('Пустой город', 'pusto', 0),
    dest('Регион', 'region-1', 500, 'region'),
  ]);
  assert.match(description, /в 1 городах России/);
  assert.doesNotMatch(description, /Пустой город|Регион/);
});

test('home description falls back when there are no live cities', () => {
  assert.equal(buildHomeSeoDescription([]), HOME_SEO_DESCRIPTION_FALLBACK);
  assert.equal(
    buildHomeSeoDescription([dest('Пустой', 'pusto', 0), dest('Регион', 'r', 10, 'region')]),
    HOME_SEO_DESCRIPTION_FALLBACK,
  );
});
