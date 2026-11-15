import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import type { PrismaClient } from '@daibilet/db';
import { createDestinationRegionPayloadSchema } from '@daibilet/contracts/city-pdp';
import { createAdminDestinationPdpRouteHandler } from './destination-pdp-handler.js';
import type { RouteContext } from './routing.js';

test('city PDP admin GET is read-only and exposes existing legacy fields for migration into tabs', async () => {
  let createCalls = 0;
  const prisma = {
    city: {
      async findUnique() {
        return {
          id: 'city-1',
          slug: 'perm',
          title: 'Пермь',
          introTitle: 'Пермь сегодня',
          introText: 'Проверенный вступительный текст',
          heroImageUrl: '/images/cities/perm.jpg',
          seoH1: 'Афиша Перми',
          seoTitle: 'События Перми',
          seoDescription: 'Городская афиша',
          canonicalPath: '/cities/perm',
        };
      },
    },
    destinationPdpDocument: {
      async findUnique() { return null; },
      async create() { createCalls += 1; throw new Error('GET must not create'); },
    },
  } as unknown as PrismaClient;
  let body = '';
  let statusCode = 0;
  const context = {
    method: 'GET',
    pathname: '/api/admin/destinations/cities/city-1/pdp',
    request: {},
    response: {
      writeHead(code: number) { statusCode = code; },
      end(value?: string) { body = value || ''; },
    },
  } as unknown as RouteContext;

  const handler = createAdminDestinationPdpRouteHandler({
    prisma,
    invalidatePublicCaches() { throw new Error('GET must not invalidate public caches'); },
  });
  assert.equal(await handler(context), true);
  assert.equal(statusCode, 200);
  assert.equal(createCalls, 0);
  const payload = JSON.parse(body);
  assert.equal(payload.owner.title, 'Пермь');
  assert.equal(payload.owner.legacyDraft.introText, 'Проверенный вступительный текст');
  assert.equal(payload.document, null);
  assert.deepEqual(payload.readiness.missing, ['introTitle', 'introText', 'sources', 'featured_content']);
});

test('region creation payload requires a safe normalized slug', () => {
  assert.equal(createDestinationRegionPayloadSchema.safeParse({ title: 'Пермский край', slug: 'permskiy-kray' }).success, true);
  assert.equal(createDestinationRegionPayloadSchema.safeParse({ title: 'Пермский край', slug: '../unsafe' }).success, false);
});

test('saving a city PDP draft preserves the published snapshot and creates a revision', async () => {
  const previousPublishedContent = {
    version: 3,
    summary: 'Проверенный обзор Перми',
    heroImageUrl: '/images/cities/perm-old.jpg',
    content: { introTitle: 'Пермь', introText: 'Старая редакция.' },
  };
  const existing = {
    id: 'pdp-1', cityId: 'city-1', regionId: null,
    summary: 'Проверенный обзор Перми', heroImageUrl: '/images/cities/perm-old.jpg',
    content: { introTitle: 'Пермь', introText: 'Старая редакция.' },
    publishedContent: previousPublishedContent,
    seoH1: null, seoTitle: null, seoDescription: null, canonicalPath: null,
    status: 'PUBLISHED', isIndexable: true, publishedAt: new Date('2026-11-01T00:00:00.000Z'),
    version: 3, updatedAt: new Date('2026-11-01T00:00:00.000Z'), revisions: [],
  };
  let stored = existing;
  const revisions: Array<Record<string, unknown>> = [];
  const prisma = {
    city: {
      async findUnique() {
        return { id: 'city-1', slug: 'perm', title: 'Пермь', introTitle: null, introText: null, heroImageUrl: null, seoH1: null, seoTitle: null, seoDescription: null, canonicalPath: null };
      },
    },
    async $transaction<T>(callback: (tx: unknown) => Promise<T>) {
      const tx = {
        destinationPdpDocument: {
          async findUnique() { return stored; },
          async update(args: { data: Record<string, unknown> }) {
            stored = { ...stored, ...args.data, version: 4, updatedAt: new Date('2026-11-15T00:00:00.000Z') };
            return stored;
          },
          async findUniqueOrThrow() { return { ...stored, revisions }; },
        },
        destinationPdpRevision: {
          async create(args: { data: Record<string, unknown> }) { revisions.push(args.data); },
        },
      };
      return callback(tx);
    },
  } as unknown as PrismaClient;
  const invalidations: string[] = [];
  const handler = createAdminDestinationPdpRouteHandler({ prisma, invalidatePublicCaches(reason) { invalidations.push(reason); } });
  const request = Readable.from([JSON.stringify({
    summary: 'Обновлённый обзор Перми',
    content: {
      introTitle: 'Пермь: город на Каме',
      introText: 'Новая проверенная редакция.',
      mustSee: [{ name: 'Набережная Камы' }],
      sources: [{ title: 'Официальный туристический портал', url: 'https://visitperm.ru' }],
    },
    changeNote: 'Обновлена вводная часть',
  })]);
  const context = {
    method: 'PATCH',
    pathname: '/api/admin/destinations/cities/city-1/pdp',
    request,
    response: {
      writeHead(code: number) { statusCode = code; },
      end(value?: string) { body = value || ''; },
    },
  } as unknown as RouteContext;
  let body = '';
  let statusCode = 0;

  assert.equal(await handler(context), true);
  assert.equal(statusCode, 200);
  assert.equal(stored.status, 'REVIEW');
  assert.equal(stored.isIndexable, true);
  assert.deepEqual(stored.publishedContent, previousPublishedContent);
  assert.equal(revisions.length, 1);
  assert.equal(revisions[0]?.version, 4);
  assert.equal(invalidations[0], 'destination PDP editorial save');
  const payload = JSON.parse(body);
  assert.equal(payload.document.summary, 'Обновлённый обзор Перми');
  assert.deepEqual(payload.readiness, { ready: true, missing: [] });
});
