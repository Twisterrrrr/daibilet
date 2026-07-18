# Контент-план блога + еженедельный дайджест

**Обновлено:** 2026-07-19  
**Правило:** перед новыми статьями сверять оба источника ниже — **не повторять** slug/тему/кластер.

## Уже есть (инвентарь 2026-07-19)

### Источник A — статика
`apps/web/src/data/blog-posts.ts` (+ карточки на `/blog`, fallback SSR).  
Полные тексты новых статей: `content/blog/*.md` → `apps/web/src/data/blog-article-bodies.ts` (`npm run blog:sync-bodies`).

### Источник B — БД prod `Article`
Запрос 2026-07-19 с `root@213.171.7.16` (`/opt/daibilet`, `NODE_PATH=apps/backend/node_modules`, скрипт `.cjs`): **13 строк, все `PUBLISHED`**.  
Slug-набор **совпадает** со статикой 1:1 (заголовки в БД чуть длиннее SEO-варианты).

| # | Slug | Статика (title) | БД (title, кратко) |
|---|------|-----------------|---------------------|
| 1 | `kak-vybrat-koncert` | Как выбрать концерт: гид по билетам и местам в зале | …и лучшим местам в зале |
| 2 | `kuda-poyti-s-detmi` | Куда пойти с детьми: гид по семейному досугу | то же |
| 3 | `spb-rooftop-guide` | Санкт-Петербург: крыши и развод мостов | то же |
| 4 | `chto-poslushat-jazz` | Москва: джаз для новичка — куда пойти | то же |
| 5 | `moskva-rechnye-progulki-zaryade` | Москва: речные прогулки от Зарядья | …какой маршрут выбрать |
| 6 | `spb-dvory-paradnye-kommunalki` | СПб: дворы, парадные и коммуналки | …что выбрать |
| 7 | `spb-razvod-mostov-kakoi-reis` | Разводные мосты Петербурга: 2, 3 или 5 мостов | то же (+ «какой же рейс») |
| 8 | `spb-stendap-gid` | Стендап в СПб: гид по комедийным площадкам | то же |
| 9 | `kazan-rechnye-progulki` | Речные прогулки в Казани: маршруты и цены | …теплоходам и ценам |
| 10 | `moskva-avtobusnaya-obzornaya` | Автобусная обзорная экскурсия по Москве | …как выбрать лучший маршрут |
| 11 | `spb-planetarium-gid` | СПб: Планетарий 1 — орган и шоу | …орган, шоу и концерты |
| 12 | `moskva-master-klass-emal` | Москва: мастер-классы по эмали | …по горячей эмали |
| 13 | `afisha-regionalnye-goroda` | Екатеринбург, Уфа и Нижний: афиша регионов | …Новгород: афиша за пределами двух столиц |

**Итого покрыто (было):** **13** статей.

**Закрытые кластеры (не дублировать):** семья/дети; концерты и места в зале; джаз МСК; реки МСК и Казань; СПб крыши/мосты/дворы/стендап/планетарий; автобус МСК; эмаль/МК; региональная афиша (Екб/Уфа/НН).

---

## Новые статьи (2026-07-19) — 4 гида + колонка Макса

Пункт «Как купить билет на Дайбилете» **снят** (лишний trust/help).

| # | Slug | Title | Обложка | Статус контента |
|---|------|-------|---------|-----------------|
| 1 | `moskva-immersivnye-vystavki` | Иммерсивные выставки в Москве… | `/images/blog/moskva-immersivnye-vystavki.jpg` | MD + статика; upsert в БД на деплое |
| 2 | `moskva-kvesty-escape-room` | Квесты и escape-room в Москве… | `/images/blog/moskva-kvesty-escape-room.jpg` | то же |
| 3 | `myuzikly-teatr-novichok-msk-spb` | Мюзиклы и театр для новичка… | `/images/blog/myuzikly-teatr-novichok-msk-spb.jpg` | то же |
| 4 | `moskva-vechernie-diskoteki-shou` | Вечерние дискотеки и танцевальные шоу… | `/images/blog/moskva-vechernie-diskoteki-shou.jpg` | то же |
| 5 | `fentezi-fest-bylinnyy-bereg` | Былинный берег / Фэнтези Фест (полный текст Макса + `[buy]`) | `/images/blog/fentezi-fest-bylinnyy-bereg.jpg` | MD + buy shortcode; open-air HIDDEN |

**Источник контента:** `content/blog/{slug}.md`  
**Карточки:** `apps/web` + `apps/public` `src/data/blog-posts.ts`  
**Обложки:** `apps/public/public/images/blog/` (+ sync в `apps/web/public/images/blog/`)  
**Публикация в CMS:** `npm run blog:upsert` (на сервере с `DATABASE_URL`).

---

## Еженедельный дайджест по новым событиям каталога

### Цель
Раз в неделю автоматически собирать «что появилось в афише» → черновик статьи в `Article` (status=`REVIEW`), редактор правит и публикует.

### Не делать
- Полный auto-publish без человека.
- Повторять evergreen-темы из таблицы выше (дайджест = новости каталога, не гид).

### Реализация (готово)

| Шаг | Что |
|-----|-----|
| 1 | Cron вс 07:00: `deploy/cron/blog-weekly-digest.sh` |
| 2 | `scripts/blog-weekly-digest.js`: события за 7 дней, READY/PUBLISHED, цена ≥100₽, будущий сеанс, purchase-ready |
| 3 | Топ-15 МСК/СПб + до 2 регионов, ссылки `/events/{slug}` |
| 4 | H1 «Афиша недели: N новых событий (ДД–ДД месяц)» |
| 5 | `slug=afisha-nedeli-YYYY-MM-DD`, status=`REVIEW`, isIndexable=false |

### Команды

```bash
npm run blog:weekly-digest
npm run blog:weekly-digest -- --dry-run
npm run blog:upsert
npm run blog:sync-bodies
```

Документация cron: [deploy/cron/README.md](../deploy/cron/README.md).

---

## Колонки ИИ-журналистов (2026-07-19)

Реестр и style guides (стиль письма, не аудио): [ai-journalists/README.md](./ai-journalists/README.md), JSON: [ai-journalists/personas.json](./ai-journalists/personas.json).

**Формат общих (неавторских) статей «Редакция»:** [ai-journalists/00-editorial.md](./ai-journalists/00-editorial.md) — без приветствий персон, живое вступление, помощь в выборе, честные оговорки, вывод «кому какой вариант».

### Rewrite редакционных гидов (2026-07-19)

| Slug | Статус |
|------|--------|
| `spb-rooftop-guide` | Крыши (+ мосты кратко); отдельная от мостов |
| `spb-razvod-mostov-kakoi-reis` | PUBLISHED снова (отдельный гид по рейсам) |
| `kuda-poyti-s-detmi` | Обновлён; author=`editorial` (не Елена) |
| `chto-poslushat-jazz` | Обновлён под формат выбора формата |
| `kak-vybrat-koncert` | Обновлён: места в зале |

| authorId | Автор | Колонка | Когда брать |
|----------|-------|---------|-------------|
| `max` | Макс | «Изнанка маршрута» | Бюджет, активный тревел, open-air/фесты/экскурсии; референс формы Perito (см. [01-max.md](./ai-journalists/01-max.md)) |
| `anna` | Анна | «Между эпохами» | СПб/культура, дворы, мосты, музеи, выставки, театр |
| `elena` | Елена | «Спокойный маршрут» | Дети, быт, туалеты/еда/укачивание, семейные слоты |
| `igor` | Игорь | «Место силы» | Байкал/Север/этно/легенды (без «акция/скидка») |
| `artur` | Артур | «На вкус» | Рынки, стритфуд, специалитеты, гастро-маршрут |
| `editorial` | Редакция | — | Общие гиды без персоны; см. [00-editorial.md](./ai-journalists/00-editorial.md) |

**Правила**

- Не дублировать evergreen-кластеры из инвентаря выше без нового угла колонки.
- CTA Дайбилет — мягкий, в манере автора (у Игоря — без коммерческих клише).
- Структура колонки — **4 абзаца** по System prompt персоны (у Макса — **4–5**, 1200–1800 знаков).
- Статья пишется **только** после промпта темы от пользователя; сначала выбор `authorId`.

**Пилот (fit с текущим каталогом):** 1) Анна — дворы/мосты/иммерсив/театр; 2) Елена — семья/планетарий/реки с детьми.
