import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildStagingRecord,
  extractEventSlug,
  isCatalogPhoto,
  messageKey,
  scoreTitleCandidates,
} from './organizer-email-intake.js';

test('extracts event slug from a daibilet link in the body', () => {
  assert.equal(
    extractEventSlug('Добрый день! Доп. инфо по https://daibilet.ru/events/koncert-sovy-abc123 прилагается.'),
    'koncert-sovy-abc123',
  );
  assert.equal(extractEventSlug('Без ссылки в письме'), null);
});

test('message key is stable and filesystem-safe', () => {
  const a = messageKey('<CAF123@mail.ru>', '2026-10-18');
  const b = messageKey('<CAF123@mail.ru>', '2026-10-19');
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{16}$/u);
});

test('staging record keeps the slug, caps the body and flattens attachments', () => {
  const rec = buildStagingRecord({
    messageId: '<x@y>',
    date: '2026-10-18T10:00:00Z',
    from: 'org@example.com',
    subject: '  Фото по событию  ',
    text: `Смотрите https://daibilet.ru/events/motorama-1 \n\n\n\n${'x'.repeat(30000)}`,
    attachments: [{ name: 'photo.jpg', path: '/staging/photo.jpg', size: 123 }],
  });
  assert.equal(rec.eventSlug, 'motorama-1');
  assert.equal(rec.subject, 'Фото по событию');
  assert.ok(rec.text.length <= 20000);
  assert.equal(rec.attachments[0].name, 'photo.jpg');
  assert.equal(rec.reviewed, false);
});

test('title candidates require half the words in common', () => {
  const rows = [
    { id: '1', slug: 's1', title: 'Сова. Большой сольный концерт' },
    { id: '2', slug: 's2', title: 'Выставка современного искусства' },
  ];
  const hit = scoreTitleCandidates('Фото: Сова большой сольный концерт', rows);
  assert.equal(hit.length, 1);
  assert.equal(hit[0].slug, 's1');
  assert.ok(hit[0].score > 0.5);
});

test('catalog photos: images by mime or extension, docs skipped', () => {
  assert.equal(isCatalogPhoto('a.jpg', 'image/jpeg'), true);
  assert.equal(isCatalogPhoto('b.png', ''), true);
  assert.equal(isCatalogPhoto('c.pdf', 'application/pdf'), false);
});
