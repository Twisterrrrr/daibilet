import assert from 'node:assert/strict';
import test from 'node:test';

import { checkRewriteDraft, statusAfterQa } from './description-revision-qa.js';

const CONTEXT = {
  sourceText: 'Концерт группы Saphath в клубе Рассвет. Продолжительность 120 минут. Билеты от 1800 рублей.',
  title: 'Saphath (РАССВЕТ)',
  city: 'Санкт-Петербург',
  scheduledDurationMinutes: [120],
};

test('clean rewrite passes QA', () => {
  const flags = checkRewriteDraft(
    'Концерт группы Saphath пройдёт в клубе Рассвет. Вечер начнётся в 20:00 и продлится 120 минут. Билеты от 1800 рублей.',
    CONTEXT,
  );
  assert.deepEqual(flags, []);
  assert.equal(statusAfterQa(flags), 'CHECKED');
});

test('provider mentions and long dashes are flagged', () => {
  const flags = checkRewriteDraft('Купить через Ticketscloud — быстро и удобно!!! 😊', CONTEXT);
  const codes = flags.map((flag) => flag.code);
  assert.ok(codes.includes('provider_mention'));
  assert.ok(codes.includes('long_dash'));
  assert.ok(codes.includes('exclamations'));
  assert.ok(codes.includes('emoji'));
  assert.equal(statusAfterQa(flags), 'GENERATED');
});

test('invented numbers are flagged', () => {
  const flags = checkRewriteDraft('На сцене выступят 42 музыканта, будет 7 сюрпризов.', CONTEXT);
  const codes = flags.map((flag) => flag.code);
  assert.ok(codes.includes('invented_numbers'));
});

test('numbers from source and schedule pass', () => {
  const flags = checkRewriteDraft('Ждём вас 18 ноября в 20:00, концерт продлится 120 минут, билеты от 1800 рублей.', {
    ...CONTEXT,
    sourceText: `${CONTEXT.sourceText} 18 ноября, начало в 20:00.`,
  });
  assert.deepEqual(flags, []);
});

test('duration mismatch is flagged', () => {
  const flags = checkRewriteDraft('Прогулка продлится 45 минут.', CONTEXT);
  const codes = flags.map((flag) => flag.code);
  assert.ok(codes.includes('duration_mismatch'));
});

test('duration mentioned in source is allowed even if not in schedule', () => {
  const flags = checkRewriteDraft('Организатор указал длительность 45 минут.', {
    ...CONTEXT,
    sourceText: 'Текст. Длительность 45 минут.',
    scheduledDurationMinutes: [90],
  });
  assert.deepEqual(flags, []);
});

test('empty draft is flagged', () => {
  const flags = checkRewriteDraft('   ', CONTEXT);
  assert.equal(flags[0]?.code, 'empty_draft');
});
