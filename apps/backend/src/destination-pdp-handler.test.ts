import assert from 'node:assert/strict';
import test from 'node:test';
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
