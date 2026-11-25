import type { BlogCardDto } from '@/lib/blog-utils';
import { cityHref } from '@/lib/routes';
import type { CityDayRoutePreset } from './cityInfo-data';
import type { PublicCatalogDto, PublicCatalogListItemDto, PublicLandingDto } from '@daibilet/contracts/public';

export type AfishaBlockType =
  | 'EVENT_RAIL'
  | 'FEATURED_EVENTS'
  | 'PROMO_BANNER'
  | 'ARTICLE'
  | 'ARTICLE_RAIL'
  | 'CITY_HUB'
  | 'ROUTE'
  | 'COLLECTION'
  | 'CUSTOM_CONTENT';
export type AfishaBlockMode = 'AUTO' | 'MANUAL' | 'HYBRID';
export type AfishaBlockStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
type AfishaRoute = Pick<CityDayRoutePreset, 'id' | 'title'>;

type BaseBlock = {
  id: string;
  type: AfishaBlockType;
  mode: AfishaBlockMode;
  order: number;
  status: AfishaBlockStatus;
  citySlug?: string;
  startsAt?: string;
  endsAt?: string;
};

export type AfishaBlockConfig =
  | (BaseBlock & { type: 'FEATURED_EVENTS'; limit: number; pinnedIds: string[] })
  | (BaseBlock & { type: 'EVENT_RAIL'; limit: number; minItems: number; autoCategories: boolean; category?: string; eventIds: string[] })
  | (BaseBlock & { type: 'ARTICLE_RAIL'; limit: number; articleSlugs: string[] })
  | (BaseBlock & { type: 'ARTICLE'; articleSlug: string })
  | (BaseBlock & { type: 'COLLECTION'; limit: number; landingSlugs: string[] })
  | (BaseBlock & { type: 'CITY_HUB'; limit: number; citySlugs: string[] })
  | (BaseBlock & { type: 'PROMO_BANNER'; title: string; description: string; href: string; imageUrl?: string })
  | (BaseBlock & { type: 'ROUTE'; limit: number; presetIds: string[] })
  | (BaseBlock & { type: 'CUSTOM_CONTENT'; title: string; description: string; href?: string });

/**
 * Phase one editorial schedule. Editors can reorder or tune these validated
 * entries without changing the page component. Manual IDs are intentionally
 * empty until an editor makes an explicit selection.
 */
export const EVENTS_V2_BLOCKS: AfishaBlockConfig[] = [
  { id: 'featured-events', type: 'FEATURED_EVENTS', mode: 'HYBRID', order: 10, status: 'PUBLISHED', limit: 5, pinnedIds: [] },
  { id: 'category-rails', type: 'EVENT_RAIL', mode: 'AUTO', order: 20, status: 'PUBLISHED', limit: 8, minItems: 2, autoCategories: true, eventIds: [] },
  { id: 'articles', type: 'ARTICLE_RAIL', mode: 'AUTO', order: 40, status: 'PUBLISHED', limit: 4, articleSlugs: [] },
  { id: 'city-routes', type: 'ROUTE', mode: 'AUTO', order: 45, status: 'PUBLISHED', limit: 4, presetIds: [] },
  { id: 'collections', type: 'COLLECTION', mode: 'AUTO', order: 50, status: 'PUBLISHED', limit: 4, landingSlugs: [] },
  { id: 'city-hubs', type: 'CITY_HUB', mode: 'AUTO', order: 60, status: 'PUBLISHED', limit: 6, citySlugs: [] },
  { id: 'catalog-link', type: 'CUSTOM_CONTENT', mode: 'AUTO', order: 90, status: 'PUBLISHED', title: 'Хотите увидеть всю афишу?', description: 'Фильтры по дате, цене и категории помогут найти подходящее событие.', href: '/events' },
];

export type ResolvedAfishaBlock =
  | { key: string; type: 'FEATURED_EVENTS'; items: PublicCatalogListItemDto[] }
  | { key: string; type: 'EVENT_RAIL'; title: string; category: string; items: PublicCatalogListItemDto[] }
  | { key: string; type: 'ARTICLE_RAIL'; items: BlogCardDto[] }
  | { key: string; type: 'ARTICLE'; item: BlogCardDto }
  | { key: string; type: 'COLLECTION'; items: PublicLandingDto[] }
  | { key: string; type: 'CITY_HUB'; items: Array<{ name: string; href: string }> }
  | { key: string; type: 'PROMO_BANNER'; title: string; description: string; href: string; imageUrl?: string }
  | { key: string; type: 'ROUTE'; items: Array<{ title: string; href: string }> }
  | { key: string; type: 'CUSTOM_CONTENT'; title: string; description: string; href?: string };

const MAX_LIMIT = 12;
const INTERNAL_PATH = /^\/(?!\/)[^\\\s]*$/u;

function isValidDate(value?: string): boolean {
  return !value || Number.isFinite(Date.parse(value));
}

export function validateAfishaBlock(block: AfishaBlockConfig): boolean {
  if (!block || typeof block.id !== 'string' || !block.id.trim()) return false;
  if (!['AUTO', 'MANUAL', 'HYBRID'].includes(block.mode) || !['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(block.status)) return false;
  if (!Number.isFinite(block.order) || !isValidDate(block.startsAt) || !isValidDate(block.endsAt)) return false;
  if (block.startsAt && block.endsAt && Date.parse(block.startsAt) > Date.parse(block.endsAt)) return false;
  if ('limit' in block && (!Number.isInteger(block.limit) || block.limit < 1 || block.limit > MAX_LIMIT)) return false;
  if (block.type === 'EVENT_RAIL' && (!Number.isInteger(block.minItems) || block.minItems < 1 || block.minItems > block.limit)) return false;
  if ('href' in block && block.href && !INTERNAL_PATH.test(block.href)) return false;
  if ((block.type === 'PROMO_BANNER' || block.type === 'CUSTOM_CONTENT') && !block.title.trim()) return false;
  return true;
}

function isActive(block: AfishaBlockConfig, now: number, citySlug?: string | null): boolean {
  return validateAfishaBlock(block)
    && block.status === 'PUBLISHED'
    && (!block.startsAt || Date.parse(block.startsAt) <= now)
    && (!block.endsAt || Date.parse(block.endsAt) >= now)
    && (!block.citySlug || block.citySlug === citySlug);
}

function sortedByOrder(blocks: AfishaBlockConfig[], now: number, citySlug?: string | null) {
  return blocks.filter((block) => isActive(block, now, citySlug)).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Resolves editorial configuration against already server-limited public data. */
export function resolveAfishaBlocks(input: {
  catalog: PublicCatalogDto;
  articles: BlogCardDto[];
  landings: PublicLandingDto[];
  citySlug?: string | null;
  routes?: AfishaRoute[];
  now?: number;
  config?: AfishaBlockConfig[];
}): ResolvedAfishaBlock[] {
  const { catalog, articles, landings, citySlug = null } = input;
  const now = input.now ?? Date.now();
  const config = sortedByOrder(input.config ?? EVENTS_V2_BLOCKS, now, citySlug);
  const items = catalog.items ?? [];
  const scopedArticles = citySlug
    ? articles.filter((article) => {
        const articleCities = [...(article.citySlugs ?? []), ...(article.citySlug ? [article.citySlug] : [])].map((value) => value.toLowerCase());
        return articleCities.length === 0 || articleCities.includes(citySlug.toLowerCase());
      })
    : articles;
  const usedEventIds = new Set<string>();
  const output: Array<{ order: number; block: ResolvedAfishaBlock }> = [];
  const add = (order: number, block: ResolvedAfishaBlock) => output.push({ order, block });

  for (const entry of config) {
    if (entry.type === 'FEATURED_EVENTS') {
      const pinned = entry.mode === 'AUTO' ? [] : entry.pinnedIds.map((id) => items.find((item) => item.id === id)).filter((item): item is PublicCatalogListItemDto => Boolean(item));
      const automatic = entry.mode === 'MANUAL' ? [] : items.filter((item) => item.imageUrl && !pinned.some((fixed) => fixed.id === item.id));
      const selected = [...pinned, ...automatic]
        .filter((item) => !usedEventIds.has(item.id)).slice(0, entry.limit);
      selected.forEach((item) => usedEventIds.add(item.id));
      if (selected.length >= 2) add(entry.order, { key: entry.id, type: 'FEATURED_EVENTS', items: selected });
      continue;
    }

    if (entry.type === 'EVENT_RAIL') {
      const candidates = entry.autoCategories
        ? Array.from(new Set(items.map((item) => item.category).filter(Boolean)))
        : [entry.category].filter((value): value is string => Boolean(value));
      let offset = 0;
      for (const category of candidates) {
        const pinned = entry.mode === 'AUTO' ? [] : entry.eventIds
          .map((id) => items.find((item) => item.id === id && item.category === category))
          .filter((item): item is PublicCatalogListItemDto => Boolean(item));
        const automatic = entry.mode === 'MANUAL' ? [] : items.filter((item) => item.category === category && !pinned.some((fixed) => fixed.id === item.id));
        const categoryItems = [...pinned, ...automatic].filter((item) => !usedEventIds.has(item.id));
        if (categoryItems.length < entry.minItems) continue;
        const selected = categoryItems.slice(0, entry.limit);
        selected.forEach((item) => usedEventIds.add(item.id));
        add(entry.order + offset / 100, { key: `${entry.id}:${category}`, type: 'EVENT_RAIL', title: category, category, items: selected });
        offset += 1;
      }
      continue;
    }

    if (entry.type === 'ARTICLE_RAIL') {
      const pinned = entry.mode === 'AUTO' ? [] : entry.articleSlugs.map((slug) => scopedArticles.find((article) => article.slug === slug)).filter((article): article is BlogCardDto => Boolean(article));
      const automatic = entry.mode === 'MANUAL' ? [] : scopedArticles.filter((article) => !pinned.some((fixed) => fixed.slug === article.slug));
      const available = [...pinned, ...automatic];
      const selected = available.slice(0, entry.limit);
      if (selected.length) add(entry.order, { key: entry.id, type: 'ARTICLE_RAIL', items: selected });
      continue;
    }

    if (entry.type === 'ARTICLE') {
      const article = scopedArticles.find((item) => item.slug === entry.articleSlug);
      if (article) add(entry.order, { key: entry.id, type: 'ARTICLE', item: article });
      continue;
    }

    if (entry.type === 'COLLECTION') {
      const pinned = entry.mode === 'AUTO' ? [] : entry.landingSlugs.map((slug) => landings.find((landing) => landing.slug === slug)).filter((landing): landing is PublicLandingDto => Boolean(landing));
      const automatic = entry.mode === 'MANUAL' ? [] : landings.filter((landing) => !pinned.some((fixed) => fixed.slug === landing.slug));
      const available = [...pinned, ...automatic];
      const selected = available.filter((landing) => landing.strength === 'ready' && landing.events > 0).slice(0, entry.limit);
      if (selected.length) add(entry.order, { key: entry.id, type: 'COLLECTION', items: selected });
      continue;
    }

    if (entry.type === 'CITY_HUB') {
      const bySlug = new Map(items.filter((item) => item.citySlug).map((item) => [item.citySlug!, { name: item.city, slug: item.citySlug! }]));
      const pinned = entry.mode === 'AUTO' ? [] : entry.citySlugs.map((slug) => bySlug.get(slug) ?? { name: slug, slug });
      const automatic = entry.mode === 'MANUAL' ? [] : Array.from(new Map(items.filter((item) => item.city).map((item) => [item.citySlug || item.city, { name: item.city, slug: item.citySlug || undefined }])).values());
      const names = [...pinned, ...automatic.filter((city) => !pinned.some((fixed) => fixed.slug === city.slug || fixed.name === city.name))];
      const selected = names.slice(0, entry.limit).map((city) => ({ name: city.name, href: cityHref({ name: city.name, slug: city.slug }) }));
      if (selected.length) add(entry.order, { key: entry.id, type: 'CITY_HUB', items: selected });
      continue;
    }

    if (entry.type === 'PROMO_BANNER') {
      add(entry.order, { key: entry.id, type: entry.type, title: entry.title, description: entry.description, href: entry.href, imageUrl: entry.imageUrl });
      continue;
    }

    if (entry.type === 'ROUTE') {
      const pinned = entry.mode === 'AUTO' ? [] : entry.presetIds.map((id) => input.routes?.find((preset) => preset.id === id)).filter((preset): preset is AfishaRoute => Boolean(preset));
      const automatic = entry.mode === 'MANUAL' ? [] : (input.routes ?? []).filter((preset) => !pinned.some((fixed) => fixed.id === preset.id));
      const presets = [...pinned, ...automatic];
      const selected = presets.slice(0, entry.limit).map((preset) => ({
        title: preset.title,
        href: `/my-day?${new URLSearchParams({ route: preset.id, ...(citySlug ? { city: citySlug } : {}) }).toString()}`,
      }));
      if (selected.length) add(entry.order, { key: entry.id, type: entry.type, items: selected });
      continue;
    }

    add(entry.order, { key: entry.id, type: entry.type, title: entry.title, description: entry.description, href: entry.href });
  }

  return output.sort((a, b) => a.order - b.order).map(({ block }) => block);
}
