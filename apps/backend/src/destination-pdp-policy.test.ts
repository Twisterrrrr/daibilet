import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransitionDestinationPdpStatus, checkDestinationPdpReadiness, readPublishedDestinationPdp } from './destination-pdp-policy.js';

test('destination PDP requires intro, a content block, and sources before READY', () => {
  assert.deepEqual(checkDestinationPdpReadiness({}), {
    ready: false,
    missing: ['introTitle', 'introText', 'sources', 'featured_content'],
  });
  assert.deepEqual(checkDestinationPdpReadiness({
    introTitle: 'Что посмотреть в Перми',
    introText: 'Короткий проверенный обзор города.',
    mustSee: [{ name: 'Набережная Камы' }],
    sources: [{ title: 'Официальный туристический портал', url: 'https://visitperm.ru' }],
  }), { ready: true, missing: [] });
});

test('destination PDP content rejects unsafe URL schemes', () => {
  assert.equal(checkDestinationPdpReadiness({
    introTitle: 'Город',
    introText: 'Обзор',
    mustSee: [{ name: 'Парк', href: 'javascript:alert(1)' }],
    sources: [{ title: 'Источник', url: 'https://example.org' }],
  }).ready, false);
});

test('published destination PDP can only be hidden before returning to review', () => {
  assert.equal(canTransitionDestinationPdpStatus('PUBLISHED', 'HIDDEN'), true);
  assert.equal(canTransitionDestinationPdpStatus('PUBLISHED', 'READY'), false);
  assert.equal(canTransitionDestinationPdpStatus('HIDDEN', 'REVIEW'), true);
});

test('previous published snapshot remains public while a new draft is under review', () => {
  const snapshot = {
    version: 3,
    summary: 'Предыдущая редакция',
    content: { introTitle: 'Город', introText: 'Проверенный текст' },
  };
  const published = readPublishedDestinationPdp({
    status: 'REVIEW',
    publishedContent: snapshot,
    version: 5,
    isIndexable: true,
    publishedAt: new Date('2026-11-01T10:00:00.000Z'),
  });
  assert.equal(published?.summary, 'Предыдущая редакция');
  assert.equal(published?.version, 3);
  assert.equal(readPublishedDestinationPdp({
    status: 'HIDDEN',
    publishedContent: snapshot,
    version: 4,
    isIndexable: false,
    publishedAt: new Date('2026-11-01T10:00:00.000Z'),
  }), null);
});
