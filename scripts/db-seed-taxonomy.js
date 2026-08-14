import { createDb } from '../apps/backend/src/db.js';

const db = createDb(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

const SUBCATEGORIES = [
  ['sub_excursions_water', 'cat_excursions', 'vodnye-ekskursii', 'Водные экскурсии', 10],
  ['sub_excursions_bus', 'cat_excursions', 'avtobusnye-ekskursii', 'Автобусные экскурсии', 20],
  ['sub_excursions_walking', 'cat_excursions', 'peshehodnye-ekskursii', 'Пешеходные экскурсии', 30],
  ['sub_excursions_tours', 'cat_excursions', 'tury-i-poezdki', 'Туры и поездки', 40],
  ['sub_museums_museums', 'cat_museums_art', 'muzei', 'Музеи', 10],
  ['sub_museums_exhibitions', 'cat_museums_art', 'vystavki', 'Выставки', 20],
  ['sub_museums_art_spaces', 'cat_museums_art', 'art-prostranstva', 'Арт-пространства', 30],
  ['sub_museums_workshops', 'cat_museums_art', 'master-klassy', 'Мастер-классы', 40],
  ['sub_events_concerts', 'cat_events', 'koncerty', 'Концерты', 10],
  ['sub_events_theater', 'cat_events', 'teatr', 'Театр', 20],
  ['sub_events_show', 'cat_events', 'shou', 'Шоу', 30],
  ['sub_events_festivals', 'cat_events', 'festivali', 'Фестивали', 40],
  ['sub_active_sport', 'cat_active', 'sport', 'Спорт', 10],
  ['sub_active_activities', 'cat_active', 'aktivnosti', 'Активности', 20],
  ['sub_active_extreme', 'cat_active', 'ekstrim', 'Экстрим', 30],
  ['sub_entertainment_children', 'cat_entertainment', 'detyam', 'Детям', 10],
  ['sub_entertainment_zoo', 'cat_entertainment', 'zooparki-i-fermy', 'Зоопарки и фермы', 20],
  ['sub_entertainment_fun', 'cat_entertainment', 'razvlekatelnye-centry', 'Развлекательные центры', 30],
  ['sub_entertainment_standup', 'cat_entertainment', 'stendap-i-yumor', 'Стендап и юмор', 40],
];

for (const row of SUBCATEGORIES) {
  await db.query(
    `
      insert into "Subcategory" (id, "categoryId", slug, title, position)
      values ($1, $2, $3, $4, $5)
      on conflict (slug) do update set
        title = excluded.title,
        position = excluded.position,
        "categoryId" = excluded."categoryId"
    `,
    row,
  );
}

console.log(`Seeded ${SUBCATEGORIES.length} subcategories`);
