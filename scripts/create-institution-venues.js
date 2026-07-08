/**
 * Создать institution-площадки и перепривязать квесты с meeting point.
 *
 *   node scripts/create-institution-venues.js --dry-run
 *   node scripts/create-institution-venues.js
 *   node scripts/create-institution-venues.js --relink-only
 *   node scripts/create-institution-venues.js --publish
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const {
  resolveContextInstitutionFromTitle,
  shouldResolveInstitutionFromTitle,
  matchInstitutionHint,
} = require('../apps/backend/src/event-venue-context.js');

const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');
const relinkOnly = process.argv.includes('--relink-only');
const publishOnly = process.argv.includes('--publish');

const SPB_CLUSTER = new Set([
  'Санкт-Петербург',
  'Пушкин',
  'Петергоф',
  'Павловск',
  'Петродворец',
  'Гатчина',
  'Стрельна',
  'Кронштадт',
]);

const INSTITUTIONS = [
  {
    key: 'moscow-zoo',
    title: 'Московский зоопарк',
    city: 'Москва',
    address: 'ул. Большая Грузинская, 1',
    kind: 'MUSEUM_ART_SPACE',
    shortDescription:
      'Старейший зоопарк страны в центре Москвы. Более тысячи видов животных, павильоны «Экзотеррариум» и «Птицы», детские площадки и познавательные маршруты.',
    description:
      'Московский зоопарк — одна из главных семейных достопримечательностей столицы у метро «Краснопресненская». На огромной территории представлены редкие виды со всего мира, от панд и тигров до тропических птиц и морских обитателей. Площадка подходит для самостоятельных прогулок, квестов и экскурсий без гида.',
    match: [/зоопарк/i],
    renameMeetingPointIds: ['venue_6a3d42e95fefd934e2f247b7'],
  },
  {
    key: 'new-tretyakov',
    title: 'Новая Третьяковская галерея',
    city: 'Москва',
    address: 'Крымский Вал, 10',
    kind: 'MUSEUM_ART_SPACE',
    shortDescription:
      'Главный музей русского авангарда и искусства XX–XXI веков на Крымском Валу. Крупные выставки, медиаинсталляции и квесты по залам.',
    description:
      'Новая Третьяковская галерея — флагманский музей современного и авангардного искусства России. В здании на Крымском Валу собраны работы Малевича, Кандинского, Шагала и других мастеров. Площадка популярна для квестов, аудиогидов и самостоятельных маршрутов по постоянной и временной экспозиции.',
    match: [/нов[^\s]*\s+третьяков/i],
    renameMeetingPointIds: ['venue_6a1fd40343c52b894c9c5d53'],
  },
  {
    key: 'tretyakov-lavrushinsky',
    title: 'Третьяковская галерея',
    city: 'Москва',
    address: 'Лаврушинский переулок, 10',
    kind: 'MUSEUM_ART_SPACE',
    shortDescription:
      'Главное здание Третьяковской галереи в Замоскворечье. Классическая русская живопись от икон до передвижников.',
    description:
      'Третьяковская галерея в историческом здании на Лаврушинском переулке — культовый музей русского искусства. Здесь представлены шедевры Репина, Васнецова, Серова и других художников. Площадка используется для квестов, экскурсий и самостоятельных визитов.',
    match: [/третьяковск[^\s]*\s+галере/i, /лаврушинск/i],
    promoteVenueIds: ['venue_6a1fd5158bd71b8ae77e127c'],
  },
  {
    key: 'pushkin-museum',
    title: 'ГМИИ им. Пушкина',
    city: 'Москва',
    address: 'ул. Волхонка, 12',
    kind: 'MUSEUM_ART_SPACE',
    existingVenueId: 'venue_672f34b6ebf4808956f1474a',
    match: [/пушкинск[^\s]*\s+музе/i, /гмии/i],
  },
  {
    key: 'hermitage',
    title: 'Государственный Эрмитаж',
    city: 'Санкт-Петербург',
    address: 'Дворцовая площадь, 2',
    kind: 'MUSEUM_ART_SPACE',
    existingVenueId: 'venue_5c9b99e362f03f000c48bd3d',
    shortDescription:
      'Один из крупнейших художественных музеев мира в Зимнем дворце. Античность, европейская живопись, парадные залы.',
    description:
      'Государственный Эрмитаж — главный музей Санкт-Петербурга и символ Дворцовой площади. Коллекция охватывает мировое искусство от древности до новейшего времени. Площадка подходит для квестов, тематических маршрутов и самостоятельных визитов.',
    match: [/эрмитаж/i],
  },
  {
    key: 'kremlin',
    title: 'Московский Кремль',
    city: 'Москва',
    address: 'Кремль, Москва',
    kind: 'ATTRACTION',
    shortDescription:
      'Историко-архитектурный ансамбль в центре Москвы. Соборы, музеи, Оружейная палата и алмазный фонд.',
    description:
      'Московский Кремль — главная достопримечательность столицы и объект Всемирного наследия ЮНЕСКО. На территории расположены соборы, музеи, смотровые площадки и экспозиции. Площадка часто фигурирует в экскурсиях и квестах по центру Москвы.',
    match: [/кремл/i],
  },
  {
    key: 'vdnh',
    title: 'ВДНХ',
    city: 'Москва',
    address: 'проспект Мира, 119',
    kind: 'ATTRACTION',
    shortDescription:
      'Крупнейший выставочный и культурный комплекс Москвы. Павильоны, фонтаны, парки и музеи на открытом воздухе.',
    description:
      'ВДНХ — масштабный культурно-выставочный центр на севере Москвы. Здесь проходят выставки, фестивали, квесты и семейные мероприятия среди исторических павильонов и парковых зон.',
    match: [/вднх/i],
  },
  {
    key: 'isaac-cathedral',
    title: 'Исаакиевский собор',
    city: 'Санкт-Петербург',
    address: 'Исаакиевская площадь, 4',
    kind: 'ATTRACTION',
    shortDescription:
      'Главный собор Санкт-Петербурга и одна из крупнейших православных церквей мира. Панорама с колоннады, мозаики и монументальная архитектура Монферрана.',
    description:
      'Исаакиевский собор — визитная карточка Санкт-Петербурга на Исаакиевской площади. В интерьере — мозаики, малахит и лазурит; с колоннады открывается панорама центра города. Площадка часто фигурирует в обзорных экскурсиях и квестах по историческому центру.',
    match: [/исаакиевск/i],
  },
  {
    key: 'peter-paul-fortress',
    title: 'Петропавловская крепость',
    city: 'Санкт-Петербург',
    address: 'Заячий остров',
    kind: 'MUSEUM_ART_SPACE',
    shortDescription:
      'Колыбель Петербурга на Заячьем острове. Петропавловский собор, музеи, бастионы и виды на Неву и Дворцовую набережную.',
    description:
      'Петропавловская крепость — историческое ядро Санкт-Петербурга на Заячьем острове. Здесь находятся Петропавловский собор, музейные экспозиции и прогулочные маршруты по крепостным стенам. Площадка популярна для экскурсий и квестов по Северной столице.',
    match: [/петропавловск/i],
    promoteVenueIds: ['venue_69e9bfc4ad9392868aa5ff62'],
  },
  {
    key: 'peterhof',
    title: 'Петергоф',
    city: 'Санкт-Петербург',
    address: 'Петергоф, Разводная ул., 2',
    kind: 'ATTRACTION',
    shortDescription:
      'Дворцово-парковый ансамбль на берегу Финского залива. Большой дворец, фонтаны и Нижний парк — символ пригородов Петербурга.',
    description:
      'Петергоф — знаменитый дворцово-парковый ансамбль в пригороде Санкт-Петербурга. Большой Петергофский дворец, каскады и фонтаны Нижнего парка привлекают туристов круглый год. Площадка используется в экскурсиях и тематических маршрутах.',
    match: [/петергоф/i, /петергофск/i],
    promoteVenueIds: ['venue_68c6ae79d5b98d58ded70411'],
  },
  {
    key: 'russian-museum',
    title: 'Русский музей',
    city: 'Санкт-Петербург',
    address: 'Инженерная ул., 4',
    kind: 'MUSEUM_ART_SPACE',
    shortDescription:
      'Крупнейший музей русского искусства в Михайловском дворце. Постоянная коллекция и выставки от иконописи до авангарда.',
    description:
      'Государственный Русский музей — главный музей русского изобразительного искусства в Санкт-Петербурге. Экспозиции размещены в Михайловском дворце и филиалах; собрание охватывает все эпохи от древней иконы до современности.',
    match: [/русск[^\s]*\s+музе/i, /михайловск[^\s]*\s+дворец/i, /михайловск[^\s]*\s+замок/i],
  },
  {
    key: 'yusupov-palace',
    title: 'Юсуповский дворец',
    city: 'Санкт-Петербург',
    address: 'Наб. реки Мойки, 94',
    kind: 'MUSEUM_ART_SPACE',
    shortDescription:
      'Роскошный дворец на Мойке с парадными залами и легендарной историей. Один из самых известных особняков имперского Петербурга.',
    description:
      'Юсуповский дворец на набережной Мойки — архитектурный шедевр и музей с парадными интерьерами. Площадка известна экскурсиями по залам дворца и тематическими квестами в историческом центре.',
    match: [/юсуповск/i],
  },
  {
    key: 'mariinsky',
    title: 'Мариинский театр',
    city: 'Санкт-Петербург',
    address: 'Театральная площадь, 1',
    kind: 'THEATER',
    shortDescription:
      'Легендарный оперный и балетный театр России. Классическая сцена и современная сцена-2 на Красной площади.',
    description:
      'Мариинский театр — один из главных театров мира и символ культурной жизни Санкт-Петербурга. На афише — опера, балет и концерты; площадка привлекает гостей города к вечерним программам.',
    match: [/мариинск/i],
  },
  {
    key: 'church-on-blood',
    title: 'Спас на Крови',
    city: 'Санкт-Петербург',
    address: 'наб. канала Грибоедова, 2б',
    kind: 'ATTRACTION',
    shortDescription:
      'Храм Воскресения Христова с мозаичными фасадами на канале Грибоедова. Один из самых узнаваемых символов Петербурга.',
    description:
      'Собор Воскресения Христова (Спас на Крови) — знаменитый храм с яркими мозаиками на набережной канала Грибоедова. Площадка входит в обзорные маршруты и квесты по центру Санкт-Петербурга.',
    match: [/спас[^\s]*\s+на\s+кров/i, /воскресен[^\s]*\s+христов/i],
  },
  {
    key: 'kunstkamera',
    title: 'Кунсткамера',
    city: 'Санкт-Петербург',
    address: 'Университетская наб., 3',
    kind: 'MUSEUM_ART_SPACE',
    shortDescription:
      'Первый публичный музей России на Васильевском острове. Антропология, этнография и культовая коллекция Петра I.',
    description:
      'Кунсткамера — старейший музей России на Университетской набережной. Экспозиция посвящена этнографии, антропологии и истории науки; здание — часть ансамбля Академии наук.',
    match: [/кунсткамер/i],
  },
  {
    key: 'kazan-cathedral-spb',
    title: 'Казанский собор',
    city: 'Санкт-Петербург',
    address: 'Невский проспект, 25',
    kind: 'ATTRACTION',
    shortDescription:
      'Кафедральный собор на Невском проспекте с колоннадой. Один из главных храмов и архитектурных доминант центра города.',
    description:
      'Казанский собор на Невском проспекте — культовый памятник архитектуры классицизма. Колоннада, икона Казанской Божией Матери и центральное расположение делают площадку популярной в экскурсиях по Петербургу.',
    match: [/казанск[^\s]*\s+собор/i],
  },
  {
    key: 'catherine-palace',
    title: 'Екатерининский дворец',
    city: 'Пушкин',
    address: 'Садовая ул., 7, Пушкин',
    kind: 'ATTRACTION',
    shortDescription:
      'Резиденция российских императоров в Царском Селе. Янтарная комната, парадные залы и парк.',
    description:
      'Екатерининский дворец в Пушкине (Царское Село) — один из главных дворцовых комплексов пригородов Санкт-Петербурга. Знаменит Янтарной комнатой, парадными интерьерами и парком.',
    match: [/екатерининск/i, /царск[^\s]*\s+сел/i, /янтарн[^\s]*\s+комнат/i],
  },
  {
    key: 'pavlovsk-palace',
    title: 'Павловский дворец',
    city: 'Санкт-Петербург',
    address: 'Павловск, дворцовая площадь',
    kind: 'ATTRACTION',
    shortDescription:
      'Императорская резиденция в Павловске с одним из лучших ландшафтных парков России.',
    description:
      'Павловский дворец и парк — дворцово-парковый ансамбль в городе Павловск. Классические интерьеры и прогулочные маршруты по парку делают площадку популярной для экскурсий из Санкт-Петербурга.',
    match: [/павловск[^\s]*\s+дворец/i, /в\s+павловск/i, /город[^\s]*\s+павловск/i],
  },
];

function loadEnv() {
  for (const name of ['.env', 'apps/backend/.env']) {
    const filePath = path.join(rootDir, name);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function slugify(input) {
  return String(input || 'item')
    .toLowerCase()
    .replace(/ё/g, 'e')
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function venueIdFromKey(key) {
  const hash = crypto.createHash('sha1').update(`institution:${key}`).digest('hex').slice(0, 24);
  return `venue_inst_${hash}`;
}

async function findCityId(client, cityName) {
  const { rows } = await client.query(
    `select id from "City" where lower(trim(title)) = lower(trim($1)) limit 1`,
    [cityName],
  );
  return rows[0]?.id || null;
}

async function findExistingInstitution(client, cityId, spec) {
  if (spec.existingVenueId) {
    const { rows } = await client.query(`select id, title, slug, kind, address from "Venue" where id = $1`, [
      spec.existingVenueId,
    ]);
    if (rows[0]) return rows[0];
  }

  // Сначала явные ID для promote — иначе regex может найти другую площадку (напр. Новая Третьяковка).
  for (const venueId of spec.promoteVenueIds || []) {
    const { rows } = await client.query(`select id, title, slug, kind, address from "Venue" where id = $1`, [venueId]);
    if (rows[0]) return rows[0];
  }

  for (const pattern of spec.match || []) {
    const { rows } = await client.query(
      `
        select id, title, slug, kind, address
        from "Venue"
        where "cityId" = $1
          and kind in ('MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'ATTRACTION', 'OTHER')
          and coalesce("pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
          and title ~* $2
        order by length(title)
        limit 5
      `,
      [cityId, pattern.source],
    );
    const hit = rows.find((row) => !/сектор|причал|метро|памятник/i.test(row.title));
    if (hit) return hit;
  }

  return null;
}

function citiesCompatible(specCity, eventCity) {
  if (!specCity || !eventCity) return true;
  if (specCity === eventCity) return true;
  if (SPB_CLUSTER.has(specCity) && SPB_CLUSTER.has(eventCity)) return true;
  return false;
}

function specMatchesTitle(spec, title) {
  return (spec.match || []).some((pattern) => pattern.test(title));
}

function resolveRelinkTarget(event, institutionMap) {
  for (const spec of INSTITUTIONS) {
    const mapped = institutionMap.get(spec.key);
    if (!mapped) continue;
    if (!citiesCompatible(spec.city, event.city)) continue;
    if (specMatchesTitle(spec, event.title)) return { target: mapped, spec };
  }

  if (!shouldResolveInstitutionFromTitle({ venueKind: event.venue_kind, venue: event.venue })) {
    return null;
  }

  const context = resolveContextInstitutionFromTitle(event.title);
  if (!context) return null;

  const hint = matchInstitutionHint(context.phrase);
  for (const spec of INSTITUTIONS) {
    const mapped = institutionMap.get(spec.key);
    if (!mapped) continue;
    if (!citiesCompatible(spec.city, event.city)) continue;
    if (hint && spec.match.some((pattern) => pattern.test(hint.display) || pattern.test(context.phrase))) {
      return { target: mapped, spec };
    }
    if (spec.match.some((pattern) => pattern.test(context.phrase) || pattern.test(context.displayName))) {
      return { target: mapped, spec };
    }
  }

  return null;
}

async function resolveInstitutionRecord(client, spec) {
  const cityId = await findCityId(client, spec.city);
  let venue = cityId ? await findExistingInstitution(client, cityId, spec) : null;
  if (!venue) {
    const id = venueIdFromKey(spec.key);
    const { rows } = await client.query(
      `select id, title, slug, kind, address from "Venue" where id = $1`,
      [id],
    );
    venue = rows[0] || null;
  }
  return venue ? { ...venue, city: spec.city, cityId } : null;
}

async function publishInstitutions(client, institutionMap) {
  const ids = [...institutionMap.values()].map((venue) => venue.id).filter(Boolean);
  if (!ids.length) return { published: 0 };

  if (dryRun) {
    console.log(`→ publish ${ids.length} institutions`);
    return { published: ids.length, ids };
  }

  const result = await client.query(
    `
      update "Venue"
      set
        "pageStatus" = 'PUBLISHED',
        "isIndexable" = true,
        kind = case
          when id = 'venue_5c9b99e362f03f000c48bd3d' then 'MUSEUM_ART_SPACE'::"VenueKind"
          else kind
        end,
        "updatedAt" = now()
      where id = any($1::text[])
        and coalesce("pageStatus"::text, 'NONE') in ('CANDIDATE', 'NONE')
      returning id, title
    `,
    [ids],
  );
  console.log(`→ published ${result.rowCount} institutions`);
  return { published: result.rowCount, rows: result.rows };
}

async function upsertInstitution(client, spec) {
  const cityId = await findCityId(client, spec.city);
  if (!cityId) throw new Error(`City not found: ${spec.city}`);

  let venue = await findExistingInstitution(client, cityId, spec);
  const id = venue?.id || venueIdFromKey(spec.key);
  const slug = venue?.slug || `${slugify(spec.title)}-${id.slice(-12)}`;

  if (venue && spec.promoteVenueIds?.includes(venue.id)) {
    if (dryRun) {
      console.log(`→ promote ${venue.title} → ${spec.title}`);
      return { ...venue, title: spec.title, address: spec.address || venue.address, kind: spec.kind };
    }
    await client.query(
      `
        update "Venue"
        set
          title = $2,
          address = coalesce($3, address),
          kind = $4,
          "shortDescription" = coalesce($5, "shortDescription"),
          description = coalesce($6, description),
          "seoDescription" = coalesce($7, "seoDescription"),
          "pageStatus" = case when "pageStatus" = 'HIDDEN' then 'CANDIDATE' else coalesce("pageStatus", 'CANDIDATE') end,
          "updatedAt" = now()
        where id = $1
      `,
      [venue.id, spec.title, spec.address, spec.kind, spec.shortDescription || null, spec.description || null, spec.shortDescription || null],
    );
    venue = { ...venue, title: spec.title, address: spec.address || venue.address, kind: spec.kind };
    console.log(`→ promoted ${venue.id}: ${spec.title}`);
    return venue;
  }

  if (venue) {
    console.log(`= exists ${venue.id}: ${venue.title}`);
    return venue;
  }

  if (dryRun) {
    console.log(`+ create ${id}: ${spec.title} (${spec.city})`);
    return { id, title: spec.title, slug, kind: spec.kind, address: spec.address, cityId };
  }

  await client.query(
    `
      insert into "Venue" (
        id, slug, title, description, "shortDescription", "seoDescription",
        "cityId", address, kind, "pageStatus", "createdAt", "updatedAt"
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CANDIDATE', now(), now())
      on conflict (id) do update set
        title = excluded.title,
        address = excluded.address,
        kind = excluded.kind,
        description = excluded.description,
        "shortDescription" = excluded."shortDescription",
        "seoDescription" = excluded."seoDescription",
        "updatedAt" = now()
    `,
    [
      id,
      slug,
      spec.title,
      spec.description || null,
      spec.shortDescription || null,
      spec.shortDescription || null,
      cityId,
      spec.address || null,
      spec.kind,
    ],
  );

  const created = { id, title: spec.title, slug, kind: spec.kind, address: spec.address, cityId };
  console.log(`+ created ${id}: ${spec.title}`);
  return created;
}

async function hideMeetingPoints(client, venueIds) {
  if (!venueIds.length) return;
  if (dryRun) {
    console.log(`  hide meeting points: ${venueIds.join(', ')}`);
    return;
  }
  await client.query(
    `
      update "Venue"
      set "pageStatus" = 'HIDDEN', "updatedAt" = now()
      where id = any($1::text[])
    `,
    [venueIds],
  );
}

async function relinkEvents(client, institutionMap) {
  const { rows: events } = await client.query(`
    select
      e.id,
      e.title,
      e."primaryCityId" as city_id,
      c.title as city,
      v.id as venue_id,
      v.title as venue,
      v.kind as venue_kind,
      v.address as venue_address
    from "Event" e
    join "Venue" v on v.id = e."venueId"
    left join "City" c on c.id = e."primaryCityId"
    where v.kind = 'MEETING_POINT'
       or v.title ~* '(ул\\.|улиц|пр\\.|просп|наб\\.|пер\\.|д\\.|метро|у выхода|точка сбора)'
  `);

  let relinked = 0;
  let skipped = 0;
  const byInstitution = new Map();

  for (const event of events) {
    const resolved = resolveRelinkTarget(event, institutionMap);
    const target = resolved?.target;
    if (!target || target.id === event.venue_id) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      relinked += 1;
      byInstitution.set(target.title, (byInstitution.get(target.title) || 0) + 1);
      continue;
    }

    await client.query(
      `
        update "Event"
        set "venueId" = $2, "updatedAt" = now()
        where id = $1
      `,
      [event.id, target.id],
    );
    relinked += 1;
    byInstitution.set(target.title, (byInstitution.get(target.title) || 0) + 1);
  }

  return { relinked, skipped, byInstitution: [...byInstitution.entries()].sort((a, b) => b[1] - a[1]) };
}

async function main() {
  loadEnv();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  const client = await pool.connect();

  try {
    await client.query('begin');
    const institutionMap = new Map();

    if (!relinkOnly && !publishOnly) {
      for (const spec of INSTITUTIONS) {
        const venue = await upsertInstitution(client, spec);
        institutionMap.set(spec.key, venue);
        const hideIds = spec.renameMeetingPointIds || [];
        await hideMeetingPoints(client, hideIds);
      }
    } else {
      for (const spec of INSTITUTIONS) {
        const venue = await resolveInstitutionRecord(client, spec);
        if (venue) institutionMap.set(spec.key, venue);
      }
    }

    const relinkStats = publishOnly ? { relinked: 0, skipped: 0, byInstitution: [] } : await relinkEvents(client, institutionMap);
    const publishStats = !dryRun ? await publishInstitutions(client, institutionMap) : { published: 0 };

    console.log(
      JSON.stringify(
        { dryRun, relinkOnly, publishOnly, relinkStats, publishStats, institutions: [...institutionMap.values()] },
        null,
        2,
      ),
    );

    if (dryRun) await client.query('rollback');
    else await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
