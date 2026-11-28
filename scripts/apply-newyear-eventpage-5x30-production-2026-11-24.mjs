import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.env.REWRITE_ROOT || process.cwd();
const dbRoot = process.env.DAIBILET_DB_ROOT || root;
const helperPath = process.env.EVENT_PAGE_HELPERS || path.join(root, 'apps/backend/src/event-pages.js');
const editorialDir = path.join(root, 'data/ticketscloud/editorial');
const apply = process.argv.includes('--apply');
const backupPath = process.env.REWRITE_BACKUP || path.join(editorialDir, 'newyear-eventpage-production-backup-2026-11-24.json');
const resultPath = process.env.REWRITE_RESULT || path.join(editorialDir, 'newyear-eventpage-production-result-2026-11-24.json');
const version = '2026-11-24-newyear-eventpage-5x30';

function loadEnv(file) {
  const source = fs.readFileSync(file, 'utf8');
  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const at = trimmed.indexOf('=');
    if (at <= 0) continue;
    const key = trimmed.slice(0, at).trim();
    const value = trimmed.slice(at + 1).trim().replace(/^['"]|['"]$/gu, '');
    process.env[key] = value;
  }
}
loadEnv(path.join(dbRoot, '.env'));
const databaseUrl = new URL(process.env.DATABASE_URL || '');
if (!databaseUrl.pathname.endsWith('/daibilet')) throw new Error('Refusing to run unless DATABASE_URL targets the production database daibilet');

const selection = JSON.parse(fs.readFileSync(path.join(editorialDir, 'newyear-eventpage-selection-150-2026-11-24.json'), 'utf8'));
const audit = JSON.parse(fs.readFileSync(path.join(editorialDir, 'newyear-eventpage-editorial-audit-2026-11-24.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(editorialDir, 'newyear-eventpage-merge-manifest-2026-11-24.json'), 'utf8'));
const selectionRows = selection.batches.flat();
if (selectionRows.length !== 150 || new Set(selectionRows.map((row) => row.eventPageId)).size !== 150) throw new Error('Expected 150 unique selected EventPages');
if (manifest.groups.length !== 29 || manifest.counts.pagesBefore !== 90 || manifest.counts.pagesAfter !== 29) throw new Error('Unexpected same-city merge manifest totals');
if (audit.length !== 150 || audit.some((row) => row.status !== 'PASS' || row.paragraphs < 2)) throw new Error('Editorial length or paragraph audit is not clean');

function parseRewrite(row) {
  const file = path.join(editorialDir, `newyear-eventpage-batch-${String(row.batch).padStart(2, '0')}-rewrites-2026-11-24.md`);
  const markdown = fs.readFileSync(file, 'utf8');
  const startRx = new RegExp(`^## ${row.sequence}\\. .*$`, 'mu');
  const match = startRx.exec(markdown);
  if (!match) throw new Error(`Missing markdown row ${row.batch}/${row.sequence}`);
  const rest = markdown.slice(match.index);
  const next = rest.slice(1).search(/^## \d+\./mu);
  const chunk = next < 0 ? rest : rest.slice(0, next + 1);
  const title = chunk.match(/^## \d+\. (.+)$/mu)?.[1]?.trim();
  const summary = chunk.match(/### Кратко\s*\r?\n([\s\S]*?)\s*### О событии/u)?.[1]?.trim();
  const body = chunk.match(/### О событии\s*\r?\n([\s\S]*?)\s*### Практическая информация/u)?.[1]?.trim();
  const practical = chunk.match(/### Практическая информация\s*\r?\n([\s\S]*?)(?=\r?\n## \d+\.|$)/u)?.[1]?.trim();
  if (!title || !summary || !body || !practical) throw new Error(`Malformed rewrite ${row.batch}/${row.sequence}`);
  const auditRow = audit.find((item) => item.batch === row.batch && item.sequence === row.sequence);
  if (!auditRow || auditRow.status !== 'PASS') throw new Error(`Missing passing audit ${row.batch}/${row.sequence}`);
  if (/\bEventPage\b/iu.test(`${summary}\n${body}\n${practical}`)) throw new Error(`Internal term leaked into customer copy ${row.batch}/${row.sequence}`);
  return { ...row, title, summary, body, practical, rewriteChars: auditRow.rewriteChars, paragraphs: auditRow.paragraphs };
}
const parsedRows = selectionRows.map(parseRewrite);
const pageToMaster = new Map();
for (const group of manifest.groups) for (const page of group.pages) pageToMaster.set(page.id, group.targetPageId);
const rewriteByMaster = new Map();
for (const row of parsedRows) {
  const master = pageToMaster.get(row.eventPageId) || row.eventPageId;
  const prior = rewriteByMaster.get(master);
  if (!prior || row.eventPageId === master) rewriteByMaster.set(master, row);
}
if (rewriteByMaster.size !== 148) throw new Error(`Expected 148 selected master texts, got ${rewriteByMaster.size}`);

const eventPageIdForMadam = '47fa7184-09af-407e-a147-98b15c0eca59';
const madamWinterEventIds = [
  'evt_6af37af607f03a5dada6f3c9', 'evt_6af37af107f03a5dada6f28f',
  'evt_6aec54b7efe9bcf7c62352ce', 'evt_6aec54b3efe9bcf7c62351ad',
  'evt_6aec54afefe9bcf7c623508c', 'evt_6aec54abefe9bcf7c6234f6b',
  'evt_6aec54a7efe9bcf7c6234e4a', 'evt_6aec54a2efe9bcf7c6234d29',
];
const madamJazzEventIds = ['evt_6a60c8c0644f57a97e9e1408', 'evt_6a60c8c7644f57a97e9e150b'];
const madamJazzText = {
  title: '«Джазовый бунт»: бурлеск-кабаре «Мадам Бум»',
  summary: 'Кабаре «Мадам Бум» соединяет живой джаз, вокал и бурлеск в программе «Джазовый бунт» — взрослом сценическом вечере в ретро-эстетике.',
  body: `«Джазовый бунт» — вечер кабаре, в котором живая музыка становится частью сценического действия. По анонсу организатора, в программе встречаются джаз-бэнд, вокал и бурлеск-номера артисток «Мадам Бум». Перья, стразы и выразительные костюмы поддерживают эстетику классического ревю, а основой вечера остаются музыка и театральная подача.\n\nПрограмма рассчитана на взрослую аудиторию и проходит в ресторане-клубе «Гримёрка» в центре Москвы. Организатор описывает атмосферу как сочетание джаза, красоты сцены и ретро-образов; новогодний сюжет к этому шоу не относится. Поэтому его важно отличать от отдельной сезонной программы «Зимний шик», которая проходит в той же площадке.\n\nВ доступном анонсе не перечислены поимённый состав артистов и точный порядок номеров. Известны заявленные элементы шоу — живой джаз, вокал и бурлеск, — но конкретная программа может зависеть от вечера. Билет включает шоу и приветственный напиток; блюда, напитки из барного меню и кальян оплачиваются отдельно.`,
  practical: `- **Площадка:** ресторан-клуб «Гримёрка»\n- **Адрес:** Москва, Пушечная улица, 9/6\n- **Возрастное ограничение:** 18+\n- **Даты и время:** актуальные сеансы доступны в блоке выбора билетов\n- **Важно:** приветственный напиток включён; блюда, напитки из барного меню и кальян оплачиваются отдельно`,
};
const madamSpPrimaryPageId = '71963c39-6367-4331-8eac-7da8cac8b1ac';
const madamSpSecondaryPageId = '50ec592f-de91-4872-bf55-3e57adfaf2cd';
const madamSpWinterEventIds = [
  'evt_6ab6564dc0826605be4e7736', 'evt_6ab65653c0826605be4e77f5', 'evt_6ab65658c0826605be4e78b4',
  'evt_6ae9ef0f5b8b99b528b73d45', 'evt_6aec484761c1d6c22e234d31',
  'evt_6aec4ba943608153ccb73d45', 'evt_6aec4bac43608153ccb73e04', 'evt_6aec4baf43608153ccb73ec3', 'evt_6aec4bb143608153ccb73f82',
  'evt_6afcbdd620dde78e2f25a1c4', 'evt_6afcbdda20dde78e2f25a27e', 'evt_6afcbdde20dde78e2f25a338',
];
const madamSpGenericEventIds = [
  'evt_6a70a42e5e7b73efea2140c0', 'evt_6a70a4325e7b73efea214170',
  'evt_6a70a4375e7b73efea214220', 'evt_6a70a43c5e7b73efea2142d0',
];
const madamSpGenericText = {
  title: '«Мадам Бум»: бурлеск-кабаре с живым джазом',
  summary: 'Вечер в петербургском «Юнити Сенная» соединяет театрализованный бурлеск, джазовый вокал и ретро-эстетику кабаре.',
  body: `«Мадам Бум» — серия кабаре-вечеров в петербургском ресторане «Юнити Сенная». В анонсе организатор обещает театрализованные бурлеск-номера, выразительные костюмы, юмор и флирт. Здесь важны и музыка, и сценическая подача: джазовый вокал звучит уже во время сбора гостей, задавая тон всему вечеру.

Формат обращается к эстетике классического ревю — с перьями, блеском и нарядными образами. Билет включает шоу-программу и приветственный напиток; блюда и напитки из меню заказываются отдельно. Для вечера организатор рекомендует вечернюю одежду, но конкретный дресс-код стоит уточнить перед посещением.

В описании этой серии не заявлена отдельная сюжетная постановка или постоянный состав артистов. Поэтому программу лучше воспринимать как кабаре-шоу с живым джазом и бурлеском, а не смешивать с сезонной постановкой «Зимний шик», для которой предусмотрены самостоятельные даты и описание.`,
  practical: `- **Площадка:** ресторан «Юнити Сенная»
- **Адрес:** Санкт-Петербург, переулок Гривцова, 4
- **Возрастное ограничение:** 18+
- **Тайминг:** сбор гостей с 19:00, начало программы в 20:00
- **Важно:** шоу-программа и приветственный напиток включены; блюда и напитки из меню оплачиваются отдельно`,
};
const madamSpPartitionGroupKey = 'newyear26-g22';
const madamAuditPath = path.join(editorialDir, 'newyear-eventpage-madam-bum-jazz-bunt-correction-2026-11-24.md');
if (!fs.existsSync(madamAuditPath)) throw new Error('Missing separate Jazz Bunt rewrite artifact');
const splitSelection = parsedRows.find((row) => row.eventPageId === eventPageIdForMadam);
if (!splitSelection || !splitSelection.eventId || !madamWinterEventIds.includes(splitSelection.eventId)) throw new Error('Madam Bум selected rewrite does not map to verified Winter Chic slot');

const groupTourAssignments = [
  { title: 'Мураками — «Белым-бело»', pageIds: ['f6523fff-b317-4b62-be3f-241cf55b6813', 'c91a8e47-d40d-4501-b1d0-9245312e6b26', 'ccd6c78e-f61c-4009-927f-e366e11c680f', 'ddc11002-ac5e-4134-9ad0-206852bcb32c'] },
  { title: 'Betsy — новогоднее шоу', pageIds: ['6146c7fc-73d6-4892-adc6-0b107122e7e5', '81e3da8a-3a1d-4357-a437-bdf58ccf7f5e'] },
  { title: 'Театр на льду Color-Ice — «Щелкунчик»', pageIds: ['834e8df6-ead7-4134-98bc-ea4b13ae15a0', '882798dc-0d55-4133-9515-d0ba6a65c2c1', '37a41022-a1a0-49c3-978b-dc515fc3b8ef'] },
];
for (const tour of groupTourAssignments) {
  const cities = tour.pageIds.map((id) => selectionRows.find((row) => row.eventPageId === id)?.city).filter(Boolean);
  if (cities.length !== tour.pageIds.length || new Set(cities).size !== cities.length) throw new Error(`Invalid city map in TourGroup ${tour.title}`);
}

const affectedPageIds = [...new Set([
  ...selectionRows.map((row) => row.eventPageId),
  ...manifest.groups.flatMap((group) => [group.targetPageId, ...group.sourcePageIds]),
])];
const loadHelpers = async () => import(pathToFileURL(helperPath).href);
const { createDb } = await import(pathToFileURL(path.join(dbRoot, 'apps/backend/src/db.js')).href);
const helpers = await loadHelpers();
const db = createDb(dbRoot);

function normalizeText(value) { return String(value || '').toLocaleLowerCase('ru').replace(/ё/gu, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
function parseDateTime(value, timeZone) {
  const date = new Date(value);
  const datePart = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(date).replace(/ г\./u, '');
  const timePart = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
  return `${datePart}, ${timePart}`;
}
function practicalWithLiveSchedule(practical, linkedEvents, timeZone) {
  const sessions = [...new Map(linkedEvents.flatMap((event) => event.sessions || []).map((session) => [new Date(session.startsAt).toISOString(), session])).values()]
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const offers = linkedEvents.flatMap((event) => event.offers || []).filter((offer) => Number.isFinite(Number(offer.priceRub)) && Number(offer.priceRub) >= 0);
  let lines = practical.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  if (sessions.length > 1) {
    lines = lines.filter((line) => !/^[-*]\s*\*\*(?:дата и начало|ближайший сеанс|даты и начало|даты и время|сеансы|начало|тайминг|сбор гостей)\*\*\s*:/iu.test(line));
    const shown = sessions.slice(0, 8).map((session) => parseDateTime(session.startsAt, timeZone));
    const suffix = sessions.length > shown.length ? `; и ещё ${sessions.length - shown.length} сеансов — в блоке выбора билетов` : '';
    const schedule = `- **Даты и время:** ${shown.join('; ')}${suffix}`;
    const placeIndex = lines.findIndex((line) => /^[-*]\s*\*\*(?:адрес|адрес причала)\*\*\s*:/iu.test(line));
    lines.splice(placeIndex >= 0 ? placeIndex + 1 : lines.length, 0, schedule);
  }
  if (offers.length) {
    const minimumPrice = Math.min(...offers.map((offer) => Number(offer.priceRub)));
    const label = `- **Билеты:** от ${new Intl.NumberFormat('ru-RU').format(minimumPrice)} ₽`;
    const index = lines.findIndex((line) => /^[-*]\s*\*\*билеты\*\*\s*:/iu.test(line));
    if (index >= 0) lines[index] = label;
    else lines.push(label);
  }
  return lines.join('\n');
}
function contentFor(rewrite, linkedEvents, timeZone, archiveEventIds, customTitle = null) {
  const title = customTitle || rewrite.title;
  const practical = practicalWithLiveSchedule(rewrite.practical, linkedEvents, timeZone);
  return {
    title,
    summary: rewrite.summary,
    content: {
      sections: [
        { id: 'about', kind: 'about', title: 'О событии', body: rewrite.body, items: [] },
        { id: 'practical-info', kind: 'custom', title: 'Практическая информация', body: practical, items: [] },
      ],
      activeEditorialText: { field: 'sections', status: 'ACTIVE_EDITORIAL_REWRITE', version },
      sourceArchive: {
        status: 'ARCHIVED_SOURCE_NOT_RENDERED', active: false,
        archiveFile: 'newyear-eventpage-source-archive-final-2026-11-24.json',
        eventIds: [...new Set(archiveEventIds)].sort(),
      },
    },
  };
}

async function getLiveSnapshot() {
  const identity = await db.query('SELECT current_database() AS database, now() AS "checkedAt"');
  if (identity.rows[0]?.database !== 'daibilet') throw new Error('Connected database is not production daibilet');
  const pagesResult = await db.query(`
    SELECT page.id, page.slug, page.title, page.summary, page."heroImageUrl", page.content,
      page."seoH1", page."seoTitle", page."seoDescription", page."canonicalPath", page.status,
      page."isIndexable", page."publishedAt", page."tourGroupId", page."createdAt", page."updatedAt",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', link.id, 'eventId', link."eventId", 'position', link.position,
        'role', link.role, 'sourceSnapshot', link."sourceSnapshot") ORDER BY link.position, link."createdAt")
        FROM "EventPageEvent" link WHERE link."eventPageId" = page.id), '[]'::jsonb) AS links,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', route.id, 'path', route.path, 'kind', route.kind, 'source', route.source,
        'createdAt', route."createdAt") ORDER BY route.path)
        FROM "EventPageRoute" route WHERE route."eventPageId" = page.id), '[]'::jsonb) AS routes,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', revision.id, 'version', revision.version, 'content', revision.content,
        'sourceSnapshot', revision."sourceSnapshot", 'changeNote', revision."changeNote", 'createdBy', revision."createdBy",
        'createdAt', revision."createdAt") ORDER BY revision.version)
        FROM "EventPageRevision" revision WHERE revision."eventPageId" = page.id), '[]'::jsonb) AS revisions
    FROM "EventPage" page WHERE page.id = ANY($1::text[]) ORDER BY page.slug
  `, [affectedPageIds]);
  if (pagesResult.rows.length !== affectedPageIds.length) throw new Error(`Expected ${affectedPageIds.length} pages; found ${pagesResult.rows.length}`);
  const eventIds = [...new Set(pagesResult.rows.flatMap((page) => page.links.map((link) => String(link.eventId))))];
  const eventsResult = await db.query(`
    SELECT event.id, event.title, event.slug, event.description, event.status, event.kind, event."ageLimit",
      event."primaryCityId" AS "cityId", city.title AS city, event."venueId", venue.title AS venue,
      venue.address AS "venueAddress", event_override."mergeGroupKey",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('startsAt', session."startsAt", 'endsAt', session."endsAt") ORDER BY session."startsAt")
        FROM "EventSession" session WHERE session."eventId" = event.id AND session."isActive" IS NOT FALSE
          AND session."archivedAt" IS NULL AND session."cancelledAt" IS NULL AND session."startsAt" >= now()
          AND lower(coalesce(session."sourceStatus", '')) NOT IN ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale')), '[]'::jsonb) AS sessions,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('priceRub', offer."priceRub", 'title', offer.title) ORDER BY offer."priceRub")
        FROM "EventOffer" offer WHERE offer."eventId" = event.id AND offer.active IS TRUE), '[]'::jsonb) AS offers
    FROM "Event" event LEFT JOIN "City" city ON city.id = event."primaryCityId"
    LEFT JOIN "Venue" venue ON venue.id = event."venueId" LEFT JOIN "EventOverride" event_override ON event_override."eventId" = event.id
    WHERE event.id = ANY($1::text[]) ORDER BY event.id
  `, [eventIds]);
  if (eventsResult.rows.length !== eventIds.length) throw new Error('One or more linked Events disappeared');
  const pageById = new Map(pagesResult.rows.map((page) => [page.id, page]));
  const eventById = new Map(eventsResult.rows.map((event) => [event.id, event]));
  return { checkedAt: identity.rows[0].checkedAt, pageById, eventById };
}

function verifyPageDraft(page, expectedSlug) {
  if (!page || page.slug !== expectedSlug || page.status !== 'DRAFT' || page.isIndexable !== false || page.publishedAt != null) throw new Error(`Page is not the expected unpublished draft: ${expectedSlug}`);
  if (page.content?.activeEditorialText?.status === 'ACTIVE_EDITORIAL_REWRITE') throw new Error(`An active editorial rewrite already exists: ${expectedSlug}`);
  if (!(page.routes || []).some((route) => route.path === `/events/${expectedSlug}`)) throw new Error(`Candidate route is missing: ${expectedSlug}`);
}
function validateSnapshot(snapshot) {
  const changedConnections = [];
  const groupIssues = [];
  for (const row of selectionRows) {
    const page = snapshot.pageById.get(row.eventPageId);
    verifyPageDraft(page, row.slug);
    if (!page.links.some((link) => link.eventId === row.eventId)) throw new Error(`Selected Event ID is no longer linked: ${row.slug}`);
    const selectedEvent = snapshot.eventById.get(row.eventId);
    if (!selectedEvent?.sessions.length || !selectedEvent.offers.length) throw new Error(`Selected Event ID no longer has an active future session and offer: ${row.slug}`);
    const liveEvents = page.links.map((link) => snapshot.eventById.get(link.eventId));
    if (!liveEvents.some((event) => event.sessions.length && event.offers.some((offer) => Number.isFinite(Number(offer.priceRub)) || offer.priceRub == null))) throw new Error(`No active future sale slots on ${row.slug}`);
    for (const event of liveEvents) {
      if (event.mergeGroupKey && !manifest.groups.some((group) => group.pages.some((item) => item.eventIds.includes(event.id)))) {
        throw new Error(`Event ${event.id} already belongs to another merge group`);
      }
    }
  }
  for (const group of manifest.groups) {
    const groupEventIds = [];
    const cityNames = new Set();
    const venueIds = new Set();
    const addresses = new Set();
    const venueTitles = new Set();
    for (const expectedPage of group.pages) {
      const page = snapshot.pageById.get(expectedPage.id);
      verifyPageDraft(page, expectedPage.slug);
      const actualIds = page.links.map((link) => String(link.eventId)).sort();
      const wantedIds = expectedPage.eventIds.map(String).sort();
      if (actualIds.length !== wantedIds.length || actualIds.some((id, index) => id !== wantedIds[index])) {
        if (!process.env.REWRITE_DIAGNOSTICS) throw new Error(`Event IDs changed on ${expectedPage.slug}: expected=${JSON.stringify(wantedIds)} actual=${JSON.stringify(actualIds)}`);
        changedConnections.push({ pageId: page.id, slug: page.slug, expectedIds: wantedIds, actualIds,
          events: actualIds.map((id) => { const event = snapshot.eventById.get(id); return { id, title: event?.title, city: event?.city, venue: event?.venue, address: event?.venueAddress, description: String(event?.description || '').replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').slice(0, 170), activeSessions: event?.sessions?.length || 0 }; }) });
      }
      for (const id of actualIds) {
        groupEventIds.push(id);
        const event = snapshot.eventById.get(id);
        if (!event?.cityId || !event.venueId || !event.venue) throw new Error(`Missing live city or venue for ${id}`);
        cityNames.add(normalizeText(event.city)); venueIds.add(String(event.venueId));
        addresses.add(normalizeText(event.venueAddress)); venueTitles.add(normalizeText(event.venue));
        if (event.mergeGroupKey && event.mergeGroupKey !== group.key) throw new Error(`Merge key conflict for ${id}`);
      }
      if (!actualIds.some((id) => {
        const event = snapshot.eventById.get(id);
        return event?.sessions.length && event.offers.length;
      })) throw new Error(`No active future saleable event remains in group page ${expectedPage.slug}`);
    }
    if (cityNames.size !== 1) {
      if (!process.env.REWRITE_DIAGNOSTICS) throw new Error(`City changed within reviewed group ${group.key}`);
      groupIssues.push({ key: group.key, issue: 'city mismatch', cities: [...cityNames] });
    }
    if (group.venuePolicy.type === 'same-title' && (venueTitles.size !== 1 || !venueTitles.has(normalizeText(group.venuePolicy.expectedTitle)))) {
      if (!process.env.REWRITE_DIAGNOSTICS) throw new Error(`Venue title mismatch in ${group.key}`);
      groupIssues.push({ key: group.key, issue: 'venue title mismatch', venueTitles: [...venueTitles], expected: group.venuePolicy.expectedTitle });
    }
    if (group.venuePolicy.type === 'same-title' && addresses.size !== 1) {
      if (!process.env.REWRITE_DIAGNOSTICS) throw new Error(`Address mismatch in ${group.key}`);
      groupIssues.push({ key: group.key, issue: 'address mismatch', addresses: [...addresses] });
    }
    if (group.venuePolicy.type === 'explicit-aliases') {
      const allowed = new Set(group.venuePolicy.allowedNames.map(normalizeText));
      if ([...venueTitles].some((name) => !allowed.has(name))) {
        if (!process.env.REWRITE_DIAGNOSTICS) throw new Error(`Venue alias mismatch in ${group.key}`);
        groupIssues.push({ key: group.key, issue: 'venue alias mismatch', venueTitles: [...venueTitles] });
      }
      if ([...addresses].some((address) => !address.includes(normalizeText(group.venuePolicy.requiredPostalCode)))) {
        if (!process.env.REWRITE_DIAGNOSTICS) throw new Error(`Address postal code mismatch in ${group.key}`);
        groupIssues.push({ key: group.key, issue: 'address postal code mismatch', addresses: [...addresses] });
      }
    }
    if (new Set(groupEventIds).size !== groupEventIds.length) {
      if (!process.env.REWRITE_DIAGNOSTICS) throw new Error(`Duplicate Event IDs in ${group.key}`);
      groupIssues.push({ key: group.key, issue: 'duplicate event ids' });
    }
  }
  const madamSpPrimary = snapshot.pageById.get(madamSpPrimaryPageId);
  const madamSpSecondary = snapshot.pageById.get(madamSpSecondaryPageId);
  const madamSpPrimaryIds = madamSpPrimary?.links.map((link) => link.eventId).sort() || [];
  const madamSpSecondaryIds = madamSpSecondary?.links.map((link) => link.eventId).sort() || [];
  const expectedMadamSpPrimary = [...madamSpWinterEventIds.filter((id) => !madamSpSecondaryIds.includes(id)), ...madamSpGenericEventIds].sort();
  const expectedMadamSpSecondary = madamSpWinterEventIds.filter((id) => madamSpSecondaryIds.includes(id)).sort();
  if (process.env.REWRITE_DIAGNOSTICS) {
    console.log(JSON.stringify({ changedPageConnections: changedConnections, groupIssues,
      madamMixedPage: { pageId: eventPageIdForMadam, actualIds: snapshot.pageById.get(eventPageIdForMadam)?.links.map((link) => link.eventId).sort() },
      madamSpPages: { primaryPageId: madamSpPrimaryPageId, primaryIds: madamSpPrimaryIds, secondaryPageId: madamSpSecondaryPageId, secondaryIds: madamSpSecondaryIds } }, null, 2));
    return;
  }
  const madamPage = snapshot.pageById.get(eventPageIdForMadam);
  const madamIds = madamPage.links.map((link) => link.eventId).sort();
  if (madamPage.links.length !== 10 || madamJazzEventIds.some((id) => !madamIds.includes(id)) || madamWinterEventIds.some((id) => !madamIds.includes(id)) || madamPage.status !== 'DRAFT' || madamPage.isIndexable !== false) throw new Error('Madam Bum mixed page no longer matches the reviewed 10-event split');
  for (const tour of groupTourAssignments) for (const id of tour.pageIds) {
    const page = snapshot.pageById.get(id);
    if (!page) throw new Error(`Tour EventPage is missing: ${id}`);
    if (page.tourGroupId) throw new Error(`Tour page already belongs to a group; review before reassignment: ${page.slug}`);
  }
  if (!madamSpPrimary || !madamSpSecondary || madamSpPrimary.status !== 'DRAFT' || madamSpSecondary.status !== 'DRAFT' ||
      madamSpPrimary.isIndexable !== false || madamSpSecondary.isIndexable !== false ||
      madamSpPrimaryIds.length !== 13 || madamSpSecondaryIds.length !== 3 ||
      !madamSpGenericEventIds.every((id) => madamSpPrimaryIds.includes(id)) ||
      !madamSpWinterEventIds.every((id) => [...madamSpPrimaryIds, ...madamSpSecondaryIds].includes(id)) ||
      new Set([...madamSpGenericEventIds, ...madamSpWinterEventIds]).size !== 16) {
    throw new Error('Madam Bum St Petersburg program partition no longer matches the reviewed 16-event set');
  }
}

try {
  const snapshot = await getLiveSnapshot();
  validateSnapshot(snapshot);
  if (process.env.REWRITE_DIAGNOSTICS) { await db.close(); process.exit(0); }
  const backup = {
    generatedAt: new Date().toISOString(), database: 'daibilet', checkedAt: snapshot.checkedAt,
    selectedPageCount: selectionRows.length, affectedPageCount: affectedPageIds.length,
    pages: [...snapshot.pageById.values()], events: [...snapshot.eventById.values()],
    intendedMergeManifest: manifest, intendedSplit: { pageId: eventPageIdForMadam, winterEventIds: madamWinterEventIds, jazzEventIds: madamJazzEventIds },
  };
  if (!apply) {
    fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
    const mergedTargets = new Set(manifest.groups.map((group) => group.targetPageId));
    const textsWithMerges = [...rewriteByMaster.keys()].length;
    process.stdout.write(JSON.stringify({ mode: 'preflight', database: 'daibilet', pagesBackedUp: backup.pages.length,
      sourceEventsBackedUp: backup.events.length, selectedRewrites: 150, sameCityGroups: manifest.groups.length,
      sameCitySourcePages: 90, uniqueMasterTexts: textsWithMerges, sourceArchive: 'newyear-eventpage-source-archive-final-2026-11-24.json',
      madamBum: { pageId: eventPageIdForMadam, winterSlots: madamWinterEventIds.length, jazzBuntSlots: madamJazzEventIds.length },
      backupPath, allPageIdsMatch: true, allPagesDraftNoindex: true, activeSlotsAndOffersPresent: true }, null, 2));
  } else {
    if (!fs.existsSync(backupPath)) throw new Error('Verified production backup file is required before --apply');
    const approvedBackup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    if (approvedBackup.database !== 'daibilet' || approvedBackup.pages.length !== affectedPageIds.length || approvedBackup.events.length !== snapshot.eventById.size) throw new Error('Production backup does not match current affected page/event set');
    const byCityTimeZone = new Map();
    const liveAudit = JSON.parse(fs.readFileSync(path.join(editorialDir, 'newyear-eventpage-selection-150-live-audit-2026-11-24.json'), 'utf8'));
    for (const row of selectionRows) {
      const livePage = liveAudit.pages.find((page) => page.eventPageId === row.eventPageId);
      const timezone = livePage?.events?.find((event) => event.cityTimeZone)?.cityTimeZone;
      if (timezone) byCityTimeZone.set(row.city, timezone);
    }
    const defaultZone = 'Europe/Moscow';
    const getTimeZone = (city) => byCityTimeZone.get(city) || defaultZone;
    const workDb = { query: (sql, params) => db.query(sql, params), transaction: (callback) => db.transaction(callback) };
    const result = { appliedAt: new Date().toISOString(), database: 'daibilet', sourceArchive: 'newyear-eventpage-source-archive-final-2026-11-24.json', merges: [], split: null, pages: [], tours: [] };
    await db.transaction(async ({ query }) => {
      const txDb = { query, transaction: (callback) => callback({ query }) };
      for (const group of manifest.groups) {
        if (group.key === madamSpPartitionGroupKey) continue;
        const pageIds = [group.targetPageId, ...group.sourcePageIds].sort();
        const expectedEvents = group.pages.flatMap((page) => page.eventIds).sort();
        const groupEvents = expectedEvents.map((id) => snapshot.eventById.get(id));
        const review = {
          reviewed: true, targetPageId: group.targetPageId, mergeGroupKey: group.key,
          rationale: `Редакционно сверенная серия для ${group.city}: ${group.evidence}`,
          pageIds, eventIds: expectedEvents, cityId: groupEvents[0].cityId, cityName: group.city,
          venueIds: [...new Set(groupEvents.map((event) => String(event.venueId)))], venuePolicy: group.venuePolicy,
        };
        const merged = await helpers.mergeAdminEventPages(txDb, group.targetPageId, group.sourcePageIds, group.key, null, review);
        if (!merged || merged.movedEventCount !== expectedEvents.length - group.pages.find((page) => page.id === group.targetPageId).eventIds.length) throw new Error(`Merge result mismatch: ${group.key}`);
        result.merges.push({ groupKey: group.key, targetPageId: group.targetPageId, sourcePageIds: group.sourcePageIds, movedEventCount: merged.movedEventCount, retainedRouteCount: merged.retainedRouteCount });
      }
      for (const eventId of madamSpGenericEventIds) await helpers.moveAdminEventPageEvent(txDb, madamSpSecondaryPageId, eventId);
      for (const eventId of madamSpWinterEventIds.filter((id) => !snapshot.pageById.get(madamSpPrimaryPageId).links.some((link) => link.eventId === id))) {
        await helpers.moveAdminEventPageEvent(txDb, madamSpPrimaryPageId, eventId);
      }
      const madamSpPrimaryAfter = await helpers.getAdminEventPage(txDb, madamSpPrimaryPageId);
      const madamSpSecondaryAfter = await helpers.getAdminEventPage(txDb, madamSpSecondaryPageId);
      if (madamSpPrimaryAfter.events.length !== 12 || madamSpSecondaryAfter.events.length !== 4 ||
          !madamSpWinterEventIds.every((id) => madamSpPrimaryAfter.events.some((event) => event.eventId === id || event.id === id)) ||
          !madamSpGenericEventIds.every((id) => madamSpSecondaryAfter.events.some((event) => event.eventId === id || event.id === id))) {
        throw new Error('Madam Bum St Petersburg program split failed membership verification');
      }
      result.programPartitions = [{ city: 'Санкт-Петербург', primaryPageId: madamSpPrimaryPageId, winterEventIds: madamSpWinterEventIds,
        separateProgramPageId: madamSpSecondaryPageId, genericCabaretEventIds: madamSpGenericEventIds }];
      const separated = await helpers.splitAdminEventPageEvent(txDb, eventPageIdForMadam, madamWinterEventIds[0]);
      if (!separated?.separated?.id) throw new Error('Could not split the Winter Chic page from the mixed Madame Bum page');
      const winterPageId = separated.separated.id;
      for (const eventId of madamWinterEventIds.slice(1)) await helpers.moveAdminEventPageEvent(txDb, winterPageId, eventId);
      const sourceAfterSplit = await helpers.getAdminEventPage(txDb, eventPageIdForMadam);
      const winterAfterSplit = await helpers.getAdminEventPage(txDb, winterPageId);
      if (sourceAfterSplit.events.length !== madamJazzEventIds.length || winterAfterSplit.events.length !== madamWinterEventIds.length) throw new Error('Madam Bum split did not produce exact program membership');
      result.split = { originalPageId: eventPageIdForMadam, originalSlug: sourceAfterSplit.slug, jazzEventIds: madamJazzEventIds, winterPageId, winterSlug: winterAfterSplit.slug, winterEventIds: madamWinterEventIds };
      const pageRewriteById = new Map();
      for (const [masterId, rewrite] of rewriteByMaster) {
        pageRewriteById.set(masterId === eventPageIdForMadam ? winterPageId : masterId, { rewrite, customTitle: masterId === eventPageIdForMadam ? 'Кабаре «Мадам Бум»: «Зимний шик»' : null });
      }
      pageRewriteById.set(madamSpSecondaryPageId, { rewrite: madamSpGenericText, customTitle: madamSpGenericText.title, fixedEventIds: madamSpGenericEventIds });
      const jazzSection = { rewrite: madamJazzText, customTitle: madamJazzText.title, fixedEventIds: madamJazzEventIds };
      pageRewriteById.set(eventPageIdForMadam, jazzSection);
      for (const [pageId, entry] of pageRewriteById) {
        const livePage = await helpers.getAdminEventPage(txDb, pageId);
        if (!livePage || livePage.status !== 'DRAFT' || livePage.isIndexable !== false || livePage.publishedAt) throw new Error(`Page is not an unpublished draft before rewrite: ${livePage?.slug || pageId}`);
        const sourceRow = entry.rewrite.eventPageId ? entry.rewrite : null;
        const linkedEvents = (livePage.events || []).map((event) => snapshot.eventById.get(event.id) || snapshot.eventById.get(event.eventId)).filter(Boolean);
        const selected = sourceRow || (pageId === winterPageId ? rewriteByMaster.get(eventPageIdForMadam) : null);
        const body = selected ? selected.body : entry.rewrite.body;
        const rewrite = selected ? selected : entry.rewrite;
        const contentData = contentFor({ ...rewrite, body, practical: entry.fixedEventIds ? entry.rewrite.practical : rewrite.practical }, linkedEvents, getTimeZone(rewrite.city || linkedEvents[0]?.city), linkedEvents.map((event) => event.id), entry.customTitle);
        const seoH1 = entry.customTitle || livePage.seoH1 || livePage.title;
        const seoCity = rewrite.city || linkedEvents[0]?.city || '';
        const seoTitle = entry.customTitle ? `${entry.customTitle}${seoCity ? ` в ${seoCity}` : ''} | Дайбилет` : livePage.seoTitle || `${livePage.title} | Дайбилет`;
        const updated = await helpers.updateAdminEventPage(txDb, pageId, {
          slug: livePage.slug, title: contentData.title, summary: contentData.summary, heroImageUrl: livePage.heroImageUrl,
          content: contentData.content, seoH1, seoTitle, seoDescription: livePage.seoDescription,
          canonicalPath: `/events/${livePage.slug}`, status: 'READY', isIndexable: true,
          changeNote: `Новогодний редакционный рерайт (24.11.2026); исходник сохранён в архиве, EventPage опубликована и открыта к индексации`,
        });
        const published = await helpers.publishAdminEventPage(txDb, pageId);
        if (!updated || !published || published.status !== 'READY' || published.isIndexable !== true || !published.publishedAt) throw new Error(`Publish verification failed: ${livePage.slug}`);
        result.pages.push({ eventPageId: pageId, slug: published.slug, title: published.title, status: published.status,
          isIndexable: published.isIndexable, publishedAt: published.publishedAt, eventIds: (published.events || []).map((event) => event.eventId || event.id),
          summary: published.summary, revisionCount: published.revisions?.length ?? null, activeRewriteVersion: version });
      }
      for (const tour of groupTourAssignments) {
        const existing = await query('SELECT id FROM "EventTourGroup" WHERE title = $1', [tour.title]);
        const group = existing.rows[0] || await helpers.createAdminEventTourGroup(txDb, { title: tour.title });
        for (const id of tour.pageIds) await helpers.assignAdminEventPageTourGroup(txDb, id, group.id);
        result.tours.push({ id: group.id, title: tour.title, pageIds: tour.pageIds });
      }
    });
    result.complete = true;
    result.counts = { selectedInputs: 150, uniqueSelectedTexts: 148, additionalProgramSplitRewrite: 2, publishedRewrites: result.pages.length, mergedGroups: result.merges.length,
      sourcePagesConsolidated: result.merges.reduce((sum, merge) => sum + merge.sourcePageIds.length, 0), tourGroups: result.tours.length };
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    process.stdout.write(JSON.stringify({ complete: true, resultPath, counts: result.counts, newWinterPage: result.split.winterSlug }, null, 2));
  }
} finally {
  await db.close();
}
