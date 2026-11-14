#!/usr/bin/env node
/**
 * Repair production blog sections that contain confirmed 404 event links.
 * Uses the checked-in Markdown as canonical copy, but replaces only affected
 * sections. Three expired articles are hidden and redirected by the web app.
 *
 * Usage: node scripts/repair-blog-link-404s.mjs [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from '../packages/db/node_modules/pg/lib/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { Pool } = pg;
dotenv.config({ path: path.join(root, '.env'), quiet: true });
const apply = process.argv.includes('--apply');
const contentDir = path.join(root, 'content', 'blog');

const hidden = new Map([
  ['fentezi-fest-bylinnyy-bereg', 'Сезонный фестиваль завершился, подходящего актуального события нет.'],
  ['moskva-rechnye-progulki-zaryade', 'Старые маршруты Зарядья сняты; ссылка ведёт на актуальный гид по речным прогулкам Москвы.'],
  ['sochi-noch-bez-glyanca-rok-stendap-dzhaz', 'Привязанные события завершились, актуальной подборки для замены нет.'],
]);

// Production heading -> canonical Markdown heading. These are limited to
// sections that contained a confirmed broken internal event/article link.
const sectionMaps = {
  'afisha-regionalnye-goroda': {
    '## Екатеринбург: стендап и спектакль без привычной сцены': '## Екатеринбург: стендап и спектакль без привычной сцены',
    '## Нижний Новгород: импровизация и стендап': '## Нижний Новгород: импровизация и стендап',
  },
  'chto-poslushat-jazz': {
    '## Семейный концерт: джаз без ночного клуба': '## Семейный концерт: джаз без ночного клуба',
  },
  'kak-perestat-gulyat-po-krugu-moskva': {
    '## 1. Разобрать киноязык Дэвида Линча на лекции': '## 1. Сравнить живопись Климта и Шиле на лекции',
    '## 2. Запереться в мастерской и обжечь металл при 800 градусах': '## 2. Создать картину в технике горячей эмали',
    '## 4. Вернуться в музыкальную эпоху 2008-го': '## 4. Потанцевать под русские хиты 80-х и 90-х',
    '## 5. Устроить детективную слежку за хищниками в зоопарке': '## 5. Устроить детективную слежку за хищниками в зоопарке',
  },
  'kak-vybrat-koncert': {
    '## Амфитеатр, бельэтаж и балкон': '## Амфитеатр, бельэтаж и балкон',
    '## Как место связано с жанром': '## Как место связано с жанром',
  },
  'kaliningrad-vecher-organ-stendap-dzhaz': {
    '## Сценарий 2. Камерный шик: Театр Николая Захарова': '## Сценарий 2. Камерный шик: Театр Николая Захарова',
    '## Сценарий 3. Современный юмор: стендап-клуб «Локация»': '## Сценарий 3. Современный юмор: стендап-клуб «Локация»',
  },
  'kuda-poyti-s-detmi': {
    '## Младшие школьники: игра плюс новые знания': '## Младшие школьники: игра плюс новые знания',
    '## Подростки: самостоятельность важнее слова «детский»': '## Подростки: самостоятельность важнее слова «детский»',
  },
  'moskva-immersivnye-vystavki': {
    '## Иммерсивный спектакль с участием зрителей': '## Иммерсивный спектакль с участием зрителей',
  },
  'moskva-kvesty-escape-room': {
    '## 1. Музейный детектив (Для интеллектуалов и неспешных свиданий)': '## Музейный квест без гида',
    '## 2. Городской Outdoor-квест (Для активных компаний и прогулок)': '## Городской или outdoor-квест',
  },
  'moskva-master-klass-emal': {
    '## Комплект украшений: полноценный творческий проект': '## Комплект украшений: уточните, доступен ли этот формат',
  },
  'moskva-vechernie-diskoteki-shou': {
    '## Речная дискотека: музыка плюс Москва с воды': '## Речная дискотека: музыка плюс Москва с воды',
    '## Ужин, музыка и немного танцев': '## Прогулка с ужином - не обязательно дискотека',
  },
  'muzyka-v-osobnyakah-spb': {
    '## Дом Шрёдера: рояль возвращается домой': '## Дом Шрёдера: рояль возвращается домой',
  },
  'myuzikly-teatr-novichok-msk-spb': {
    '## Балет: сюжет можно не знать заранее': '## Балет: сюжет можно не знать заранее',
  },
  'spb-dvory-paradnye-kommunalki': {
    '## Групповые маршруты: доступный вход в тему': '## Групповые маршруты: доступный вход в тему',
  },
  'spb-planetarium-gid': {
    '## Орган под куполом: музыка важнее сюжета': '## Выберите программу под возраст и интерес',
  },
  'spb-razvod-mostov-kakoi-reis': {
    '## Пять мостов: длинный маршрут по большой Неве': '## Пять мостов: длинный маршрут по большой Неве',
    '## Какой рейс выбрать': '## Какой рейс выбрать',
  },
  'spb-rooftop-guide': {
    '## Что на самом деле означает «концерт на крыше»': '## Что на самом деле означает «концерт на крыше»',
    '## Развод мостов: выбор не только по количеству': '## Развод мостов: выбор не только по количеству',
  },
  'spb-stendap-gid': {
    '## Открытый микрофон и проверка материала': '## Открытый микрофон и проверка материала',
    '## Сборные PRO-шоу: безопасный первый выбор': '## Сборные PRO-шоу: безопасный первый выбор',
    '## Импровизация, ночной и жёсткий стендап': '## Импровизация и взрослый стендап',
  },
};
const paragraphMaps = {
  'perm-neobychnye-muzei': {
    oldNeedle: '/blog/perm-gorod-i-prigorody',
    newNeedle: '/blog/perm-za-2-dnya',
  },
};

function readBody(slug) {
  const raw = fs.readFileSync(path.join(contentDir, `${slug}.md`), 'utf8');
  return raw.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/u, '').trim();
}

function findSection(body, heading) {
  const lines = body.split('\n');
  const start = lines.indexOf(heading);
  if (start < 0) throw new Error(`Markdown heading not found: ${heading}`);
  const level = heading.match(/^#+/u)[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const next = lines[i].match(/^(#+)\s/u);
    if (next && next[1].length <= level) { end = i; break; }
  }
  return lines.slice(start, end).join('\n').trim();
}

function replaceSection(body, oldHeading, replacement) {
  const lines = body.split('\n');
  const start = lines.indexOf(oldHeading);
  if (start < 0) {
    if (body.includes(replacement)) return body;
    throw new Error(`Production heading not found: ${oldHeading}`);
  }
  const level = oldHeading.match(/^#+/u)[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const next = lines[i].match(/^(#+)\s/u);
    if (next && next[1].length <= level) { end = i; break; }
  }
  return [...lines.slice(0, start), replacement, ...lines.slice(end)].join('\n').trim();
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error('DATABASE_URL is missing in .env');
const dbUrl = new URL(rawUrl);
if (!['127.0.0.1', 'localhost'].includes(dbUrl.hostname) || !['5433', '5437'].includes(dbUrl.port)) {
  throw new Error('Refusing to proceed: source DATABASE_URL must be a local loopback URL on port 5433 or 5437');
}
dbUrl.port = '5433';
dbUrl.pathname = '/daibilet';
if (dbUrl.port !== '5433' || dbUrl.pathname !== '/daibilet') {
  throw new Error('Refusing to proceed: expected production tunnel 127.0.0.1:5433/daibilet');
}
dbUrl.hostname = '127.0.0.1';
const pool = new Pool({ connectionString: dbUrl.toString(), max: 1, application_name: 'blog_404_repair_2026_11_14' });

try {
  const slugs = [...new Set([...Object.keys(sectionMaps), ...Object.keys(paragraphMaps), ...hidden.keys()])];
  const { rows } = await pool.query(
    `select slug, status::text as status, "isIndexable", title, content from "Article" where slug = any($1::text[]) order by slug`,
    [slugs],
  );
  if (rows.length !== slugs.length) throw new Error(`Expected ${slugs.length} production articles, found ${rows.length}`);
  const before = new Map(rows.map((row) => [row.slug, row]));
  const updates = [];

  for (const [slug, headingMap] of Object.entries(sectionMaps)) {
    const row = before.get(slug);
    if (row.status !== 'PUBLISHED' || row.isIndexable !== true) throw new Error(`${slug}: expected published/indexable; found ${row.status}/${row.isIndexable}`);
    let next = row.content;
    const md = readBody(slug);
    for (const [oldHeading, newHeading] of Object.entries(headingMap)) {
      const replacement = findSection(md, newHeading);
      next = replaceSection(next, oldHeading, replacement);
    }
    updates.push({ slug, status: row.status, oldChars: row.content.length, newChars: next.length, next });
  }

  for (const [slug, needles] of Object.entries(paragraphMaps)) {
    const row = before.get(slug);
    if (row.status !== 'PUBLISHED' || row.isIndexable !== true) throw new Error(`${slug}: expected published/indexable; found ${row.status}/${row.isIndexable}`);
    const current = row.content.split(/\n\s*\n/u).find((part) => part.includes(needles.oldNeedle));
    const replacement = readBody(slug).split(/\n\s*\n/u).find((part) => part.includes(needles.newNeedle));
    if (!replacement) throw new Error(`${slug}: source paragraph anchor missing`);
    let next = row.content;
    if (current) {
      const count = row.content.split(needles.oldNeedle).length - 1;
      if (count !== 1) throw new Error(`${slug}: expected one old paragraph anchor, found ${count}`);
      next = row.content.replace(current, replacement);
    } else if (!row.content.includes(needles.newNeedle)) {
      throw new Error(`${slug}: neither old nor repaired paragraph anchor found`);
    }
    updates.push({ slug, status: row.status, oldChars: row.content.length, newChars: next.length, next });
  }

  for (const [slug, reason] of hidden) {
    const row = before.get(slug);
    if (!['PUBLISHED', 'HIDDEN'].includes(row.status)) throw new Error(`${slug}: expected PUBLISHED or HIDDEN, found ${row.status}`);
    updates.push({ slug, status: 'HIDDEN', reason, oldChars: row.content.length, newChars: row.content.length });
  }

  console.log(`target ${dbUrl.hostname}:${dbUrl.port}${dbUrl.pathname}; mode=${apply ? 'APPLY' : 'DRY RUN'}`);
  for (const update of updates) console.log(`${update.slug}: ${update.status} -> ${update.status === 'HIDDEN' ? 'HIDDEN/noindex' : 'section repair'}; chars ${update.oldChars} -> ${update.newChars}${update.next === before.get(update.slug).content ? ' (already applied)' : ''}`);

  if (!apply) {
    console.log(`Dry run complete: ${updates.length} articles prepared.`);
  } else {
    const backupDir = path.resolve(root, '..', '_scratch', '2026-11-14');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, 'blog-link-repair-before-apply.json');
    if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
    console.log(`Saved production rollback snapshot: ${backupPath}`);
    await pool.query('begin');
    try {
      for (const update of updates) {
        if (update.status === 'HIDDEN') {
          if (before.get(update.slug).status !== 'HIDDEN' || before.get(update.slug).isIndexable !== false) {
            await pool.query(`update "Article" set status='HIDDEN'::"ArticleStatus", "isIndexable"=false, "updatedAt"=now() where slug=$1`, [update.slug]);
          }
        } else {
          if (update.next === before.get(update.slug).content) continue;
          const result = await pool.query(`update "Article" set content=$2, "updatedAt"=now() where slug=$1 and status='PUBLISHED'::"ArticleStatus" and "isIndexable"=true`, [update.slug, update.next]);
          if (result.rowCount !== 1) throw new Error(`${update.slug}: production row changed during apply`);
        }
      }
      await pool.query('commit');
      console.log(`Applied ${updates.length} production article updates transactionally.`);
    } catch (error) {
      await pool.query('rollback');
      throw error;
    }
  }
} finally {
  await pool.end();
}
