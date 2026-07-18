/**
 * Парсинг markdown-статей блога (content/blog/*.md) с YAML frontmatter.
 */
import fs from 'node:fs';
import path from 'node:path';

export function parseFrontmatter(raw) {
  const text = String(raw || '').replace(/^\uFEFF/, '');
  if (!text.startsWith('---')) {
    return { meta: {}, body: text.trim() };
  }
  const end = text.indexOf('\n---', 3);
  if (end < 0) return { meta: {}, body: text.trim() };
  const fm = text.slice(3, end).trim();
  const body = text.slice(end + 4).replace(/^\s+/, '');
  const meta = {};
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[m[1]] = value;
  }
  return { meta, body: body.trim() };
}

export function loadBlogMarkdownDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const filePath = path.join(dir, name);
      const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
      const { meta, body } = parseFrontmatter(raw);
      const slug = meta.slug || name.replace(/\.md$/i, '');
      return { filePath, slug, meta, body };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
