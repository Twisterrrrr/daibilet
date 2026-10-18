import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildStagingRecord,
  classifyEventTiming,
  extractEventId,
  extractEventSlug,
  htmlToText,
  isCatalogPhoto,
  isOrganizerSender,
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

test('only allowlisted senders pass: owner forwards and the TC agent', () => {
  assert.equal(isOrganizerSender('Ticketscloud <agent@ticketscloud.com>'), true);
  assert.equal(isOrganizerSender('agent@ticketscloud.com'), true);
  assert.equal(isOrganizerSender('Василий <v.butin@yandex.ru>'), true);
  assert.equal(isOrganizerSender('V.BUTIN@YANDEX.RU'), true);
  assert.equal(isOrganizerSender('spammer@example.com'), false);
  assert.equal(isOrganizerSender('agent@ticketscloud.com.evil.com'), false);
  assert.equal(isOrganizerSender('v.butin@yandex.ru.fake.com'), false);
  assert.equal(isOrganizerSender(''), false);
});

test('event timing: past sessions block, open dates keep it alive', () => {
  const now = new Date('2026-10-18T12:00:00Z');
  assert.equal(classifyEventTiming(['2026-10-01T10:00:00Z', '2026-10-05T10:00:00Z'], now), 'past');
  assert.equal(classifyEventTiming(['2026-10-01T10:00:00Z', '2026-11-05T10:00:00Z'], now), 'upcoming');
  assert.equal(classifyEventTiming([], now), 'unknown');
  assert.equal(classifyEventTiming(null, now), 'unknown');
  // Open-date session (null startsAt) among past dates -> not finished.
  assert.equal(classifyEventTiming(['2026-10-01T10:00:00Z', null], now), 'upcoming');
  assert.equal(classifyEventTiming([null], now), 'upcoming');
});

test('event id is pulled from the Ticketscloud subject line', () => {
  assert.equal(
    extractEventId('Передача материалов мероприятия 6aa04c8958ec99038f05f8e1'),
    '6aa04c8958ec99038f05f8e1',
  );
  assert.equal(extractEventId('Fwd: Передать материалы для 6aba2dadc8b2b907294e76ab'), '6aba2dadc8b2b907294e76ab');
  assert.equal(extractEventId('Просто письмо без id'), null);
});

test('htmlToText keeps readable copy from HTML-only forwards', () => {
  const html =
    '-------- Пересылаемое сообщение -------- <p>К нам обратился организатор<br>с просьбой передать фото: &laquo;АРЛЕКИНО&raquo;</p>';
  const text = htmlToText(html);
  assert.match(text, /К нам обратился организатор/);
  assert.match(text, /«АРЛЕКИНО»/);
  assert.doesNotMatch(text, /<p>|<br>/);
});

test('staging record falls back to html text and carries the event id', () => {
  const rec = buildStagingRecord({
    messageId: '<f@y>',
    date: '2026-10-18T15:04:00Z',
    from: 'v.butin@yandex.ru',
    subject: 'Fwd: Передача материалов мероприятия 6aa04c8958ec99038f05f8e1',
    text: '',
    html: '<p>Описание: <b>спектакль</b> про детскую мечту.</p>',
    attachments: [{ name: 'image (17).png', path: '/staging/x.png', size: 10 }],
  });
  assert.equal(rec.eventId, '6aa04c8958ec99038f05f8e1');
  assert.match(rec.text, /спектакль/);
  assert.equal(rec.attachments.length, 1);
});
