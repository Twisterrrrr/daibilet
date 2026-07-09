/**
 * Патч: шоу каскадеров Сергея Кочерга на стадионе «Полёт», Нижний Новгород.
 * node scripts/apply-polet-kocherg-patch.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const EVENT_ID = 'evt_6a32bd448e99703657131cdc';
const VENUE_ID = 'venue_6252fd6a8bafbd8352a63178';
const IMAGE_URL = '/images/events/tc-6a32bd448e99703657131cdc-nizhnii-novgorod.jpg';

const EVENT_TITLE = 'Шоу каскадеров Сергея Кочерга';
const EVENT_DESCRIPTION = `Зрелищное шоу каскадеров Сергея Кочерга с новой программой в Нижнем Новгороде. Открытая арена стадиона «Полёт» — дрифт, огонь, пиротехника и автомобильные битвы под ночным небом.

**Что вас ждёт на шоу**

- **Экстремальные трюки на автомобилях** — дрифт, прыжки, развороты на 180°
- **Огненные шоу** — проезды сквозь огненные кольца
- **Зрелищные столкновения** — настоящие автомобильные битвы
- **Спецэффекты** — пиротехника и световое шоу

**Площадка:** стадион «Полёт», ул. Чаадаева, 16б (Московский район). После входа на территорию можно занять любое удобное место на трибунах.

**Билеты:** онлайн на Дайбилет (на стороне билетной системы может быть сервисный сбор). Билеты без сервисного сбора — в кассе ФОК «БАССЕЙН ПОЛЁТ» (только наличные; касса открывается 22 июля).

**Дети до 4 лет** включительно — бесплатно без отдельного места; один взрослый может провести с собой одного ребёнка до 4 лет.`;

const SHORT_DESCRIPTION =
  'Шоу каскадеров Сергея Кочерга на стадионе «Полёт»: дрифт, огненные кольца, автобитвы и пиротехника. Нижний Новгород, ул. Чаадаева 16б.';

const SEO_H1 = 'Шоу каскадеров Сергея Кочерга в Нижнем Новгороде';
const SEO_TITLE = 'Шоу каскадеров Сергея Кочерга в Нижнем Новгороде: билеты | Дайбилет';
const SEO_DESCRIPTION =
  'Билеты на шоу каскадеров Сергея Кочерга на стадионе «Полёт» в Нижнем Новгороде. Дрифт, огненные трюки и автомобильные битвы — расписание и покупка онлайн.';

const VENUE_SHORT =
  'Открытый стадион «Полёт» на ул. Чаадаева, 16б — арена для шоу каскадеров, спортивных событий и массовых программ в Московском районе.';

const VENUE_DESCRIPTION = `Стадион «Полёт» — спортивный комплекс с открытой трибунной ареной в Московском районе Нижнего Новгорода (ул. Чаадаева, 16б). Площадка используется для спортивных мероприятий, массовых шоу и зрелищных программ — в том числе шоу каскадеров Сергея Кочерга с автомобильными трюками, огненными номерами и пиротехникой.

**Как добраться:** Московский район, ориентир — ФОК «Бассейн Полёт». На карточке события указан точный адрес посадки.

**На площадке:** открытые трибуны — место выбираете сами после входа на территорию.`;

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

async function main() {
  loadEnv();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();

  try {
    if (dryRun) {
      console.log('DRY RUN', { EVENT_ID, VENUE_ID, IMAGE_URL, EVENT_TITLE });
      return;
    }

    await client.query('begin');

    await client.query(
      `
        insert into "EventOverride" (
          id, "eventId", title, description, "shortDescription",
          "imageUrl", "seoH1", "seoTitle", "seoDescription",
          "editorStatus", "updatedAt"
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PUBLISHED', now())
        on conflict ("eventId") do update set
          title = excluded.title,
          description = excluded.description,
          "shortDescription" = excluded."shortDescription",
          "imageUrl" = excluded."imageUrl",
          "seoH1" = excluded."seoH1",
          "seoTitle" = excluded."seoTitle",
          "seoDescription" = excluded."seoDescription",
          "editorStatus" = 'PUBLISHED',
          "updatedAt" = now()
      `,
      [
        `override_${EVENT_ID}`,
        EVENT_ID,
        EVENT_TITLE,
        EVENT_DESCRIPTION,
        SHORT_DESCRIPTION,
        IMAGE_URL,
        SEO_H1,
        SEO_TITLE,
        SEO_DESCRIPTION,
      ],
    );

    await client.query(
      `
        update "Venue"
        set
          kind = 'SPORT_ACTIVITY_SPACE'::"VenueKind",
          "shortDescription" = $2,
          description = $3,
          "heroImageUrl" = coalesce("heroImageUrl", $4),
          "seoTitle" = coalesce("seoTitle", $5),
          "seoDescription" = coalesce("seoDescription", $6),
          "updatedAt" = now()
        where id = $1
      `,
      [
        VENUE_ID,
        VENUE_SHORT,
        VENUE_DESCRIPTION,
        IMAGE_URL,
        'Стадион «Полёт» — афиша и билеты, Нижний Новгород | Дайбилет',
        'Стадион «Полёт» в Нижнем Новгороде: шоу каскадеров, спортивные и массовые мероприятия на ул. Чаадаева 16б.',
      ],
    );

    await client.query('commit');
    console.log('OK: event override + venue updated');
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
