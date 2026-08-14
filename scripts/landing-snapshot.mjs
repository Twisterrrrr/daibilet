import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDb } from '../apps/backend/src/db.js';
import { buildAdminLandingDetail } from '../apps/backend/src/dto.js';

const DEFAULT_SLUGS = ['river-walks', 'bridges-night', 'moscow-dinner-boat', 'bus-sightseeing'];
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const shouldWrite = args.includes('--write');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const limit = clampNumber(limitArg?.split('=')[1], 1, 50, 15);
const slugs = args.filter((arg) => !arg.startsWith('--')).length
  ? args.filter((arg) => !arg.startsWith('--'))
  : DEFAULT_SLUGS;

const db = createDb(rootDir);
const generatedAt = new Date().toISOString();
const sections = [];

for (const slug of slugs) {
  const detail = await buildAdminLandingDetail(db, slug);
  if (!detail) {
    sections.push(`## ${slug}\n\nЛендинг не найден.\n`);
    continue;
  }
  sections.push(renderLanding(detail, limit));
}

const output = [
  '# Landing Snapshot',
  '',
  `Сгенерировано: ${generatedAt}`,
  '',
  'Проверка показывает первые карточки в ключевых лендингах, причины попадания и количество слотов внутри сгруппированной карточки.',
  '',
  ...sections,
].join('\n');

if (shouldWrite) {
  writeFileSync(path.join(rootDir, 'docs', 'landing-snapshot.md'), output, 'utf8');
}

console.log(output);

function renderLanding(detail, limit) {
  const rows = detail.events.slice(0, limit);
  const summary = [
    `- Эффективных карточек: ${detail.metrics.effectiveEvents}`,
    `- Автоматически: ${detail.metrics.autoEvents}`,
    `- Закреплено вручную: ${detail.metrics.pinnedEvents}`,
    `- Скрыто вручную: ${detail.metrics.excludedEvents}`,
    `- Городов: ${detail.metrics.cities}`,
    `- Площадок: ${detail.metrics.venues}`,
  ].join('\n');

  const tableRows = rows.map((event, index) => [
    String(index + 1),
    cleanCell(event.title),
    cleanCell(event.city),
    cleanCell(event.venue),
    String(event.groupEventIds?.length || 1),
    reviewVerdict(event),
    event.manualStatus ? manualStatusLabel(event.manualStatus) : event.isAutoMatch ? 'авто' : '-',
    cleanCell((event.matchReasons || []).slice(0, 4).join('; ')),
  ]);

  return [
    `## ${detail.rule.title} (${detail.slug})`,
    '',
    summary,
    '',
    '| # | Событие | Город | Площадка | Слотов | Вердикт | Статус | Почему попало |',
    '|---:|---|---|---|---:|---|---|---|',
    ...tableRows.map((row) => `| ${row.join(' | ')} |`),
    '',
  ].join('\n');
}

function cleanCell(value) {
  return String(value || '-')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '/')
    .trim();
}

function manualStatusLabel(status) {
  if (status === 'PINNED') return 'закреплено';
  if (status === 'EXCLUDED') return 'скрыто';
  if (status === 'REVIEW') return 'авто';
  return status || '-';
}

function reviewVerdict(event) {
  if (event.manualStatus === 'PINNED') return 'allow';
  if (event.manualStatus === 'EXCLUDED') return 'deny';
  return 'review';
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}
