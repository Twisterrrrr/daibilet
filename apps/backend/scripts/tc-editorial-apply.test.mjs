import assert from 'node:assert/strict';
import test from 'node:test';

import { sha256, validateBatch, validateEditorialDescription } from './tc-editorial-apply.mjs';

const sourceDescription = 'Исходное описание программы.';
const description = `Практическое занятие помогает заранее понять формат и спокойно выбрать подходящий сеанс.

## Что вас ждет
Содержание занятия следует программе организатора без дополнительных обещаний.

## Особенности
- Продолжительность - 30 минут
- Площадка указана в карточке события`;

test('validates structured editorial copy', () => {
  assert.deepEqual(validateEditorialDescription(description), {
    valid: true,
    errors: [],
    headings: ['Что вас ждет', 'Особенности'],
    featureItems: 2,
  });
});

test('batch requires approved, hashed and structured series entries', () => {
  const batch = {
    batchId: 'tc-test',
    source: 'TICKETSCLOUD',
    series: [{
      metaExternalId: 'meta-1',
      representativeEventId: 'evt-1',
      title: 'Мастер-класс',
      sourceDescription,
      expectedSourceDescriptionSha256: sha256(sourceDescription),
      description,
      shortDescription: 'Короткое описание.',
      seoDescription: 'SEO-описание.',
      facts: ['duration:30', 'venue:test'],
      quality: { status: 'APPROVED', warnings: [] },
    }],
  };
  assert.deepEqual(validateBatch(batch), []);
  batch.series[0].description = 'Стена текста без секций.';
  assert.match(validateBatch(batch).join('\n'), /two ## sections/);
});
