import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveCityTimeZone } from '../apps/backend/src/city-timezone.js';

const root = process.cwd();
const dir = path.join(root, 'data/ticketscloud/editorial');
const apply = process.argv.includes('--apply');
const backupPath = path.join(dir, 'newyear-eventpage-remaining-production-backup-2026-11-26.json');
const resultPath = path.join(dir, 'newyear-eventpage-remaining-production-result-2026-11-26.json');
const version = '2026-11-26-newyear-priority-rewrites-64pages';

function getJSON(name) { return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')); }
function parseNumberedSections(text) {
  const matches = [...text.matchAll(/^## (\d+)\. (.+)$/gmu)];
  return matches.map((match, index) => ({
    number: Number(match[1]), heading: match[2].trim(),
    text: text.slice(match.index, matches[index + 1]?.index ?? text.length).trim(),
  }));
}
function stripMd(value) { return String(value || '').replace(/<[^>]*>/gu, ' ').replace(/[`*_>#]/gu, '').replace(/\s+/gu, ' ').trim(); }
function getBodyAndSummary(section) {
  let summary = section.text.match(/### Кратко\s*\r?\n([\s\S]*?)\s*### О событии/u)?.[1]?.trim() || null;
  let body = section.text.match(/### О событии\s*\r?\n([\s\S]*?)\s*### Практическая информация/u)?.[1]?.trim()
    || section.text.match(/^## \d+\. [^\r\n]+\s*\r?\n([\s\S]*?)(?=\r?\n## (?:\d+\.|Редакционные)|$)/u)?.[1]?.trim();
  if (!body) throw new Error(`No editorial body: ${section.heading}`);
  const intro = body.match(/^([\s\S]{25,}?[.!?])(?=\s|$)/u)?.[1]?.trim();
  if (intro) {
    summary = intro;
    body = body.slice(intro.length).trim();
  }
  summary = summary ? stripMd(summary) : null;
  if (!summary || !body) throw new Error(`Could not split a non-repeating annotation from body: ${section.heading}`);
  return { summary, body };
}
const selection = getJSON('newyear-eventpage-remaining-selection-2026-11-25.json');
const audit = getJSON('newyear-eventpage-remaining-live-audit-2026-11-26.json');
const archiveFile = 'newyear-eventpage-remaining-source-archive-2026-11-25.json';
const sourceArchive = getJSON(archiveFile);
const selectedById = new Map(selection.pages.map((page) => [page.id, page]));
const liveById = new Map(audit.pages.map((page) => [page.id, page]));
if (audit.database !== 'daibilet' || audit.pages.length !== 64 || audit.linkedEventIds !== undefined) throw new Error('Unexpected live audit shape or database');

const batch02 = parseNumberedSections(fs.readFileSync(path.join(dir, 'newyear-eventpage-priority-batch-02-rewrites-2026-11-25.md'), 'utf8'));
const batch03 = parseNumberedSections(fs.readFileSync(path.join(dir, 'newyear-eventpage-priority-batch-03-rewrites-2026-11-26.md'), 'utf8'));
const batch04 = parseNumberedSections(fs.readFileSync(path.join(dir, 'newyear-eventpage-priority-batch-04-rewrites-2026-11-26.md'), 'utf8'));
const slugs03 = [
  ['novogodnyaya-grimerka-ekaterinburg'],
  ['aleks-abra-christmas-in-new-york-novogodnii-dzhaz-s-yumorom-moskva'],
  ['loud-boyz-2027-new-year-x-winline-x-yauza-place-moskva'],
  ['novogodnyaya-noch-2027-dzhoker-sochi'],
  ['novyi-god-v-krugu-svoih-t-s-lounge-balashiha'],
  ['novyi-god-v-krugu-svoih-t-s-lounge-krasnogorsk'],
  ['ot-vinta-new-year-27-moskva'],
  ['novyi-god-v-dzhem-klub-myuzik-moskva'],
  ['novyi-god-s-arsenalom-moskva'],
  ['novyi-god-so-starymi-druzyami-2027-sankt-peterburg'],
  ['novyi-god-v-maltiiskoi-kapelle-organnyi-koncert-pri-svechah-sankt-peterburg'],
  ['landyshi-novogodnii-koncert-sankt-peterburg'],
  ['novyi-god-v-maltiiskoi-kapelle-istoricheskii-organ-v-maltiiskoi-kapelle-sankt-peterburg'],
  ['dzhaz-kabare-novogodnyaya-noch-burlesk-shou-v-soprovozhdenii-zhivogo-dzhaza-18-moskva'],
  ['chaikovskii-pri-svechah-rozhdestvenskii-koncert-muzyki-i-baleta-pri-svechah-v-istoricheskom-osobnyake-moskva'],
  ['tribyut-shou-kak-v-staroi-skazke-tver'],
  ['ravanna-novogodnii-koncert-sankt-peterburg', 'ravanna-novogodnii-koncert-moskva'],
  ['cirk-novogodnii-karnaval-v-g-fokino-bryansk'],
  ['kino-pod-elkoi-koncert-pri-svechah-volzhsk'],
  ['chaikovskii-pri-svechah-rozhdestvenskii-koncert-muzyki-i-baleta-pri-svechah-moskva'],
  ['lihoradka-charlstona-novogodnii-uzhin-koncert-za-stolikami-sankt-peterburg'],
  ['novogodnee-tango-ansambl-remolino-sankt-peterburg'],
  ['05-01-27-gudtaims-novogodnii-yaroslavl'],
  ['na-rozhdestvo-v-tulu-6-yanvarya-2027-iz-kurska-kursk'],
  ['ekskursionnyi-tur-rozhdestvenskaya-moskva-7-yanvarya-2027-iz-kurska-kursk'],
  ['schelkunchik-novogodnyaya-muzykalnaya-skazka-s-pesochnoi-animaciei-moskva-3'],
  ['melodii-rozhdestva-zhenskii-hor-sankt-peterburgskoi-mitropolii-sankt-peterburg'],
  ['novogodnyaya-rok-akustika-ot-gr-akura-tver'],
];
const slugs04 = [
  ['novogodnee-burlishou-moskva'],
  ['avtorskii-koncert-rvi-meha-orkestra-rozhdestvenskii-koncert-moskva','avtorskii-koncert-rvi-meha-orkestra-rozhdestvenskii-koncert-sankt-peterburg'],
  ['boris-kuzmin-akustika-moskva','boris-kuzmin-akustika-sankt-peterburg'],
  ['07-01-2027-volgograd-kostya-kulyasov-i-gruppa-animaciya-animaciya-online-volgograd','05-01-2027-voronezh-kostya-kulyasov-i-gruppa-animaciya-animaciya-online-voronezh','09-01-2027-krasnodar-kostya-kulyasov-i-gruppa-animaciya-animaciya-online-krasnodar','08-01-2027-rostov-na-donu-kostya-kulyasov-i-gruppa-animaciya-animaciya-online-rostov-na-donu','06-01-2027-tambov-kostya-kulyasov-i-gruppa-animaciya-animaciya-online-tambov','03-01-2027-tula-kostya-kulyasov-i-gruppa-animaciya-animaciya-online-tula'],
  ['nakonechnyi-5-yanvarya-moskva','nakonechnyi-4-yanvarya-piter-sankt-peterburg'],
];
if (batch02.length !== 22 || batch03.length !== 28 || batch04.length !== 5) throw new Error(`Unexpected editorial text counts ${batch02.length}/${batch03.length}/${batch04.length}`);

const rewrites = [];
for (const section of batch02) {
  const slug = section.text.match(/- EventPage: https:\/\/daibilet\.ru\/events\/([^\s\r\n]+)/u)?.[1];
  const id = section.text.match(/- EventPage ID: `([^`]+)`/u)?.[1];
  if (!slug || !id) throw new Error(`Missing exact page mapping for batch 2 ${section.heading}`);
  const { summary, body } = getBodyAndSummary(section);
  const practical = section.text.match(/### Практическая информация\s*\r?\n([\s\S]*?)(?=\r?\n## \d+\.|$)/u)?.[1]?.trim() || '';
  const extras = practical.split(/\r?\n/u).map((line) => line.trim()).filter((line) => /^[-*]\s*\*\*(?:Включено|Важно|Продолжительность)\*\*:/iu.test(line));
  rewrites.push({ pageIds: [id], slugs: [slug], title: section.heading, summary, body, extras, section: section.heading });
}
for (const [index, section] of batch03.entries()) {
  const { summary, body } = getBodyAndSummary(section);
  rewrites.push({ pageIds: slugs03[index].map((slug) => selectedById.get([...selectedById.values()].find((row) => row.slug === slug)?.id)?.id).filter(Boolean),
    slugs: slugs03[index], title: section.heading, summary, body, extras: [], section: section.heading });
}
for (const [index, section] of batch04.entries()) {
  const { summary, body } = getBodyAndSummary(section);
  rewrites.push({ pageIds: slugs04[index].map((slug) => [...selectedById.values()].find((row) => row.slug === slug)?.id).filter(Boolean),
    slugs: slugs04[index], title: section.heading.replace(/ — общий мастер-текст для .+$/u, ''), summary, body, extras: [], section: section.heading });
}

const pageRewrite = new Map();
for (const rewrite of rewrites) for (const id of rewrite.pageIds) {
  if (!id || pageRewrite.has(id)) throw new Error(`Duplicate or missing page mapping in ${rewrite.section}`);
  pageRewrite.set(id, rewrite);
}
if (rewrites.length !== 55 || pageRewrite.size !== 64) throw new Error(`Expected 55 master rewrites/64 pages, got ${rewrites.length}/${pageRewrite.size}`);

function isActiveFuture(session, at = new Date(audit.checkedAt)) {
  return session.isActive !== false && !session.cancelledAt && !session.archivedAt && new Date(session.startsAt) >= at
    && !['widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale'].includes(String(session.sourceStatus || '').toLowerCase());
}
function datesFor(page) {
  const city = page.city || 'Москва';
  const tz = resolveCityTimeZone(city);
  const sessions = page.events.flatMap((event) => (event.sessions || []).filter(isActiveFuture));
  const unique = [...new Map(sessions.map((session) => [String(session.startsAt), session])).values()].sort((a,b) => new Date(a.startsAt)-new Date(b.startsAt));
  const labels = unique.slice(0, 6).map((session) => {
    const date = new Date(session.startsAt);
    const d = new Intl.DateTimeFormat('ru-RU', { day:'numeric', month:'long', year:'numeric', timeZone:tz }).format(date).replace(/ г\./u,'');
    const t = new Intl.DateTimeFormat('ru-RU', { hour:'2-digit', minute:'2-digit', hourCycle:'h23', timeZone:tz }).format(date);
    return `${d}, ${t}`;
  });
  return { unique, labels, suffix: unique.length > labels.length ? `; ещё ${unique.length-labels.length} — в расписании` : '' };
}
function makePractical(page, rewrite) {
  const events = page.events;
  const venues = [...new Set(events.map((event) => event.venue).filter(Boolean))];
  const addresses = [...new Set(events.map((event) => event.address).filter(Boolean))];
  const ages = [...new Set(events.map((event) => event.ageLimit).filter((age) => age !== null && age !== undefined && String(age).trim()))];
  const offers = events.flatMap((event) => (event.offers || []).filter((offer) => offer.active === true && Number.isFinite(Number(offer.priceRub))).map((offer) => Number(offer.priceRub)));
  const schedule = datesFor(page);
  const lines = [];
  if (venues.length === 1) lines.push(`- **Площадка:** ${venues[0]}`);
  else if (venues.length > 1) lines.push(`- **Площадки:** ${venues.join('; ')}`);
  if (addresses.length === 1) lines.push(`- **Адрес:** ${page.city ? `${page.city}, ` : ''}${addresses[0]}`);
  else if (addresses.length > 1) lines.push(`- **Адреса:** ${addresses.map((address) => `${page.city ? `${page.city}, ` : ''}${address}`).join('; ')}`);
  if (ages.length === 1) lines.push(`- **Возрастное ограничение:** ${String(ages[0]).match(/\+$/u) ? ages[0] : `${ages[0]}+`}`);
  else if (ages.length > 1) lines.push('- **Возрастное ограничение:** зависит от сеанса; уточняйте при выборе билета');
  if (schedule.labels.length) lines.push(`- **Даты и время:** ${schedule.labels.join('; ')}${schedule.suffix}`);
  if (offers.length) lines.push(`- **Билеты:** от ${new Intl.NumberFormat('ru-RU').format(Math.min(...offers))} ₽; доступные категории — в билетном блоке`);
  lines.push(...rewrite.extras);
  return lines.join('\n');
}
function plain(value) { return String(value || '').replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim(); }
function mainSourceFor(page) {
  const archived = sourceArchive.pages.find((item) => item.eventPageId === page.id || item.slug === page.slug);
  const descs = archived?.sourceVariants?.map((variant) => variant.description).filter(Boolean) || [];
  return Math.max(0, ...descs.map((description) => {
    let text = String(description);
    text = text.replace(/##\s*(?:🎁\s*)?Билеты\s*\r?\n[\s\S]*?(?=\r?\n\r?\n[^\r\n#-])/iu, ' ');
    text = text.replace(/(?:^|\r?\n)##\s*Практическая информация[\s\S]*$/iu, ' ');
    text = text.replace(/(?:^|\r?\n)(?:-\s*)?(?:Место|Площадка|Адрес|Возрастное ограничение|Тайминг|Дата и время|Начало|Продолжительность|Билеты)\s*[:—-][^\r\n]*(?:\r?\n(?:-\s*[^\r\n]+)?)*$/iu, ' ');
    return plain(text).length;
  }));
}
function paragraphCount(text) { return text.split(/\r?\n\s*\r?\n/u).map((v) => v.trim()).filter((v) => v.length > 40).length; }

const rows = [];
for (const [id, rewrite] of pageRewrite) {
  const selected = selectedById.get(id);
  const live = liveById.get(id);
  if (!selected || !live || live.page.slug !== selected.slug) throw new Error(`Live page/slug mismatch: ${selected?.slug || id}`);
  const linked = live.page.links.map((link) => String(link.eventId)).sort();
  const expected = [...(selected.eventIds || [])].map(String).sort();
  const liveEvents = live.events || [];
  if (live.page.status !== 'DRAFT' || live.page.isIndexable !== false || live.page.publishedAt || live.page.content?.activeEditorialText?.status === 'ACTIVE_EDITORIAL_REWRITE') throw new Error(`Page is no longer a clean draft: ${live.page.slug}`);
  if (!live.liveStatus.hasActiveFutureSessionsAndOffers || !liveEvents.length) throw new Error(`No currently saleable slot for ${live.page.slug}`);
  if (linked.join('|') !== expected.join('|')) throw new Error(`EventPage ↔ Event links changed in audit row ${live.page.slug}`);
  const rewriteBody = `${stripMd(rewrite.summary)} ${stripMd(rewrite.body)}`;
  const sourceChars = mainSourceFor(live);
  const rewriteChars = rewriteBody.length;
  const paragraphs = paragraphCount(rewrite.body);
  if (paragraphs < 2) throw new Error(`Fewer than two substantive paragraphs: ${live.page.slug}`);
  if (rewriteChars < sourceChars) throw new Error(`Rewrite shorter than source for ${live.page.slug}: ${rewriteChars} < ${sourceChars}`);
  if (/\bEventPage\b/iu.test(`${rewrite.title}\n${rewrite.summary}\n${rewrite.body}`)) throw new Error(`Internal term in customer text: ${live.page.slug}`);
  const title = rewrite.title.replace(/\s+—\s+общий мастер-текст для .+$/iu, '')
    .replace(/\s+—\s+(?:Санкт-Петербург|Москва|Екатеринбург|Тверь|Красногорск|Балашиха|Сочи|Санкт Петербург|Ярославль|Волжск|Волгоград|Воронеж|Краснодар|Ростов-на-Дону|Тамбов|Тула|Курск|Чебоксары|Барнаул|Арзамас|Калининград)(?:\s*\([^)]*\))?$/iu, '').trim();
  rows.push({ id, slug: live.page.slug, city: live.city || selected.city, pageTitle: live.page.title, title,
    summary: rewrite.summary, body: rewrite.body, practical: makePractical(live, rewrite), sourceChars, rewriteChars, paragraphs,
    eventIds: linked, originalStatus: live.page.status, originalIndexable: live.page.isIndexable,
    oldRoutePaths: (live.page.routes || []).map((route) => route.path).sort(), oldTourGroupId: live.page.tourGroupId || null,
    venue: live.venue, address: live.address, activeSessions: live.liveStatus.activeSlotCount,
    sourceSection: rewrite.section });
}

const tourGroups = [
  { title: 'Ravanna — новогодний тур 2027', slugs: ['ravanna-novogodnii-koncert-sankt-peterburg','ravanna-novogodnii-koncert-moskva'] },
  { title: 'Рви Меха — Оркестра! — Рождественский тур 2026', slugs: ['avtorskii-koncert-rvi-meha-orkestra-rozhdestvenskii-koncert-moskva','avtorskii-koncert-rvi-meha-orkestra-rozhdestvenskii-koncert-sankt-peterburg'] },
  { title: 'Борис Кузьмин — акустический тур, январь 2027', slugs: ['boris-kuzmin-akustika-moskva','boris-kuzmin-akustika-sankt-peterburg'] },
  { title: 'Костя Кулясов и группа «АнимациЯ» — новогодний тур 2027', slugs: ['07-01-2027-volgograd-kostya-kulyasov-i-gruppa-animaciya-animaciya-online-volgograd','05-01-2027-voronezh-kostya-kulyasov-i-gruppa-animaciya-animaciya-online-voronezh','09-01-2027-krasnodar-kostya-kulyasov-i-gruppa-animaciya-animaciya-online-krasnodar','08-01-2027-rostov-na-donu-kostya-kulyasov-i-gruppa-animaciya-animaciya-online-rostov-na-donu','06-01-2027-tambov-kostya-kulyasov-i-gruppa-animaciya-animaciya-online-tambov','03-01-2027-tula-kostya-kulyasov-i-gruppa-animaciya-animaciya-online-tula'] },
  { title: 'Наконечный — новогодняя акустика, январь 2027', slugs: ['nakonechnyi-5-yanvarya-moskva','nakonechnyi-4-yanvarya-piter-sankt-peterburg'] },
];
for (const group of tourGroups) for (const slug of group.slugs) {
  const page = rows.find((row) => row.slug === slug);
  if (!page) throw new Error(`Tour page missing from prepared rows: ${slug}`);
}
const eventIds = [...new Set(rows.flatMap((row) => row.eventIds))];
if (eventIds.length !== 85) throw new Error(`Expected 85 linked Event IDs, got ${eventIds.length}`);
const report = { generatedAt: new Date().toISOString(), checkedAt: audit.checkedAt, database: audit.database,
  textUnits: rewrites.length, pageCount: rows.length, linkedEventCount: eventIds.length, tourGroups,
  counts: { short: rows.filter((row) => row.rewriteChars < row.sourceChars).length,
    paragraphsFail: rows.filter((row) => row.paragraphs < 2).length,
    drafts: rows.filter((row) => row.originalStatus === 'DRAFT' && row.originalIndexable === false).length,
    withActiveSlots: rows.filter((row) => row.activeSessions > 0).length },
  pages: rows };
const auditPath = path.join(dir, 'newyear-eventpage-remaining-editorial-audit-2026-11-26.json');
fs.writeFileSync(auditPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (report.counts.short || report.counts.paragraphsFail || report.counts.drafts !== 64 || report.counts.withActiveSlots !== 64) {
  const failures = rows.filter((row) => row.rewriteChars < row.sourceChars || row.paragraphs < 2 || row.activeSessions <= 0);
  throw new Error(`Editorial/live audit failed: ${JSON.stringify(failures.map(({slug,sourceChars,rewriteChars,paragraphs,activeSessions})=>({slug,sourceChars,rewriteChars,paragraphs,activeSessions})))}`);
}

const envPath = path.join(root, '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/u)) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const at = t.indexOf('='); if (at > 0) process.env[t.slice(0,at).trim()] = t.slice(at+1).trim().replace(/^['"]|['"]$/gu,'');
}
const url = new URL(process.env.DATABASE_URL || '');
if (url.pathname.endsWith('/daibilet_baseline') && process.env.ALLOW_PRODUCTION_SSH_TUNNEL === '1') { url.pathname='/daibilet'; url.port='5433'; process.env.DATABASE_URL=url.toString(); }
if (!new URL(process.env.DATABASE_URL).pathname.endsWith('/daibilet')) throw new Error('Refusing to continue outside production database daibilet');
const helpers = await import(pathToFileURL(path.join(root, 'apps/backend/src/event-pages.js')).href);
const { createDb } = await import(pathToFileURL(path.join(root, 'apps/backend/src/db.js')).href);
const db = createDb(root);
try {
  const identity = await db.query('SELECT current_database() AS database, now() AS "checkedAt"');
  if (identity.rows[0]?.database !== 'daibilet') throw new Error('Connected DB is not production daibilet');
  const ids = rows.map((row) => row.id);
  const livePages = await db.query(`SELECT p.id,p.slug,p.status,p."isIndexable",p."publishedAt",p.content,p."canonicalPath",p."tourGroupId",
    COALESCE((SELECT jsonb_agg(jsonb_build_object('eventId',l."eventId") ORDER BY l.position,l."createdAt") FROM "EventPageEvent" l WHERE l."eventPageId"=p.id),'[]'::jsonb) AS links,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('path',r.path) ORDER BY r.path) FROM "EventPageRoute" r WHERE r."eventPageId"=p.id),'[]'::jsonb) AS routes
    FROM "EventPage" p WHERE p.id=ANY($1::text[])`, [ids]);
  if (livePages.rows.length !== 64) throw new Error(`Production preflight found ${livePages.rows.length}/64 pages`);
  const currentById = new Map(livePages.rows.map((p)=>[p.id,p]));
  for (const row of rows) {
    const page=currentById.get(row.id);
    if (page.slug!==row.slug || page.status!=='DRAFT' || page.isIndexable!==false || page.publishedAt || page.content?.activeEditorialText?.status==='ACTIVE_EDITORIAL_REWRITE') throw new Error(`Production state changed or not draft: ${row.slug}`);
    const actual=page.links.map((l)=>String(l.eventId)).sort();
    if (actual.join('|')!==row.eventIds.join('|')) throw new Error(`Production Event ID links changed: ${row.slug}`);
    const routePaths=page.routes.map((r)=>r.path).sort();
    if (routePaths.join('|')!==row.oldRoutePaths.join('|') || (page.canonicalPath && page.canonicalPath!==`/events/${row.slug}`)) throw new Error(`Route/canonical changed: ${row.slug}`);
    if (row.eventIds.some((eventId)=>!liveById.get(row.id).liveStatus.activeLinkedEventIds.includes(eventId))) throw new Error(`One or more linked events no longer has active sessions/offers: ${row.slug}`);
  }
  const currentEvents = await db.query(`SELECT e.id,
    EXISTS(SELECT 1 FROM "EventSession" s WHERE s."eventId"=e.id AND s."isActive" IS NOT FALSE AND s."cancelledAt" IS NULL AND s."archivedAt" IS NULL AND s."startsAt">=now()
      AND lower(coalesce(s."sourceStatus",'')) NOT IN ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale')) AS "hasFutureSession",
    EXISTS(SELECT 1 FROM "EventOffer" o WHERE o."eventId"=e.id AND o.active IS TRUE) AS "hasActiveOffer"
    FROM "Event" e WHERE e.id=ANY($1::text[])`, [eventIds]);
  if (currentEvents.rows.length !== eventIds.length || currentEvents.rows.some((event) => !event.hasFutureSession || !event.hasActiveOffer)) {
    throw new Error('A linked Event no longer has an active future session and offer');
  }
  const backup = { generatedAt:new Date().toISOString(), database:'daibilet', checkedAt:identity.rows[0].checkedAt,
    pages:livePages.rows, events:audit.pages.flatMap((page)=>page.events), sourceArchive:archiveFile };
  if (!apply) {
    fs.writeFileSync(backupPath, `${JSON.stringify(backup,null,2)}\n`);
    process.stdout.write(JSON.stringify({ mode:'preflight', checkedAt:identity.rows[0].checkedAt, textUnits:rewrites.length,
      pages:rows.length, linkedEvents:eventIds.length, drafts:64, indexableBefore:0, withFutureSlots:64,
      shortTextCount:0, minParagraphCount:Math.min(...rows.map((row)=>row.paragraphs)), tourGroups:tourGroups.length,
      backupPath, editorialAudit:auditPath },null,2));
  } else {
    if (!fs.existsSync(backupPath)) throw new Error('Production backup missing; run preflight first');
    const saved=getJSON(path.basename(backupPath));
    if(saved.database!=='daibilet'||saved.pages.length!==64) throw new Error('Production backup validation failed');
    const result={appliedAt:new Date().toISOString(),database:'daibilet',version,pages:[],tourGroups:[]};
    const txDb=await db.transaction(async ({query})=>{
      const helperDb={query,transaction:(fn)=>fn({query})};
      for(const row of rows){
        const current=await helpers.getAdminEventPage(helperDb,row.id);
        if(!current||current.status!=='DRAFT'||current.isIndexable!==false||current.publishedAt) throw new Error(`Draft changed before write: ${row.slug} state=${JSON.stringify(current && {status:current.status,isIndexable:current.isIndexable,publishedAt:current.publishedAt})}`);
        const currentEventIds=(current.events||[]).map((e)=>String(e.eventId||e.id)).sort();
        if(currentEventIds.join('|')!==row.eventIds.join('|')) throw new Error(`Event associations changed before write: ${row.slug}`);
        const practical=makePractical(liveById.get(row.id), pageRewrite.get(row.id));
        const content={sections:[
          {id:'about',kind:'about',title:'О событии',body:pageRewrite.get(row.id).body,items:[]},
          {id:'practical-info',kind:'custom',title:'Практическая информация',body:practical,items:[]},
        ],activeEditorialText:{field:'sections',status:'ACTIVE_EDITORIAL_REWRITE',version},
        sourceArchive:{status:'ARCHIVED_SOURCE_NOT_RENDERED',active:false,archiveFile,eventIds:row.eventIds}};
        const city=row.city||'';
        const seoH1=row.title;
        const seoTitle=`${seoH1}${city?` — ${city}`:''} | Дайбилет`;
        const updated=await helpers.updateAdminEventPage(helperDb,row.id,{slug:row.slug,title:row.title,summary:row.summary,
          heroImageUrl:current.heroImageUrl,content,seoH1,seoTitle,seoDescription:`${row.summary}`.slice(0,300),
          canonicalPath:`/events/${row.slug}`,status:'READY',isIndexable:true,
          changeNote:'Новогодний редакционный рерайт; исходник сохранён в неиспользуемом архиве, EventPage открыта к индексации'});
        const published=await helpers.publishAdminEventPage(helperDb,row.id);
        if(!updated||!published||published.status!=='READY'||published.isIndexable!==true||!published.publishedAt) throw new Error(`Publish validation failed: ${row.slug}`);
        result.pages.push({id:row.id,slug:row.slug,title:published.title,status:published.status,isIndexable:published.isIndexable,publishedAt:published.publishedAt,eventIds:row.eventIds,revisionCount:published.revisions?.length??null});
      }
      for(const group of tourGroups){
        const groupPageIds=group.slugs.map((slug)=>rows.find((row)=>row.slug===slug).id);
        const existing=await query('SELECT id FROM "EventTourGroup" WHERE title=$1',[group.title]);
        const created=existing.rows[0]||await helpers.createAdminEventTourGroup(helperDb,{title:group.title});
        for(const pageId of groupPageIds) await helpers.assignAdminEventPageTourGroup(helperDb,pageId,created.id);
        result.tourGroups.push({id:created.id,title:group.title,pageIds:groupPageIds});
      }
      return true;
    });
    if(!txDb) throw new Error('Production transaction did not complete');
    result.complete=true;
    fs.writeFileSync(resultPath,`${JSON.stringify(result,null,2)}\n`);
    process.stdout.write(JSON.stringify({complete:true,rewrites:result.pages.length,linkedEventIds:eventIds.length,tourGroups:result.tourGroups.length,resultPath},null,2));
  }
} finally { await db.close(); }
