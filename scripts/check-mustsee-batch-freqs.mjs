#!/usr/bin/env node
/**
 * Aggregate marker freqs for moscow must-see description batches.
 * Usage: node scripts/check-mustsee-batch-freqs.mjs docs/drafts/moscow-mustsee-batch-01.md
 */
import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/check-mustsee-batch-freqs.mjs <batch.md>');
  process.exit(2);
}

const raw = fs.readFileSync(file, 'utf8');
const parts = raw.split(/\n(?=## \d+\. )/);
const blocks = [];

for (const part of parts) {
  const m = part.match(/^## (\d+)\.\s+([^\n]+)\n([\s\S]*?)(?=\n---\s*\n|\n## \d+\. |\n## Частоты|\s*$)/);
  if (!m) continue;
  const name = m[2].trim();
  const chunk = m[3];
  const openMeta = (chunk.match(/открытие:\s*([^\n·]+)/i) || [, ''])[1].trim();
  const metaEnd = chunk.search(/\n\n(?![-\s])/);
  const body = metaEnd >= 0 ? chunk.slice(metaEnd).trim() : chunk.trim();
  const paras = body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('- ') && !p.startsWith('#') && !p.startsWith('|') && !p.startsWith('```'));
  blocks.push({ name, body: paras.join('\n\n'), openMeta, paras });
}

const n = blocks.length;
if (!n) {
  console.error('No ## N. sections found');
  process.exit(2);
}

/** JS `\b` is ASCII-only; Cyrillic needs unicode boundaries. */
const has = (re) => blocks.filter((b) => re.test(b.body)).length;
const pct = (c) => `${c}/${n} (${Math.round((100 * c) / n)}%)`;

const komu = has(/(?<![\p{L}\p{N}_])Кому(?![\p{L}\p{N}_])/u);
const ryadom = has(/(?<![\p{L}\p{N}_])Рядом(?![\p{L}\p{N}_])/u);
const metro = has(/(?<![\p{L}\p{N}_])метро(?![\p{L}\p{N}_])/iu);
const luchshe = has(/(?<![\p{L}\p{N}_])лучше(?![\p{L}\p{N}_])/iu);
/** «не» / «а не» + verb/modal - tick even without contrast-label «не X». */
const neVerb = has(
  /(?<![\p{L}\p{N}_])(?:а\s+)?не\s+(?:стоит|пройти|пройдёте|получится|будет|надо|нужно|хочется|думайте|устраивайте|фотографируют|пропустите|коллекционирует|любит|находят|гарантирует|рассчитывать|смешивайте|зайдёте|пытайтесь)(?![\p{L}\p{N}_])/iu,
);
/**
 * Contrast-label «не X»: «не „…“» / «не парадный».
 * Do NOT count plain «а не …» (normal Russian). Etalon keeps ≤3-4 intentional.
 */
const neX = has(
  /(?<![\p{L}\p{N}_])не\s+[«"„]|(?<![\p{L}\p{N}_])не\s+(?:витринный|парадный|музейн[\p{L}]*|случайная|тихие|скрыт[\p{L}]*|обязательн[\p{L}]*)(?![\p{L}\p{N}_])/iu,
);

const openCounts = {};
for (const b of blocks) {
  const k = b.openMeta || 'unknown';
  openCounts[k] = (openCounts[k] || 0) + 1;
}
const lenCounts = { 2: 0, 3: 0, 4: 0, other: 0 };
for (const b of blocks) {
  const L = b.paras.length;
  if (L === 2 || L === 3 || L === 4) lenCounts[L] += 1;
  else lenCounts.other += 1;
}

const fail = [];
const check = (label, count, maxPct) => {
  const p = (100 * count) / n;
  if (p > maxPct) fail.push(`${label}: ${pct(count)} > ${maxPct}%`);
};

check('Кому', komu, 50);
check('Рядом', ryadom, 50);
check('метро', metro, 50);
check('лучше', luchshe, 50);
check('не+глагол', neVerb, 30);
check('не X (heuristic)', neX, 30);
for (const [k, c] of Object.entries(openCounts)) {
  if ((100 * c) / n > 30) fail.push(`открытие «${k}»: ${pct(c)} > 30%`);
}

const len2 = (100 * lenCounts[2]) / n;
const len4 = (100 * lenCounts[4]) / n;
// soft warn only for length skew
const warns = [];
if (len2 < 10 || len2 > 35) warns.push(`длина-2: ${pct(lenCounts[2])} (цель ~20%)`);
if (len4 < 10 || len4 > 35) warns.push(`длина-4: ${pct(lenCounts[4])} (цель ~20%)`);

console.log(`texts: ${n}`);
console.log(`Кому ${pct(komu)} | Рядом ${pct(ryadom)} | метро ${pct(metro)} | лучше ${pct(luchshe)}`);
console.log(`не+глагол ${pct(neVerb)} | не X ~ ${pct(neX)}`);
console.log('открытия:', openCounts);
console.log(
  'длина абз.:',
  lenCounts,
  `→ ${pct(lenCounts[2])} / ${pct(lenCounts[3])} / ${pct(lenCounts[4])}`,
);
if (warns.length) console.log('WARN:\n- ' + warns.join('\n- '));
console.log(fail.length ? `FAIL:\n- ${fail.join('\n- ')}` : 'PASS');
process.exit(fail.length ? 1 : 0);
