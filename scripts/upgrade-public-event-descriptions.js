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
const diffSlug = argValue('--diff');

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

/** Split raw copy into lead paragraphs and "## Heading" sections (headings start a line). */
export function splitSections(raw) {
  const parts = String(raw || '').split(/(?=\n##\s)/u);
  const lead = (parts.shift() || '').trim();
  const sections = parts.map((p) => p.replace(/^\n+/u, '').trim()).filter(Boolean);
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
 * Remove date/time phrases that duplicate the Prak block: "Ближайший сеанс -
 * 20 октября 2026, 17:00.", "Когда: 18 октября 2026, 16:00." etc.
 */
export function stripDatePhrases(text) {
  let s = String(text || '');
  s = s.replace(/^\s*(?:Когда(?: и где)?|Дата|Время)\s*:?\s*[^.!?]*[.!?]\s*/iu, '');
  s = s.replace(
    /\s*(?:[:;,—-]\s*)?(?:Ближайшая дата|Ближайший сеанс|Ближайшие даты|Следующий сеанс|Ближайшее время)\s*[-:]?\s*[^.!?]*[.!?]?/giu,
    '.',
  );
  s = s.replace(/[ \t]{2,}/gu, ' ').replace(/\s*[,;:]+\s*\./gu, '.').replace(/\.{2,}/gu, '.').replace(/^[\s,;:.-]+/u, '').trim();
  s = s.replace(/[\s,;:—-]+$/u, '');
  if (s && !/[.!?…»)]$/u.test(s)) s = `${s}.`;
  return s;
}

/** Remove fact phrases already covered by the Prak block (age/price/date/place/address). */
export function dedupeFacts(text, card) {
  let s = String(text || '');
  const age = String(card.age || '').trim();
  if (age && age !== '0') {
    s = s.replace(new RegExp(`\\s*(?:Возрастное ограничение|Рекомендованный возраст|Возраст)\\s*:?\\s*${escapeRe(age)}\\+?\\.?`, 'giu'), ' ');
  }
  const price = Number(card.price || 0);
  if (price >= 100) {
    const forms = [...new Set([String(price), price.toLocaleString('ru-RU'), price.toLocaleString('ru-RU').replace(/\u00A0/gu, ' ')])];
    for (const form of forms) {
      s = s.replace(
        new RegExp(`\\s*(?:Билеты|Стоимость(?: билета)?|Цена)\\s*[-:]?\\s*(?:от\\s*)?${escapeRe(form)}\\s*(?:₽|р\\.?|руб\\.?)?\\.?`, 'giu'),
        ' ',
      );
    }
  }
  const next = card.next_session ? new Date(card.next_session) : null;
  if (next && !Number.isNaN(next.getTime())) {
    const day = next.getUTCDate();
    const month = MONTHS[next.getUTCMonth()];
    s = s.replace(new RegExp(`\\s*${day}\\s+${month}(?:\\s+\\d{4}(?:\\s+года)?)?(?:,?\\s*\\d{1,2}:\\d{2})?\\.?`, 'giu'), ' ');
  }
  const venue = String(card.venue || '').trim();
  if (venue) {
    s = s.replace(new RegExp(`\\s*(?:Место|Площадка)\\s*:?\\s*${escapeRe(venue)}[^.!?\n]*[.!?]?`, 'giu'), ' ');
  }
  if (String(card.venue_address || '').trim()) {
    s = s.replace(/\s*Адрес\s*:?\s*[^.!?\n]*[.!?]?/giu, ' ');
  }
  return s.replace(/[ \t]{2,}/gu, ' ').replace(/\s+([.,!?;:])/gu, '$1').trim();
}

/** True when a section body has no meaningful content left (venue/city only counts as blank). */
export function isBlankBody(body, card = {}) {
  let s = String(body || '')
    .replace(/[^0-9a-zа-яё]+/giu, ' ')
    .trim();
  if (!s) return true;
  for (const token of [card.venue, card.city]) {
    const norm = String(token || '')
      .replace(/[^0-9a-zа-яё]+/giu, ' ')
      .trim();
    if (norm) s = s.replace(new RegExp(escapeRe(norm), 'giu'), ' ');
  }
  return s.replace(/\s+/gu, '').length < 3;
}

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

const FACT_SECTION_HEADS_RE = /^##\s*(?:Даты и билеты|Организационные детали|ОРГАНИЗАЦИОННЫЕ ДЕТАЛИ|Место проведения концерта|Информация|Дополнительная информация|Дополнительно|Условия участия|Как добраться)$/iu;

/** Split a section into head and body, tolerating glued one-line sections. */
function splitHeadBody(sectionText) {
  const nl = sectionText.indexOf('\n');
  if (nl > 0) return { head: sectionText.slice(0, nl).trim(), body: sectionText.slice(nl + 1), glued: false };
  const glue = /^(##\s*(?:Даты и билеты|Организационные детали|ОРГАНИЗАЦИОННЫЕ ДЕТАЛИ|Место проведения концерта|Информация|Дополнительная информация|Дополнительно|Условия участия|Как добраться))(?:\s+([\s\S]*))?$/iu.exec(sectionText.trim());
  if (glue) return { head: glue[1].trim(), body: glue[2] || '', glued: true };
  return { head: sectionText.trim(), body: '', glued: false };
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
    dupPhrases: 0,
    dupFacts: 0,
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

    const leadStripped = stripDatePhrases(leadClean);
    if (leadStripped !== leadClean) marks.dupPhrases += 1;
    const leadDated = actualizeDates(leadStripped, d);
    if (leadDated !== leadStripped) marks.datesFixed += 1;
    let leadText = fixTemplatedCase(fixCityCase(leadDated, caseCtx));
    if (leadText !== leadDated) marks.cityFixed += 1;

    if (leadText.replace(/(?:^|\n)##\s[\s\S]*$/u, '').trim().length < 40) {
      leadText = String(buildMinimalEventDescription(cardInput, index)).split('\n\n')[0];
      marks.leadRebuilt += 1;
    }

    const kept = [];
    for (const section of sections) {
      if (DROP_SECTION_RE.test(section)) {
        marks.legacyBlocksDropped += 1;
        continue;
      }
      const sectionClean = cleanText(section);
      const { head, body, glued } = splitHeadBody(sectionClean);

      let cleanedBody = stripDatePhrases(body);
      if (cleanedBody !== body) marks.dupPhrases += 1;
      if (glued || FACT_SECTION_HEADS_RE.test(head)) {
        const deduped = dedupeFacts(cleanedBody, d);
        if (deduped !== cleanedBody) marks.dupFacts += 1;
        cleanedBody = deduped;
      }
      cleanedBody = cleanText(cleanedBody);
      cleanedBody = actualizeDates(cleanedBody, d);
      cleanedBody = fixTemplatedCase(fixCityCase(cleanedBody, caseCtx));

      if (isBlankBody(cleanedBody, d)) {
        marks.legacyBlocksDropped += 1;
        continue;
      }
      kept.push(cleanedBody ? `${head}\n\n${cleanedBody}` : head);
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
      if (diffSlug && String(d.slug || '').includes(diffSlug)) {
        const raw = String(d.raw || '').replace(/\r\n/gu, '\n').trim();
        let pos = 0;
        while (pos < raw.length && pos < text.length && raw[pos] === text[pos]) pos += 1;
        writeFileSafe(
          path.join(outDir, `diff-${diffSlug.replace(/[^a-z0-9-]/giu, '_')}.txt`),
          `RAW len=${raw.length}\n${JSON.stringify(raw.slice(Math.max(0, pos - 90), pos + 90))}\n\nTEXT len=${text.length}\n${JSON.stringify(text.slice(Math.max(0, pos - 90), pos + 90))}\n\nRAW tail: ${JSON.stringify(raw.slice(-60))}\nTEXT tail: ${JSON.stringify(text.slice(-60))}`,
        );
      }
      plan.push({ id: d.id, slug: d.slug, text });
      if (samples.length < 12) {
        samples.push(
          `\n\n===== ${d.slug} (${String(d.raw || '').length} -> ${text.length}) =====\n--- BEFORE (raw) ---\n${String(d.raw || '').slice(0, 300)}\n--- AFTER ---\n${text.slice(0, 520)}`,
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
