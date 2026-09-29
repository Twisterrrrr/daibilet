import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AI_REWRITE_MAX_INPUT_CHARS,
  SYSTEM_PROMPT,
  assertRewriteCooldown,
  buildRewriteUserPrompt,
  callOpenAiRewrite,
  formatDurationMinutesRu,
  formatScheduledDurationFact,
  normalizeScheduledDurationMinutes,
  resetRewriteCooldownForTests,
  rewriteEventDescription,
  roundDurationMinutesToFive,
  sanitizeRewriteOutput,
  truncateRewriteInput,
  validateRewriteStructure,
  AiRewriteError,
} from './ai-rewrite-description.js';

test('SYSTEM_PROMPT includes safety hexagon rules', () => {
  assert.match(SYSTEM_PROMPT, /НИКАКИХ ВЫДУМАННЫХ ФАКТОВ/);
  assert.match(SYSTEM_PROMPT, /СОХРАНЕНИЕ СТРУКТУРНЫХ ДАННЫХ/);
  assert.match(SYSTEM_PROMPT, /Ticketscloud/);
  assert.match(SYSTEM_PROMPT, /Markdown/);
  assert.match(SYSTEM_PROMPT, /времени начала и окончания/);
  assert.match(SYSTEM_PROMPT, /ближайших 5 минут/);
  assert.match(SYSTEM_PROMPT, /ОБЯЗАТЕЛЬНЫЙ РИТМ ТЕКСТА/);
  assert.match(SYSTEM_PROMPT, /## Особенности/);
  assert.match(SYSTEM_PROMPT, /Не пиши заголовок/);
});

test('truncateRewriteInput keeps short text', () => {
  const result = truncateRewriteInput('  hello world  ');
  assert.equal(result.text, 'hello world');
  assert.equal(result.truncated, false);
});

test('truncateRewriteInput cuts long text', () => {
  const long = 'x'.repeat(AI_REWRITE_MAX_INPUT_CHARS + 50);
  const result = truncateRewriteInput(long);
  assert.equal(result.truncated, true);
  assert.equal(result.text.length, AI_REWRITE_MAX_INPUT_CHARS);
});

test('buildRewriteUserPrompt includes title and description', () => {
  const { prompt, truncated } = buildRewriteUserPrompt('Исходный текст экскурсии', {
    title: 'Обзорная по Перми',
    city: 'Пермь',
    venue: 'Дом культуры',
    venueAddress: 'ул. Ленина, 1',
    ageLimit: '12',
    category: 'Экскурсии',
  });
  assert.equal(truncated, false);
  assert.match(prompt, /Обзорная по Перми/);
  assert.match(prompt, /Пермь/);
  assert.match(prompt, /Дом культуры/);
  assert.match(prompt, /ул\. Ленина, 1/);
  assert.match(prompt, /12\+/);
  assert.match(prompt, /Категория: Экскурсии/);
  assert.match(prompt, /Исходный текст экскурсии/);
});

test('schedule duration is rounded to five minutes and included as a structured fact', () => {
  const { prompt } = buildRewriteUserPrompt('На занятии участники напишут картину.', {
    title: 'Мастер-класс по живописи',
    scheduledDurationMinutes: [67],
  });

  assert.match(prompt, /Расчётная длительность по расписанию: 1 час 5 минут/);
  assert.match(prompt, /длительность добавляй только если ее нет/);
});

test('schedule duration variants remain explicit after rounding', () => {
  assert.deepEqual(normalizeScheduledDurationMinutes([67, 68, '67', null, -1]), [65, 70]);
  assert.equal(roundDurationMinutesToFive(62), 60);
  assert.equal(roundDurationMinutesToFive(63), 65);
  assert.equal(roundDurationMinutesToFive('bad'), null);
  assert.equal(formatDurationMinutesRu(125), '2 часа 5 минут');
  assert.equal(
    formatScheduledDurationFact([67, 68]),
    'Расчётная длительность зависит от сеанса: 1 час 5 минут, 1 час 10 минут.',
  );
});

test('buildRewriteUserPrompt rejects empty description', () => {
  assert.throws(
    () => buildRewriteUserPrompt('   '),
    (error: unknown) => error instanceof AiRewriteError && error.code === 'empty_description',
  );
});

test('sanitizeRewriteOutput strips fences and preambles', () => {
  assert.equal(sanitizeRewriteOutput('```markdown\nПривет\n```'), 'Привет');
  assert.equal(sanitizeRewriteOutput('Вот ваш текст: Готовый абзац'), 'Готовый абзац');
  assert.equal(sanitizeRewriteOutput('"Обёрнутый"'), 'Обёрнутый');
});

test('validateRewriteStructure requires an intro, sections and feature bullets', () => {
  const valid = validateRewriteStructure(`Камерное занятие знакомит участников с техникой и форматом работы.

## Что вас ждет
Короткая практическая часть по исходной программе организатора.

## Особенности
- Продолжительность - 45 минут
- Площадка находится в центре города`, { requireFeatures: true });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.headings, ['Что вас ждет', 'Особенности']);
  assert.equal(valid.featureCount, 2);

  const wall = validateRewriteStructure('Один длинный абзац без смысловых блоков и без списка особенностей.');
  assert.equal(wall.valid, false);
  assert.match(wall.errors.join(' '), /смысловых секций/);

  const duplicateHeading = validateRewriteStructure(`Содержательное вступление перед секциями занимает больше сорока знаков.

## О событии
Описание.

## Особенности
- Первый факт
- Второй факт`);
  assert.equal(duplicateHeading.valid, false);
  assert.match(duplicateHeading.errors.join(' '), /дублировать/);
});

test('validateRewriteStructure keeps features optional for a sparse source', () => {
  const result = validateRewriteStructure(`Событие с коротким исходным описанием, для которого доступны только основные сведения о формате.

## Формат
Подробности программы организатор не уточняет.

## Перед посещением
Проверьте актуальные условия выбранного сеанса.`);

  assert.equal(result.valid, true);
  assert.equal(result.featureCount, 0);

  const required = validateRewriteStructure(`Содержательное вступление перед двумя секциями занимает больше сорока знаков.

## Формат
Короткое описание формата.

## Перед посещением
Практическая информация.`, { requireFeatures: true });
  assert.equal(required.valid, false);
  assert.match(required.errors.join(' '), /Особенности/);
});

test('assertRewriteCooldown blocks rapid repeats', () => {
  resetRewriteCooldownForTests();
  assertRewriteCooldown('evt_1', 1_000);
  assert.throws(
    () => assertRewriteCooldown('evt_1', 1_500),
    (error: unknown) => error instanceof AiRewriteError && error.code === 'rate_limited',
  );
  assertRewriteCooldown('evt_1', 7_000);
});

test('callOpenAiRewrite fails without API key', async () => {
  await assert.rejects(
    () => callOpenAiRewrite({ userPrompt: 'x', apiKey: '' }),
    (error: unknown) => error instanceof AiRewriteError && error.code === 'missing_openai_key',
  );
});

test('rewriteEventDescription uses mock OpenAI HTTP', async () => {
  resetRewriteCooldownForTests();
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: '```md\nУникальный текст экскурсии помогает понять формат до покупки билета.\n\n## Что вас ждет\nФактическая программа из исходного описания.\n\n## Особенности\n- Первый подтвержденный факт\n- Второй подтвержденный факт\n```' } }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );

  const result = await rewriteEventDescription({
    eventId: 'evt_mock',
    originalDescription: 'Оригинал описания для рерайта',
    meta: { title: 'Тест' },
    apiKey: 'sk-test',
    model: 'gpt-test',
    fetchImpl,
  });

  assert.match(result.text, /## Особенности/);
  assert.equal(result.model, 'gpt-test');
  assert.equal(result.truncatedInput, false);
});

test('rewriteEventDescription rejects a one-block model response', async () => {
  resetRewriteCooldownForTests();
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({ choices: [{ message: { content: 'Готовый, но неструктурированный абзац.' } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );

  await assert.rejects(
    () => rewriteEventDescription({
      eventId: 'evt_bad_structure',
      originalDescription: 'Оригинальное описание события.',
      apiKey: 'sk-test',
      model: 'gpt-test',
      fetchImpl,
    }),
    (error: unknown) => error instanceof AiRewriteError && error.code === 'invalid_rewrite_structure',
  );
});

test('callOpenAiRewrite maps OpenAI HTTP errors', async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'quota' } }), {
      status: 429,
      headers: { 'content-type': 'application/json' },
    });

  await assert.rejects(
    () => callOpenAiRewrite({ userPrompt: 'x', apiKey: 'sk-test', fetchImpl }),
    (error: unknown) =>
      error instanceof AiRewriteError && error.code === 'openai_http_error' && error.statusCode === 429,
  );
});
