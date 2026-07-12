import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDb } from '../apps/backend/src/db.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);

const CATEGORY_ID = 'cat_museums_art';
const SUBCATEGORY_ID = 'sub_museums_museums';

const EVENTS = [
  {
    externalId: '6a3593b1b8081091897ee513',
    imageUrl: '/images/events/generated/evt-cover-hp-vse-vklyucheno.png',
    description: `Комбо «Все включено» — максимальный формат посещения Музея Гарри Поттера в Санкт-Петербурге. Одним билетом вы получаете полноценную экскурсию по интерактивным залам, доступ ко всем локациям музея и возможность выбрать мастер-класс по душе.

Программа рассчитана на гостей, которые хотят провести здесь несколько часов без спешки: познакомиться с атмосферой Хогвартса, сделать фото в узнаваемых декорациях и поучаствовать в творческих активностях. Это удобный вариант для первого визита или подарка близким.

Билеты продаются онлайн — выберите удобную дату и время сеанса, оформите заказ и приходите за впечатлениями в назначенный слот.`,
  },
  {
    externalId: '6a35851cbbd948da83decfa1',
    imageUrl: '/images/events/generated/evt-cover-hp-kombo-kvest.png',
    description: `Комбо-квест — интерактивное приключение в Музее Гарри Поттера для тех, кто любит не просто смотреть, а участвовать. По маршруту вас ждут загадки, задания и сюжетные повороты, связанные с миром волшебства.

Формат подойдёт и взрослым поклонникам серии, и семьям с детьми: квест проходит в сопровождении гида, темп комфортный, акцент на атмосферу и погружение. Заложите на посещение около часа — этого достаточно, чтобы пройти маршрут и успеть сделать памятные кадры.

Купите билет заранее: количество мест на квестовые сеансы ограничено, а ближайшие даты часто раскупаются быстро.`,
  },
];

for (const item of EVENTS) {
  const eventId = `evt_${item.externalId}`;
  const { rows } = await db.query(
    `
      select e.id, e.title
      from "Event" e
      where e.id = $1
         or e."externalId" = $2
      limit 1
    `,
    [eventId, item.externalId],
  );

  if (!rows.length) {
    console.warn(`Event not found: ${item.externalId}`);
    continue;
  }

  const event = rows[0];

  await db.query(
    `
      update "Event"
      set "categoryId" = $2,
          "primarySubcategoryId" = $3,
          "updatedAt" = now()
      where id = $1
    `,
    [event.id, CATEGORY_ID, SUBCATEGORY_ID],
  );

  await db.query(
    `
      insert into "EventSubcategory" ("eventId", "subcategoryId", "isPrimary")
      values ($1, $2, true)
      on conflict ("eventId", "subcategoryId") do update set "isPrimary" = true
    `,
    [event.id, SUBCATEGORY_ID],
  );

  await db.query(
    `
      insert into "EventOverride" (
        "id", "eventId", title, description, "imageUrl", "mergeGroupKey", "updatedAt"
      )
      values ($5, $1, $4, $2, $3, 'harry-potter-spb', now())
      on conflict ("eventId") do update set
        title = excluded.title,
        description = excluded.description,
        "imageUrl" = excluded."imageUrl",
        "mergeGroupKey" = excluded."mergeGroupKey",
        "updatedAt" = now()
    `,
    [event.id, item.description, item.imageUrl, 'Музей Гарри Поттера', randomUUID()],
  );

  console.log(`Enriched ${event.title} (${event.id}) → Музеи, cover + merge`);
}

console.log('Harry Potter combo enrichment complete.');
