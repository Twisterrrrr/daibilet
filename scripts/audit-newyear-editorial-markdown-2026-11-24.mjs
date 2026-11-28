import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'data/ticketscloud/editorial');
const selection = JSON.parse(fs.readFileSync(path.join(dir, 'newyear-eventpage-selection-150-2026-11-24.json'), 'utf8'));
function originalMainChars(value) {
  const text = String(value || '')
    .replace(/<script[\s\S]*?<\/script>/giu, ' ')
    .replace(/<style[\s\S]*?<\/style>/giu, ' ')
    .replace(/<br\s*\/?\s*>/giu, '\n')
    .replace(/<\/(?:p|div|li|h[1-6])\s*>/giu, '\n')
    .replace(/<[^>]*>/gu, ' ')
    .replace(/&nbsp;|&#160;/giu, ' ')
    .replace(/&amp;/giu, '&').replace(/&lt;/giu, '<').replace(/&gt;/giu, '>')
    .replace(/&quot;/giu, '"').replace(/&#39;|&apos;/giu, "'");
  const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const practicalHeading = lines.findIndex((line) => /^#{0,6}\s*(?:практическая информация|практические сведения|перед посещением)\b/iu.test(line));
  if (practicalHeading >= 0) lines.length = practicalHeading;
  else {
    const practicalLine = /^(?:[-*•]\s*)?(?:адрес|площадка|место|возрастное ограничение|возраст|тайминг|начало|сбор гостей|дата и время|дата|продолжительность|билеты|стоимость|телефон|контакт(?:ы)?|важно)\s*[:—-]/iu;
    while (lines.length && practicalLine.test(lines[lines.length - 1])) lines.pop();
  }
  return lines.join(' ').replace(/[#*_`>\[\]()]/gu, '').replace(/\s+/gu, ' ').trim().length;
}
const report = [];
for (const batch of selection.batches) {
  const file = path.join(dir, `newyear-eventpage-batch-${String(batch[0].batch).padStart(2, '0')}-rewrites-2026-11-24.md`);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const chunks = [...text.matchAll(/^## (\d+)\..*$/gmu)];
  const bySequence = new Map();
  for (let i = 0; i < chunks.length; i += 1) {
    const start = chunks[i].index;
    const end = chunks[i + 1]?.index ?? text.length;
    bySequence.set(Number(chunks[i][1]), text.slice(start, end));
  }
  for (const item of batch) {
    const chunk = bySequence.get(item.sequence);
    if (!chunk) {
      report.push({ batch: item.batch, sequence: item.sequence, slug: item.slug, status: 'MISSING' });
      continue;
    }
    const main = chunk.match(/### О событии\s*([\s\S]*?)\s*### Практическая информация/u)?.[1] ?? '';
    if (chunk.includes('Требует проверки') || chunk.includes('Требует объединения')) {
    report.push({ batch: item.batch, sequence: item.sequence, slug: item.slug, sourceChars: item.sourceChars,
      sourceMainChars: originalMainChars(item.description),
        rewriteChars: 0, paragraphs: 0, status: 'REVIEW_REQUIRED' });
      continue;
    }
    const plain = main.replace(/[#*_`>\[\]()]/gu, '').trim();
    const paragraphs = plain.split(/\n\s*\n/u).filter((part) => part.replace(/\s/gu, '').length > 40).length;
    const sourceMainChars = originalMainChars(item.description);
    report.push({ batch: item.batch, sequence: item.sequence, slug: item.slug, sourceChars: item.sourceChars, sourceMainChars,
      rewriteChars: plain.length, paragraphs,
      status: plain.length >= sourceMainChars && paragraphs >= 2 ? 'PASS' : 'FAIL' });
  }
}
const out = path.join(dir, 'newyear-eventpage-editorial-audit-2026-11-24.json');
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(JSON.stringify({ audited: report.length, pass: report.filter((x) => x.status === 'PASS').length,
  fail: report.filter((x) => x.status === 'FAIL').length, reviewRequired: report.filter((x) => x.status === 'REVIEW_REQUIRED').length,
  missing: report.filter((x) => x.status === 'MISSING').length,
  failures: report.filter((x) => x.status !== 'PASS') }, null, 2));
