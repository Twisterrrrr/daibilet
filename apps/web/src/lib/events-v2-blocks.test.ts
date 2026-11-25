import assert from 'node:assert/strict';
import test from 'node:test';

import type { BlogCardDto } from '@/lib/blog-utils';
import type { PublicCatalogDto, PublicCatalogListItemDto, PublicLandingDto } from '@daibilet/contracts/public';
import { resolveAfishaBlocks, validateAfishaBlock, type AfishaBlockConfig } from './events-v2-blocks';

function event(id: string, category: string, city = 'Москва', citySlug = 'moscow', imageUrl: string | null = `/images/${id}.jpg`) {
  return { id, title: id, category, city, citySlug, imageUrl, startsAt: '2027-01-01T12:00:00.000Z' } as unknown as PublicCatalogListItemDto;
}

function catalog(items: PublicCatalogListItemDto[]): PublicCatalogDto {
  return { items, total: items.length, limit: 40, offset: 0, hasMore: false, facets: { cities: [], categories: [], subcategories: [], landings: [], priceSteps: [] } };
}

const article = (slug: string): BlogCardDto => ({ slug, title: slug, excerpt: '', coverImageUrl: '', readMin: 3, tag: 'Гид' });
const landing = (slug: string, strength: 'ready' | 'seed' | 'empty' = 'ready'): PublicLandingDto => ({ slug, title: slug, subtitle: '', chips: [], events: 2, venues: 0, strength });

test('validates limits, internal links, and publication windows', () => {
  const base = { id: 'promo', type: 'CUSTOM_CONTENT', mode: 'AUTO', order: 1, status: 'PUBLISHED', title: 'Promo', description: 'Text', href: '/events' } as const satisfies AfishaBlockConfig;
  assert.equal(validateAfishaBlock(base), true);
  assert.equal(validateAfishaBlock({ ...base, href: '//other.test' }), false);
  assert.equal(validateAfishaBlock({ ...base, startsAt: 'bad-date' }), false);
  assert.equal(validateAfishaBlock({ ...base, order: Number.NaN }), false);
  assert.equal(validateAfishaBlock({ ...base, type: 'COLLECTION', limit: 13, landingSlugs: [] }), false);
});

test('orders live blocks, hides empty material, and avoids repeating events', () => {
  const items = [event('a', 'Музыка'), event('b', 'Музыка'), event('c', 'Театр'), event('d', 'Театр')];
  const config: AfishaBlockConfig[] = [
    { id: 'rails', type: 'EVENT_RAIL', mode: 'AUTO', order: 20, status: 'PUBLISHED', limit: 5, minItems: 2, autoCategories: true, eventIds: [] },
    { id: 'featured', type: 'FEATURED_EVENTS', mode: 'HYBRID', order: 10, status: 'PUBLISHED', limit: 2, pinnedIds: ['a'] },
    { id: 'empty-articles', type: 'ARTICLE_RAIL', mode: 'MANUAL', order: 30, status: 'PUBLISHED', limit: 3, articleSlugs: ['missing'] },
    { id: 'draft', type: 'CUSTOM_CONTENT', mode: 'AUTO', order: 40, status: 'DRAFT', title: 'Draft', description: '' },
    { id: 'expired', type: 'CUSTOM_CONTENT', mode: 'AUTO', order: 50, status: 'PUBLISHED', endsAt: '2020-01-01T00:00:00.000Z', title: 'Expired', description: '' },
  ];
  const resolved = resolveAfishaBlocks({ catalog: catalog(items), articles: [], landings: [], config, now: Date.parse('2026-11-25T00:00:00.000Z') });
  assert.deepEqual(resolved.map((block) => block.type), ['FEATURED_EVENTS', 'EVENT_RAIL']);
  const displayedIds = resolved.flatMap((block) => block.type === 'FEATURED_EVENTS' || block.type === 'EVENT_RAIL' ? block.items.map((item) => item.id) : []);
  assert.equal(new Set(displayedIds).size, displayedIds.length);
  assert.deepEqual(displayedIds, ['a', 'b', 'c', 'd']);
});

test('AUTO/HYBRID use published server materials while MANUAL keeps only selected entries', () => {
  const config: AfishaBlockConfig[] = [
    { id: 'articles', type: 'ARTICLE_RAIL', mode: 'HYBRID', order: 1, status: 'PUBLISHED', limit: 3, articleSlugs: ['b'] },
    { id: 'collections', type: 'COLLECTION', mode: 'MANUAL', order: 2, status: 'PUBLISHED', limit: 3, landingSlugs: ['ready'] },
  ];
  const resolved = resolveAfishaBlocks({
    catalog: catalog([]),
    articles: [article('a'), article('b')],
    landings: [landing('seed', 'seed'), landing('ready'), landing('empty', 'empty')],
    config,
  });
  assert.equal(resolved[0]?.type, 'ARTICLE_RAIL');
  if (resolved[0]?.type === 'ARTICLE_RAIL') assert.deepEqual(resolved[0].items.map((item) => item.slug), ['b', 'a']);
  assert.equal(resolved[1]?.type, 'COLLECTION');
  if (resolved[1]?.type === 'COLLECTION') assert.deepEqual(resolved[1].items.map((item) => item.slug), ['ready']);
});

test('city scoped block does not leak into the federal showcase', () => {
  const config: AfishaBlockConfig[] = [{ id: 'city-only', type: 'CUSTOM_CONTENT', mode: 'MANUAL', order: 1, status: 'PUBLISHED', citySlug: 'moscow', title: 'Москва', description: '', href: '/cities/moscow' }];
  assert.equal(resolveAfishaBlocks({ catalog: catalog([]), articles: [], landings: [], config }).length, 0);
  assert.equal(resolveAfishaBlocks({ catalog: catalog([]), articles: [], landings: [], citySlug: 'moscow', config }).length, 1);
});

test('real city route presets link to the existing My Day route and retain the city', () => {
  const config: AfishaBlockConfig[] = [{ id: 'routes', type: 'ROUTE', mode: 'AUTO', order: 1, status: 'PUBLISHED', limit: 3, presetIds: [] }];
  const resolved = resolveAfishaBlocks({ catalog: catalog([]), articles: [], landings: [], citySlug: 'moscow', routes: [{ id: 'msk-1', title: 'Москва за день' }], config });
  assert.equal(resolved[0]?.type, 'ROUTE');
  if (resolved[0]?.type === 'ROUTE') assert.deepEqual(resolved[0].items, [{ title: 'Москва за день', href: '/my-day?route=msk-1&city=moscow' }]);
});

test('MANUAL featured block never fills missing editorial picks automatically', () => {
  const config: AfishaBlockConfig[] = [{ id: 'manual-featured', type: 'FEATURED_EVENTS', mode: 'MANUAL', order: 1, status: 'PUBLISHED', limit: 3, pinnedIds: ['absent'] }];
  assert.deepEqual(resolveAfishaBlocks({ catalog: catalog([event('available', 'Музыка')]), articles: [], landings: [], config }), []);
});
