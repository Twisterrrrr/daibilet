#!/usr/bin/env node
/**
 * Owner task 2026-10-11 (round 2): upgrade every PUBLIC card description to the
 * unified canon - cleaned lead + "## Практическая информация" fact block (plus
 * a selling line), keeping provider sections intact.
 *
 * Also fixes, across the whole public selection:
 *  - templated city case forms ("мероприятие в Смоленск" -> "в Смоленске");
 *  - stale dates in copy (past month/day of the current year -> next session);
 *  - stub phrases ("Детальное описание маршрута в исходных данных не указано");
 *  - long dashes and doubled punctuation.
 *
 * Usage:
 *   node scripts/upgrade-public-event-descriptions.js [--input f.json] [--out dir] [--limit N] [--apply]
 *   Default is dry-run. Data comes from scripts/tmp-classify-public.mjs output.
 *   Always runs against the PROD database (127.0.0.1:5433 / daibilet via tunnel).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromDb = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDb('pg');

function loadRootEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadRootEnv();
{
  const u = new URL(process.env.DATABASE_URL);
  u.port = '5433';
  u.pathname = '/daibilet';
  process.env.DATABASE_URL = u.toString();
}

const apply = process.argv.includes('--apply');
const argValue = (name) => {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
};
const input = argValue('--input') || path.join(rootDir, 'tmp-event-desc-backup', 'public-cards-full.json');
const outDir = argValue('--out') || path.join(rootDir, 'tmp-event-desc-backup', 'upgrade-public');
const limit = Number(argValue('--limit') || 0) || 0;

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const TODAY = Date.UTC(2026, 9, 11); // audit date: 2026-10-11
const SELL_LINE = 'Билеты продаются онлайн. Оплата на сайте, электронный билет приходит на почту.';
const DROP_SECTION_RE = /^##\s*(?:Практическая информация|Где и когда|Когда и где)(?=\s|$)/iu;
const STUB_PHRASES = [
  /\s*Детальное описание маршрута в исходных данных не указано\./giu,
  /\s*В источнике не указаны[^.]*\./giu,
  /\s*Описание отсутствует\./giu,
  /\s*Информация уточняется\./giu,
];

/** True when the text still carries a stub / placeholder phrase. */
export function hasStubPhrase(text) {
  return STUB_PHRASES.some((re) => {
    re.lastIndex = 0;
    return re.test(String(text || ''));
  });
}

export function cleanText(value) {
  let s = String(value || '');
  s = s.replace(/<\/?[a-zA-Z][^>]*>/gu, ' ');
  // repair the earlier broken declension "Кирове (Кировскае область)е"
  s = s.replace(/\(([А-ЯЁ][а-яё-]+)ае (область|обл\.|край|республика|АО)\)е/gu, '($1ая $2)');
  for (const re of STUB_PHRASES) s = s.replace(re, ' ');
  s = s.replace(/[\u2013\u2014\u2212]/gu, '-');
  s = s
    .replace(/[ \t]+/gu, ' ')
    .replace(/[ \t]+([.,!?;:])/gu, '$1')
    .replace(/\.{2,}/gu, '.')
    .replace(/!{2,}/gu, '!')
    .replace(/\?{2,}/gu, '?')
    .replace(/\n{3,}/gu, '\n\n')
    .replace(/ +\n/gu, '\n');
  return s.trim();
}

/** Split raw copy into lead paragraphs and "## Heading" sections. */
export function splitSections(raw) {
  const parts = String(raw || '').split(/(?=##\s)/u);
  const lead = (parts.shift() || '').trim();
  const sections = parts.map((p) => p.trim()).filter(Boolean);
  return { lead, sections };
}

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "мероприятие в Смоленск" -> "мероприятие в Смоленске" (only the card city). */
export function fixCityCase(text, setCase) {
  const city = String(setCase.city || '').trim();
  if (!city) return text;
  const re = new RegExp(`(?<![\\p{L}])в ${escapeRe(city)}(?![\\p{L}-])`, 'gu');
  return String(text).replace(re, setCase.cityInPhrase(city));
}

const TEMPLATED_CITY_RE = /(мероприятие|концерт|спектакль|выставка|экскурсия|мастер-класс|прогулка|шоу|фестиваль|стендап|лекция|квиз|турнир|вечеринка|игра|балет|опера|мюзикл) в ([А-ЯЁ][а-яёё-]+(?: [А-ЯЁ][а-яёё-]+)?)(?=,|\s+на\s)/gu;
const ALREADY_INFLECTED_RE = /(?:е|и|ой|ах|ях|у|ю|ом|ем|ых|их|ье|ее|ово|ево|ино|о)$/u;

/** Declension hook, set from the web lib in main(). */
let cityPrepositionalRef = (city) => city;

/**
 * Fix templated city forms even when the copy city differs from the catalogue
 * city ("Сова - мероприятие в Смоленск, на площадке «1865»").
 */
export function fixTemplatedCase(text) {
  return String(text).replace(TEMPLATED_CITY_RE, (full, kind, city) => {
    if (ALREADY_INFLECTED_RE.test(city)) return full;
    const declined = cityPrepositionalRef(city);
    if (!declined || declined === city) return full;
    return `${kind} в ${declined}`;
  });
}

/** Replace past dates of the current year with the next session date. */
export function actualizeDates(text, card) {
  if (!card.next_session) return text;
  const next = new Date(card.next_session);
  if (Number.isNaN(next.getTime())) return text;
  const nDay = next.getUTCDate();
  const nMonth = MONTHS[next.getUTCMonth()];
  const nYear = next.getUTCFullYear();
  const re = new RegExp(`(\\d{1,2})\\s(${MONTHS.join('|')})(\\s+\\d{4}(\\s+года)?)?`, 'giu');
  return String(text).replace(re, (full, dayStr, monthStr, yearPart, godaPart, offset, whole) => {
    const monthIndex = MONTHS.indexOf(String(monthStr).toLowerCase());
    if (monthIndex < 0) return full;
    const yearMatch = yearPart ? /(\d{4})/u.exec(yearPart) : null;
    const year = yearMatch ? Number(yearMatch[1]) : nYear;
    if (year < 2026) return full; // historical mention (founded in 1903 etc.)
    const when = Date.UTC(year, monthIndex, Number(dayStr));
    if (when >= TODAY) return full;
    const before = whole.slice(Math.max(0, offset - 32), offset);
    const after = whole.slice(offset + full.length, offset + full.length + 8);
    if (isProtectedDate(before, after)) return full; // address or "с … по …" range
    if (yearMatch) return `${nDay} ${nMonth} ${nYear}${godaPart ? ' года' : ''}`;
    return `${nDay} ${nMonth}`;
  });
}

const ADDRESS_BEFORE_RE = /(?:улица|ул\.|площадь|пл\.|проспект|пр-т|переулок|бульвар|набережная|шоссе|проезд|аллея|дом|д\.)\s*$/iu;

/**
 * True when the matched date is part of a protected context: an address
 * ("улица 8 Марта"), or a range ("с 5 по 11 октября", "с 31 декабря на 1 января").
 */
export function isProtectedDate(before, after) {
  if (/[сС]\s*$/u.test(before) && /^\s*(?:по|на|до)\s/u.test(after)) return true;
  if (/(?:^|\s)[сС]\s+\d{1,2}\s+[а-яё]+\s+(?:на|по|до)\s*$/u.test(before)) return true; // "с 31 декабря на 1 января"
  if (ADDRESS_BEFORE_RE.test(before)) return true;
  return false;
}

export function hasPastDate(text, card) {
  const re = new RegExp(`(\\d{1,2})\\s(${MONTHS.join('|')})(\\s+\\d{4})?`, 'giu');
  let m;
  while ((m = re.exec(String(text)))) {
    const monthIndex = MONTHS.indexOf(String(m[2]).toLowerCase());
    if (monthIndex < 0) continue;
    const year = m[3] ? Number(/(\d{4})/u.exec(m[3])[1]) : card.next_session ? new Date(card.next_session).getUTCFullYear() : 2026;
    if (year < 2026) continue;
    if (Date.UTC(year, monthIndex, Number(m[1])) >= TODAY) continue;
    const before = String(text).slice(Math.max(0, m.index - 32), m.index);
    const after = String(text).slice(m.index + m[0].length, m.index + m[0].length + 8);
    if (isProtectedDate(before, after)) continue;
    return true;
  }
  return false;
}

function writeFileSafe(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

async function main() {
  const lib = await import('../apps/web/src/lib/event-minimal-description.ts');
  const { buildPracticalInfoBlock, buildMinimalEventDescription, cityInPhrase, cityPrepositional } = lib;
  cityPrepositionalRef = cityPrepositional;

  if (!fs.existsSync(input)) throw new Error(`Missing input ${input}`);
  const data = JSON.parse(fs.readFileSync(input, 'utf8'));
  const cards = limit > 0 ? data.slice(0, limit) : data;

  const plan = [];
  const quality = { hasHtml: 0, longDash: 0, stub: 0, pastDate: 0, singleParagraph: 0, tooShort: 0, brokenParenthetical: 0 };
  const marks = {
    cityFixed: 0,
    datesFixed: 0,
    stubsRemoved: 0,
    factBlockAdded: 0,
    factBlockRebuilt: 0,
    legacyBlocksDropped: 0,
    sellAdded: 0,
    leadRebuilt: 0,
  };
  const samples = [];
  const textIndex = new Map();
  const htmlCards = [];
  const pastDateCards = [];

  cards.forEach((d, index) => {
    const cardInput = {
      title: d.title,
      city: d.city,
      venue: d.venue,
      venueAddress: d.venue_address,
      category: d.category,
      subcategory: d.subcategory,
      kind: d.kind,
      nextSession: d.next_session,
      futureSessions: d.future_sessions,
      durationMin: d.duration_min,
      priceFromRub: d.price,
      ageLimit: d.age,
    };
    const caseCtx = { city: d.city, cityInPhrase };

    const { lead, sections } = splitSections(d.raw || '');
    const leadClean = cleanText(lead);
    if (leadClean !== String(lead || '').trim()) marks.stubsRemoved += 1;

    const leadDated = actualizeDates(leadClean, d);
    if (leadDated !== leadClean) marks.datesFixed += 1;
    let leadText = fixTemplatedCase(fixCityCase(leadDated, caseCtx));
    if (leadText !== leadDated) marks.cityFixed += 1;

    if (leadText.replace(/##[\s\S]*$/u, '').trim().length < 40) {
      leadText = String(buildMinimalEventDescription(cardInput, index)).split('\n\n')[0];
      marks.leadRebuilt += 1;
    }

    const kept = [];
    for (const section of sections) {
      if (DROP_SECTION_RE.test(section)) {
        marks.legacyBlocksDropped += 1;
        continue;
      }
      let sectionClean = cleanText(section);
      const sectionDated = actualizeDates(sectionClean, d);
      if (sectionDated !== sectionClean) marks.datesFixed += 1;
      sectionClean = fixTemplatedCase(fixCityCase(sectionDated, caseCtx));
      kept.push(sectionClean);
    }

    const factBlock = buildPracticalInfoBlock(cardInput);
    const parts = [leadText];
    if (kept.length) parts.push(kept.join('\n\n'));
    if (factBlock) parts.push(factBlock);
    let text = cleanText(parts.join('\n\n'));
    if (!/Билеты продаются онлайн|Билеты на выбранную дату/iu.test(text)) {
      text = `${text}\n\n${SELL_LINE}`;
      marks.sellAdded += 1;
    }
    text = cleanText(text);
    if (factBlock && !/Практическая информация/iu.test(d.raw || '')) marks.factBlockAdded += 1;
    if (factBlock && /##\s*(?:Практическая информация|Где и когда|Когда и где)/iu.test(d.raw || '')) marks.factBlockRebuilt += 1;

    if (/<[a-z][\s\S]*>/iu.test(text)) {
      quality.hasHtml += 1;
      if (htmlCards.length < 10) htmlCards.push(`${d.slug}\n    ${text.replace(/\s+/gu, ' ').slice(0, 260)}`);
    }
    if (/[\u2013\u2014\u2212]/u.test(text)) quality.longDash += 1;
    if (hasStubPhrase(text)) quality.stub += 1;
    if (hasPastDate(text, d)) {
      quality.pastDate += 1;
      if (pastDateCards.length < 12) {
        pastDateCards.push(`${d.slug} (next=${d.next_session ? String(d.next_session).slice(0, 10) : 'none'})\nFULL:\n${text}`);
      }
    }
    if (text.split(/\n{2,}/u).filter((p) => p.trim() && !p.trim().startsWith('- ')).length < 2) quality.singleParagraph += 1;
    if (text.length < 120) quality.tooShort += 1;
    if (/ае (?:область|край|республика|АО)\)е/u.test(text)) quality.brokenParenthetical += 1;

    textIndex.set(text, (textIndex.get(text) || 0) + 1);

    if (text !== String(d.raw || '').replace(/\r\n/gu, '\n').trim()) {
      plan.push({ id: d.id, slug: d.slug, text });
      if (samples.length < 12) {
        samples.push(
          `\n\n===== ${d.slug} (${String(d.eff || '').length} -> ${text.length}) =====\n--- BEFORE ---\n${String(d.eff || '').slice(0, 300)}\n--- AFTER ---\n${text.slice(0, 520)}`,
        );
      }
    }
  });

  const duplicates = [...textIndex.values()].filter((n) => n > 1).reduce((sum, n) => sum + n, 0);
  const report = {
    mode: apply ? 'apply' : 'dry-run',
    input,
    cards: cards.length,
    changed: plan.length,
    unchanged: cards.length - plan.length,
    uniqueTexts: textIndex.size,
    duplicateCards: duplicates,
    marks,
    quality,
  };

  writeFileSafe(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSafe(path.join(outDir, 'samples.txt'), samples.join('\n'));
  writeFileSafe(
    path.join(outDir, 'diagnostics.txt'),
    [`hasHtml cards (${quality.hasHtml}):`, ...htmlCards, '', `past-date cards (${quality.pastDate}):`, ...pastDateCards].join('\n'),
  );
  console.log(JSON.stringify(report, null, 2));

  if (!apply) {
    console.log('Dry-run only. Re-run with --apply.');
    return;
  }
  if (
    quality.hasHtml ||
    quality.longDash ||
    quality.stub ||
    quality.pastDate ||
    quality.singleParagraph ||
    quality.tooShort ||
    quality.brokenParenthetical ||
    duplicates
  ) {
    throw new Error('Quality gate failed, refusing to apply');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, application_name: 'upgrade_public' });
  const client = await pool.connect();
  let updated = 0;
  const batch = 200;
  try {
    const res = await client.query(
      'select e.id, o.description as prev from "Event" e left join "EventOverride" o on o."eventId" = e.id where e.id = any($1::text[])',
      [plan.map((p) => p.id)],
    );
    const prevById = new Map(res.rows.map((r) => [r.id, r.prev]));
    writeFileSafe(
      path.join(outDir, `backup-${Date.now()}.json`),
      JSON.stringify(plan.map((p) => ({ id: p.id, prevOverride: prevById.get(p.id) ?? null }))),
    );
    await client.query('begin');
    for (const item of plan) {
      const overrideId = `eov_${crypto.randomBytes(12).toString('hex')}`;
      await client.query(
        `insert into "EventOverride" (id, "eventId", description, "createdAt", "updatedAt")
         values ($1, $2, $3, now(), now())
         on conflict ("eventId") do update
           set description = excluded.description,
               "updatedAt" = now()`,
        [overrideId, item.id, item.text],
      );
      updated += 1;
      if (updated % batch === 0) {
        await client.query('commit');
        await client.query('begin');
        console.log(`applied ${updated}/${plan.length}`);
      }
    }
    await client.query('commit');
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
  console.log(JSON.stringify({ updated, outDir }, null, 2));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
