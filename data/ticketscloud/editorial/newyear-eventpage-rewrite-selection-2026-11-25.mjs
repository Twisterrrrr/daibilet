import fs from 'node:fs';
import path from 'node:path';

const scratch = 'D:/coding/_scratch/2026-11-25';
const repo = 'D:/coding/daibilet';
const candidates = JSON.parse(fs.readFileSync(path.join(scratch, 'newyear-eventpage-candidates-final-live-2026-11-25.json'), 'utf8'));
const tours = JSON.parse(fs.readFileSync(path.join(scratch, 'newyear-tourgroup-manifest-live-2026-11-25.json'), 'utf8'));
const out = path.join(repo, 'data/ticketscloud/editorial/newyear-eventpage-rewrite-selection-2026-11-25.csv');

const seasonal = /(?<![\p{L}])(?:новогод[\p{L}]*|новый\s+год|рождеств[\p{L}]*|ёлк[\p{L}]*|елк[\p{L}]*|снегуроч[\p{L}]*|дед\s+мороз[\p{L}]*|зимн[\p{L}]*|christmas|new\s+year|xmas)(?![\p{L}])/iu;
const explicitSeasonal = /(?<![\p{L}])(?:новогод[\p{L}]*|новый\s+год|рождеств[\p{L}]*|ёлк[\p{L}]*|елк[\p{L}]*|снегуроч[\p{L}]*|дед\s+мороз[\p{L}]*|christmas|new\s+year|xmas)(?![\p{L}])/iu;
const skip = row => /novogodnee-kombo-/.test(row.slug)
  || /naik-borzov-bolshoi-novogodnii-koncert-(?:ekaterinburg|nizhniy-novgorod)/.test(row.slug)
  || /stand up на рождественской/i.test(row.title);
const existingMasters = new Set([
  'Новогодний огонёк с группой «Каролина»',
  'Новогодние саундтреки при свечах с АСО-оркестром',
  'Betsy — новогоднее шоу',
]);
const extraTours = new Set([
  'Борис Кузьмин — акустический тур, январь 2027',
  'Костя Кулясов и группа «АнимациЯ» — новогодний тур 2027',
  'Наконечный — новогодняя акустика, январь 2027',
]);
const duplicateTours = new Set([
  'Ravanna. Новогодний концерт.',
  'Авторский концерт Рви Меха - Оркестра! - Рождественский концерт',
]);
const tourBySlug = new Map(tours.map(row => [row.slug, row]));

const rows = [];
for (const page of candidates) {
  if (skip(page)) continue;
  const tour = tourBySlug.get(page.slug);
  const title = page.title || '';
  const seasonalMatch = seasonal.test(`${title} ${(page.event_titles || []).join(' ')}`);
  if (!seasonalMatch && !extraTours.has(page.tour_group)) continue;

  if (existingMasters.has(page.tour_group) || tour?.rewrite_status === 'ACTIVE_EDITORIAL_REWRITE') continue;

  const unit = duplicateTours.has(page.tour_group)
    ? `tour:${page.tour_group}`
    : extraTours.has(page.tour_group)
      ? `tour:${page.tour_group}`
      : `page:${page.page_id}`;
  rows.push({
    page_id: page.page_id,
    slug: page.slug,
    title: page.title,
    city: page.cities || '',
    venue: page.venues || '',
    event_ids: (page.event_id_list || []).join('|'),
    linked_event_count: page.event_ids,
    active_slots: page.active_sessions,
    next_slot_utc: page.next_slot || '',
    provider: page.providers || '',
    tour_group: page.tour_group || '',
    work_unit: unit,
    action: duplicateTours.has(page.tour_group) ? 'ONE_SHARED_TOUR_REWRITE_CITY_PRACTICALS_PER_PAGE' : 'NEW_REWRITE',
    editorial_status: page.status === 'DRAFT' && !page.isIndexable ? 'DRAFT_NEEDS_REWRITE' : 'REVIEW_STATUS_BEFORE_EDIT',
    selection_status: explicitSeasonal.test(`${title} ${(page.event_titles || []).join(' ')}`) || extraTours.has(page.tour_group) ? 'SELECTED' : 'REVIEW_SEASONALITY',
    page_url: `https://daibilet.ru/events/${page.slug}`,
  });
}

// Tour pages omitted from title-based EventPage search, but confirmed by EventTourGroup.
for (const tour of tours) {
  if (!extraTours.has(tour.tour_title)) continue;
  rows.push({
    page_id: tour.page_id,
    slug: tour.slug,
    title: tour.page_title,
    city: tour.city || '',
    venue: tour.venues || '',
    event_ids: (tour.event_ids || []).join('|'),
    linked_event_count: tour.event_count,
    active_slots: tour.active_sessions,
    next_slot_utc: tour.next_slot || '',
    provider: (tour.providers || []).join('|'),
    tour_group: tour.tour_title,
    work_unit: `tour:${tour.tour_title}`,
    action: 'ONE_SHARED_TOUR_REWRITE_CITY_PRACTICALS_PER_PAGE',
    editorial_status: 'DRAFT_NEEDS_REWRITE',
    selection_status: 'SELECTED',
    page_url: `https://daibilet.ru/events/${tour.slug}`,
  });
}

// This local page already belongs to an indexable tour master; reuse, do not author a duplicate.
const najk = tours.find(row => row.tour_title === 'Найк Борзов - Большой новогодний концерт' && row.city === 'Нижний Новгород');
if (najk) rows.push({
  page_id: najk.page_id,
  slug: najk.slug,
  title: najk.page_title,
  city: najk.city,
  venue: najk.venues || '',
  event_ids: (najk.event_ids || []).join('|'),
  linked_event_count: najk.event_count,
  active_slots: najk.active_sessions,
  next_slot_utc: najk.next_slot || '',
  provider: (najk.providers || []).join('|'),
  tour_group: najk.tour_title,
  work_unit: 'reuse:tour:naik-borzov-bolshoi-novogodnii-koncert',
  action: 'REUSE_EXISTING_TOUR_EDITORIAL_TEXT_NO_NEW_REWRITE',
  editorial_status: 'DRAFT_REUSE_EXISTING_READY_INDEXABLE_MASTER',
  selection_status: 'REUSE_EXISTING_TEXT',
  page_url: `https://daibilet.ru/events/${najk.slug}`,
});

const units = [...new Set(rows.filter(row => row.action !== 'REUSE_EXISTING_TOUR_EDITORIAL_TEXT_NO_NEW_REWRITE' && row.selection_status === 'SELECTED').map(row => row.work_unit))];
const unitRank = new Map(units.map((unit, index) => [unit, index]));
for (const row of rows) {
  if (row.action === 'REUSE_EXISTING_TOUR_EDITORIAL_TEXT_NO_NEW_REWRITE') row.batch = 'REUSE';
  else if (row.selection_status === 'REVIEW_SEASONALITY') row.batch = 'REVIEW';
  else {
    const index = unitRank.get(row.work_unit);
    row.batch = index < 30 ? 'B1' : index < 60 ? 'B2' : 'B3';
  }
}

const kontent = tours.filter(row => row.tour_title === 'Контент Завод' || /контент завод/i.test(row.page_title || ''));
const headers = ['batch','selection_status','work_unit','action','editorial_status','page_id','slug','page_url','title','city','venue','tour_group','event_ids','linked_event_count','active_slots','next_slot_utc','provider'];
const csvEscape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const csv = [headers.join(','), ...rows.map(row => headers.map(key => csvEscape(row[key])).join(','))].join('\r\n') + '\r\n';
fs.writeFileSync(out, csv, 'utf8');

const batchCounts = Object.fromEntries(['B1','B2','B3'].map(batch => [batch, units.filter(unit => rows.some(row => row.work_unit === unit && row.batch === batch)).length]));
const summary = {
  source: 'Production snapshot 2026-11-25; title-based exact seasonal term filter + explicit EventTourGroup review',
  rows: rows.length,
  distinctPages: new Set(rows.map(row => row.page_id)).size,
  newEditorialWorkUnits: units.length,
  workUnitsByBatch: batchCounts,
  reuseRows: rows.filter(row => row.action === 'REUSE_EXISTING_TOUR_EDITORIAL_TEXT_NO_NEW_REWRITE').length,
  seasonalReviewRows: rows.filter(row => row.selection_status === 'REVIEW_SEASONALITY').length,
  tourSharedWorkUnits: [...new Set(rows.filter(row => row.action.includes('SHARED_TOUR')).map(row => row.work_unit))].length,
  output: out,
};
console.log(JSON.stringify(summary, null, 2));
