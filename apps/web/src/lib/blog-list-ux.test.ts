import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveBlogListingCta } from './blog-listing-links';
import { resolveBlogTopics, parseBlogTopicParam } from './blog-topics';
import { resolveBlogCardDateLabel, staticBlogCards } from './blog-utils';

test('blog topics: standup / kids / routes / concerts', () => {
  assert.deepEqual(resolveBlogTopics({ slug: 'spb-stendap-gid', title: 'Стендап' }), ['standup']);
  assert.ok(resolveBlogTopics({ slug: 'kuda-poyti-s-detmi', tag: 'Семья' }).includes('kids'));
  assert.ok(
    resolveBlogTopics({
      slug: 'moscow-2-dnya-samostoyatelno-marshrut',
      title: 'маршрут',
    }).includes('routes'),
  );
  assert.ok(
    resolveBlogTopics({ slug: 'kak-vybrat-koncert', title: 'Как выбрать концерт' }).includes(
      'concerts',
    ),
  );
  assert.equal(parseBlogTopicParam('standup'), 'standup');
  assert.equal(parseBlogTopicParam('nope'), 'all');
});

test('blog listing CTA prefers schedule label', () => {
  const cta = resolveBlogListingCta({
    slug: 'spb-stendap-gid',
    title: 'Стендап в Петербурге',
    city: 'Санкт-Петербург',
    citySlug: 'saint-petersburg',
  });
  assert.ok(cta);
  assert.equal(cta?.label, 'Смотреть расписание');
  assert.ok(cta?.href);
});

test('static cards expose date + topics + searchText', () => {
  const cards = staticBlogCards();
  const moscow = cards.find((c) => c.slug === 'moscow-2-dnya-samostoyatelno-marshrut');
  assert.ok(moscow);
  assert.ok(moscow?.editorialDate);
  assert.equal(resolveBlogCardDateLabel(moscow!), moscow?.editorialDate);
  assert.ok(moscow?.topics?.includes('routes'));
  assert.ok(moscow?.searchText?.includes('москв'));
});
