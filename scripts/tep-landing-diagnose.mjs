import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const events = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'teplohod', 'fixtures', 'events-compact.json'), 'utf8'));
const MIN_PRICE = 100;

const RULES = {
  'river-cruises': {
    tags: ['Водные экскурсии', 'Реки и каналы', 'На теплоходе', 'Водная экскурсия', 'На катере', 'Теплоходные экскурсии'],
    keywords: ['теплоход', 'катер', 'река', 'канал', 'причал'],
    keywordScope: 'content',
    excludeKeywords: ['автобус', 'пешеход', 'парадн', 'двор', 'коммунал', 'мастер-класс', 'квест', 'концерт', 'вечеринк', 'дискотек'],
  },
  'bridges-night': {
    city: 'Санкт-Петербург',
    keywords: ['мост', 'развод', 'ночн', 'нева', 'теплоход', 'катер'],
    requiredAnyKeywords: ['мост', 'развод'],
    keywordScope: 'content',
    excludeKeywords: ['автобус', 'пешеход', 'парадн', 'двор', 'коммунал'],
  },
  'moscow-dinner-boat': {
    city: 'Москва',
    keywords: ['ужин', 'обед', 'ланч', 'бранч', 'завтрак', 'фуршет', 'банкет', 'ресторан', 'теплоход', 'москва-река', 'речн', 'корабл', 'яхт', 'судн'],
    requiredTitleKeywordGroups: [['ужин', 'обед', 'ланч', 'бранч', 'завтрак', 'фуршет', 'банкет', 'ресторан']],
    requiredKeywordGroups: [['теплоход', 'москва-река', 'речн', 'корабл', 'яхт', 'судн']],
    keywordScope: 'content',
    excludeKeywords: ['автобус', 'пешеход', 'мастер-класс'],
  },
};

function cleanTitle(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ');
}

function isBusTourEvent(event) {
  const haystack = [event.title, event.place, stripHtml(event.description), event.category].join(' ').toLowerCase();
  return /автобус|hop[\s-]?on|hop[\s-]?off|двухэтажн|city tour|citysightseeing|сити[\s-]?тур|yutong|mercedes|hyundai|туристическ(?:ий|ого)?\s+транспорт/.test(haystack);
}

function isWaterEvent(event) {
  if (event.category === 'Речные прогулки') return true;
  return /теплоход|катер|яхт|причал|пароход|судно/i.test(String(event.place || ''));
}

function buildTags(event) {
  const features = Array.isArray(event.eventFeatures) ? event.eventFeatures : [];
  const placeTag = event.place ? `${isWaterEvent(event) ? 'Теплоход' : 'Площадка'}: ${cleanTitle(event.place)}` : null;
  return [
    event.category,
    placeTag,
    isBusTourEvent(event) ? 'Автобусные туры' : null,
    event.duration ? `${event.duration} минут` : null,
    ...features.map((feature) => cleanTitle(feature.title)).filter(Boolean),
  ].filter(Boolean);
}

function dbCategory(event) {
  return isBusTourEvent(event) ? 'Экскурсии' : event.category === 'Речные прогулки' ? 'Экскурсии' : event.category;
}

function dbSubcategory(event) {
  if (isBusTourEvent(event)) return 'Автобусные экскурсии';
  if (event.category === 'Речные прогулки') return 'Водные экскурсии';
  return null;
}

function keywordFields(event, tags, scope = 'full') {
  const fields = [
    { field: 'title', text: String(event.title || '').toLowerCase() },
    { field: 'category', text: String(dbCategory(event) || '').toLowerCase() },
    { field: 'sourceCategory', text: String(event.category || '').toLowerCase() },
    { field: 'tag', text: tags.join(' ').toLowerCase() },
  ];
  if (scope !== 'content') {
    fields.push(
      { field: 'venue', text: String(event.place || '').toLowerCase() },
      { field: 'subcategory', text: String(dbSubcategory(event) || '').toLowerCase() },
    );
  }
  return fields.filter((item) => item.text);
}

function firstKeywordMatch(fields, keywords) {
  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase();
    const field = fields.find((item) => item.text.includes(normalized));
    if (field) return { keyword, field: field.field };
  }
  return null;
}

function explainRule(event, rule, tagLimit = Infinity) {
  const tags = buildTags(event).slice(0, tagLimit);
  const keywordFieldsList = keywordFields(event, tags, rule.keywordScope || 'full');
  const fullKeywordFields = keywordFields(event, tags, 'full');
  const blockers = [];

  if (rule.city) {
    const city = String(event.eventPlaces?.[0]?.address || event.place || '').includes('Санкт-Петербург') ? 'Санкт-Петербург' : /моск/i.test(`${event.place || ''}`) ? 'Москва' : null;
    if (city !== rule.city) blockers.push(`город != ${rule.city}`);
  }

  const excludedKeyword = firstKeywordMatch(fullKeywordFields, rule.excludeKeywords || []);
  if (excludedKeyword) blockers.push(`exclude ${excludedKeyword.keyword} (${excludedKeyword.field})`);

  for (const group of rule.requiredTitleKeywordGroups || []) {
    const titleFields = keywordFieldsList.filter((field) => field.field === 'title');
    if (!firstKeywordMatch(titleFields, group)) blockers.push(`нет title: ${group.join('/')}`);
  }

  for (const group of rule.requiredKeywordGroups || []) {
    if (!firstKeywordMatch(keywordFieldsList, group)) blockers.push(`нет group: ${group.join('/')}`);
  }

  if (rule.requiredAnyKeywords?.length && !firstKeywordMatch(keywordFieldsList, rule.requiredAnyKeywords)) {
    blockers.push(`нет any: ${rule.requiredAnyKeywords.join('/')}`);
  }

  if (blockers.length) return { matches: false, blockers, tagsUsed: tags.length };

  const tagSignal = (rule.tags || []).find((tag) => tags.includes(tag));
  if (tagSignal) return { matches: true, reason: `tag ${tagSignal}`, tagsUsed: tags.length };

  const keywordSignal = firstKeywordMatch(keywordFieldsList, rule.keywords || []);
  if (keywordSignal) return { matches: true, reason: `${keywordSignal.keyword} in ${keywordSignal.field}`, tagsUsed: tags.length };

  const hasRequired = Boolean(rule.requiredTitleKeywordGroups?.length || rule.requiredKeywordGroups?.length || rule.requiredAnyKeywords?.length || rule.city);
  return { matches: hasRequired, reason: hasRequired ? 'required groups passed' : 'no signal', blockers: hasRequired ? [] : ['no keyword/tag signal'], tagsUsed: tags.length };
}

function importGate(event) {
  const tickets = (event.eventTickets || []).map((ticket) => Number(ticket.price)).filter((price) => Number.isFinite(price) && price >= MIN_PRICE);
  const priceFrom = tickets.length ? Math.min(...tickets) : null;
  const eventTimes = Array.isArray(event.eventTimes) ? event.eventTimes : [];
  const issues = [];
  if (!(event.images || []).length) issues.push('no_image');
  if (priceFrom == null) issues.push('no_price');
  if (!event.openDate && !eventTimes.length) issues.push('no_sessions');
  return { ok: issues.length === 0, issues, priceFrom, hasTimes: eventTimes.length > 0, openDate: Boolean(event.openDate) };
}

const skipCategories = new Set(['Экскурсии']);
const waterEvents = events.filter((event) => event.category === 'Речные прогулки' || (!isBusTourEvent(event) && event.category !== 'Экскурсии'));

const importOk = [];
const importFail = [];
for (const event of events) {
  if (isBusTourEvent(event) || event.category === 'Экскурсии') continue;
  const gate = importGate(event);
  if (gate.ok) importOk.push(event);
  else importFail.push({ id: event.id, title: event.title, ...gate });
}

const riverAllTags = waterEvents.filter((event) => explainRule(event, RULES['river-cruises'], Infinity).matches);
const river4Tags = waterEvents.filter((event) => explainRule(event, RULES['river-cruises'], 4).matches);
const riverImportOk = importOk.filter((event) => explainRule(event, RULES['river-cruises'], 4).matches);

const blockerStats = {};
for (const event of waterEvents) {
  const gate = importGate(event);
  if (!gate.ok) {
    for (const issue of gate.issues) blockerStats[`import:${issue}`] = (blockerStats[`import:${issue}`] || 0) + 1;
    continue;
  }
  const match4 = explainRule(event, RULES['river-cruises'], 4);
  if (!match4.matches) {
    for (const blocker of match4.blockers || ['no signal']) {
      blockerStats[`rule:${blocker}`] = (blockerStats[`rule:${blocker}`] || 0) + 1;
    }
  }
}

const lostByTagSlice = waterEvents.filter((event) => {
  const gate = importGate(event);
  if (!gate.ok) return false;
  return explainRule(event, RULES['river-cruises'], Infinity).matches && !explainRule(event, RULES['river-cruises'], 4).matches;
});

console.log(JSON.stringify({
  fixturesTotal: events.length,
  waterEvents: waterEvents.length,
  importReady: importOk.length,
  importBlocked: importFail.length,
  riverMatchAllTags: riverAllTags.length,
  riverMatchFirst4Tags: river4Tags.length,
  riverMatchImportReadyAnd4Tags: riverImportOk.length,
  lostByTagSliceOnly: lostByTagSlice.length,
  lostByTagSliceSamples: lostByTagSlice.slice(0, 5).map((event) => ({
    id: event.id,
    title: event.title,
    tags: buildTags(event),
  })),
  importBlockerStats: blockerStats,
  importFailSamples: importFail.slice(0, 5),
  ruleFailSamples: waterEvents
    .filter((event) => importGate(event).ok && !explainRule(event, RULES['river-cruises'], 4).matches)
    .slice(0, 8)
    .map((event) => ({
      id: event.id,
      title: event.title,
      tagsFirst4: buildTags(event).slice(0, 4),
      allTags: buildTags(event),
      explain: explainRule(event, RULES['river-cruises'], 4),
    })),
  futureSessionStats: (() => {
    const now = new Date();
    const riverReady = waterEvents.filter((event) => importGate(event).ok);
    const withFuture = riverReady.filter((event) => {
      const times = event.eventTimes || [];
      return times.some((slot) => {
        const normalized = String(slot.datetime || '').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
        const date = new Date(normalized);
        return Number.isFinite(date.getTime()) && date >= now;
      }) || Boolean(event.openDate);
    });
    const matchedOnLanding = withFuture.filter((event) => explainRule(event, RULES['river-cruises'], 4).matches);
    return {
      importReady: riverReady.length,
      withFutureSession: withFuture.length,
      wouldBeOnRiverLanding: matchedOnLanding.length,
      noFutureSession: riverReady.length - withFuture.length,
      futureButBlockedByRules: withFuture.length - matchedOnLanding.length,
    };
  })(),
  otherLandings: Object.fromEntries(
    Object.entries(RULES)
      .filter(([slug]) => slug !== 'river-cruises')
      .map(([slug, rule]) => [
        slug,
        waterEvents.filter((event) => importGate(event).ok && explainRule(event, rule, 4).matches).length,
      ]),
  ),
}, null, 2));
