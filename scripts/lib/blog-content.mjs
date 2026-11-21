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

const BROAD_CITY_SLUGS = new Set(['multi', 'regions', 'region', 'russia', 'all']);
const CITY_NAME_RE =
  /москв|петербург|екатеринбург|нижн|уфа|казан|перм|сочи|челябинск|ярославл|ростов|новосибир|краснояр|самар|калининград/i;
const CITY_SLUG_PREFIX_RE = /^(moskva-|moscow-|spb-|sankt-|saint-petersburg|kazan-|ekb-|perm-|sochi-|ufa-)/i;

export function parseBlogCitySlugsField(meta) {
  const raw = meta?.citySlugs || meta?.cities || '';
  return String(raw)
    .split(/[,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part && !BROAD_CITY_SLUGS.has(part));
}

/**
 * Канон городов блога: конкретные city slug, не «Регионы», если в тексте/мета есть города.
 * Возвращает список ошибок (пустой = ок).
 */
export function validateBlogCityCanon(article) {
  const slug = String(article?.slug || '');
  const meta = article?.meta || {};
  const status = String(meta.status || '').toUpperCase();
  if (status && status !== 'PUBLISHED') return [];

  const citySlug = String(meta.citySlug || '')
    .trim()
    .toLowerCase();
  const cityLabel = String(meta.city || '').trim();
  const tagged = parseBlogCitySlugsField(meta);
  const errors = [];

  if (tagged.length && (citySlug === 'regions' || citySlug === 'region' || citySlug === 'russia')) {
    errors.push(`${slug}: citySlugs=${tagged.join(',')} нельзя сочетать с citySlug=${citySlug}`);
  }
  if (
    (citySlug === 'regions' || citySlug === 'region') &&
    CITY_NAME_RE.test(cityLabel)
  ) {
    errors.push(`${slug}: city="${cityLabel}" указывает на города, не вешай citySlug=regions`);
  }
  if (CITY_SLUG_PREFIX_RE.test(slug) && (citySlug === 'regions' || citySlug === 'region')) {
    errors.push(`${slug}: городской slug не должен иметь citySlug=regions`);
  }
  return errors;
}

/**
 * UI колонок сам рендерит подпись и бейдж «От автора».
 * Убираем дубли из markdown body перед upsert / static sync.
 */
export function stripColumnBodyChrome(body) {
  let text = String(body || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  // Лид: *Авторская колонка …*
  text = text.replace(/^\*[^*\n]*Авторская колонка[^*\n]*\*\s*/u, '');
  // Хвост: *Имя, штатный корреспондент Дайбилет*
  text = text.replace(/\n?\s*\*[^*\n]*,\s*штатный корреспондент Дайбилет\*\s*$/u, '');
  return text.trim();
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
      return { filePath, slug, meta, body: stripColumnBodyChrome(body) };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
