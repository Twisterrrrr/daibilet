/**
 * Seed starter blog articles from legacy static list.
 * node scripts/seed-blog-articles.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { randomUUID } = require('node:crypto');

const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const ARTICLES = [
  {
    slug: 'kak-vybrat-koncert',
    title: 'Как выбрать концерт: 7 признаков живого звука',
    excerpt:
      'Разбираем акустику залов, лайв-миксы и почему билет на первый ряд — не всегда лучший вариант.',
    tag: 'Гид',
    city: null,
    coverImageUrl: '/images/blog/concert.jpg',
    publishedAt: '2026-07-03T10:00:00.000Z',
    content: `Живой концерт — это не только сцена и свет. От зала зависит, насколько хорошо слышны инструменты и голос.

**На что смотреть при выборе билета**

1. **Акустика зала** — камерные площадки лучше для акустики и джаза, большие арены — для шоу с экранами.
2. **Расположение** — центр партера часто звучит лучше, чем первый ряд у амплитуд.
3. **Формат** — unplugged, трибьют или оригинальный сет дают разный опыт.
4. **Время** — вечерние концерты обычно с полной световой программой.
5. **Возрастной рейтинг** — проверьте ограничения заранее.
6. **Возврат и перенос** — смотрите условия организатора.
7. **Отзывы** — ищите упоминания звука, а не только артиста.

На Дайбилет можно сравнить несколько дат одного артиста и выбрать зал с лучшей акустикой для вашего жанра.`,
  },
  {
    slug: 'kuda-poyti-s-detmi',
    title: 'Куда пойти с детьми: спектакли, мастер-классы и музеи',
    excerpt:
      'Подборка событий 0+/6+ с честными оценками родителей и коротким чек-листом «взять с собой».',
    tag: 'Семья',
    city: null,
    coverImageUrl: '/images/blog/family.jpg',
    publishedAt: '2026-06-28T10:00:00.000Z',
    content: `Семейный досуг проще планировать, когда заранее понятен возраст, длительность и формат.

**Что взять с собой**

- Перекус и вода, если в программе нет кафе.
- Наушники для чувствительных детей на громких шоу.
- Запасная одежда после мастер-классов.

**Форматы, которые работают**

- Интерактивные музеи и квесты — дети вовлечены, не скучают.
- Короткие спектакли до 60 минут — комфортный ритм для малышей.
- Мастер-классы с результатом — ребёнок уносит поделку домой.

В каталоге Дайбилет фильтруйте по возрасту и городу — так быстрее найти подходящую афишу на выходные.`,
  },
  {
    slug: 'spb-rooftop-guide',
    title: 'Крыши Петербурга: 12 легальных площадок с гидом',
    excerpt:
      'Панорамные виды, безопасные маршруты и цены. Плюс список экскурсий, которые пускают на закате.',
    tag: 'Города',
    city: 'Санкт-Петербург',
    coverImageUrl: '/images/blog/spb-rooftops.jpg',
    publishedAt: '2026-06-20T10:00:00.000Z',
    content: `Петербург с высоты — отдельный жанр прогулок. Легальные экскурсии на крыши проходят с гидом и страховкой.

**Почему только с гидом**

- Безопасность и маршрут по разрешённым точкам.
- Истории о домах, которые не услышишь с улицы.
- Закатные слоты быстро раскупают — бронируйте заранее.

**Когда идти**

Лучшее время — за 1–1,5 часа до заката. В белые ночи добавляйте запас по времени из-за очередей.

Смотрите экскурсии на крыши в подборках Дайбилет по Санкт-Петербургу — там актуальные даты и цены.`,
  },
  {
    slug: 'chto-poslushat-jazz',
    title: 'Джаз для новичка: с чего начать и куда пойти',
    excerpt: 'Пять клубов, шесть альбомов и один плейлист, чтобы полюбить жанр за неделю.',
    tag: 'Музыка',
    city: 'Москва',
    coverImageUrl: '/images/blog/jazz.jpg',
    publishedAt: '2026-06-12T10:00:00.000Z',
    content: `Джаз пугает новичков разнообразием — от свинга до фьюжна. Начните с живых концертов в камерных клубах.

**План на неделю**

1. Послушайте классику: Miles Davis, Ella Fitzgerald, Дайана Кролл.
2. Сходите на джем-сейшн — музыканты импровизируют, атмосфера лёгкая.
3. Выберите клуб с сидячими местами, если не хотите стоять всю ночь.

В Москве и Петербурге на Дайбилет регулярно появляются джазовые вечера — удобно сравнить площадку, время и цену билета в одном каталоге.`,
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

async function findCityId(client, cityName) {
  if (!cityName) return null;
  const { rows } = await client.query(`select id from "City" where lower(trim(title)) = lower(trim($1)) limit 1`, [cityName]);
  return rows[0]?.id || null;
}

async function main() {
  loadEnv();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();

  try {
    let inserted = 0;
    let updated = 0;

    for (const article of ARTICLES) {
      const cityId = await findCityId(client, article.city);
      const { rows } = await client.query(`select id from "Article" where slug = $1 limit 1`, [article.slug]);

      if (dryRun) {
        console.log(`${rows[0] ? 'update' : 'insert'}: ${article.slug}`);
        continue;
      }

      if (rows[0]) {
        await client.query(
          `
            update "Article"
            set
              title = $2,
              excerpt = $3,
              content = $4,
              "coverImageUrl" = $5,
              "cityId" = $6,
              status = 'PUBLISHED'::"ArticleStatus",
              "isIndexable" = true,
              "seoTitle" = $2,
              "seoDescription" = $3,
              "canonicalPath" = $7,
              "publishedAt" = coalesce("publishedAt", $8::timestamptz),
              "updatedAt" = now()
            where id = $1
          `,
          [
            rows[0].id,
            article.title,
            article.excerpt,
            article.content,
            article.coverImageUrl,
            cityId,
            `/blog/${article.slug}`,
            article.publishedAt,
          ],
        );
        updated += 1;
      } else {
        const id = `article_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
        await client.query(
          `
            insert into "Article" (
              id, slug, status, title, excerpt, content, "coverImageUrl", "cityId",
              "seoTitle", "seoDescription", "canonicalPath", "isIndexable",
              "publishedAt", "createdAt", "updatedAt"
            )
            values (
              $1, $2, 'PUBLISHED', $3, $4, $5, $6, $7,
              $3, $4, $8, true,
              $9::timestamptz, now(), now()
            )
          `,
          [id, article.slug, article.title, article.excerpt, article.content, article.coverImageUrl, cityId, `/blog/${article.slug}`, article.publishedAt],
        );
        inserted += 1;
      }
    }

    console.log(`${dryRun ? '[DRY RUN] ' : ''}inserted: ${inserted}, updated: ${updated}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
