import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'data/ticketscloud/editorial');
for (let batch = 1; batch <= 5; batch += 1) {
  const file = path.join(dir, `newyear-eventpage-batch-${String(batch).padStart(2, '0')}-rewrites-2026-11-24.md`);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const headings = [...text.matchAll(/^## (\d+)\..*$/gmu)];
  if (!headings.length) continue;
  const preamble = text.slice(0, headings[0].index).trimEnd();
  const sections = headings.map((heading, index) => ({ sequence: Number(heading[1]),
    text: text.slice(heading.index, headings[index + 1]?.index ?? text.length).trim() }));
  sections.sort((a, b) => a.sequence - b.sequence);
  fs.writeFileSync(file, `${preamble}\n\n${sections.map((section) => section.text).join('\n\n')}\n`);
}
