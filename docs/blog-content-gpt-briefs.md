# GPT-брифы: блог Дайбилет (owner assign)

Дата: 2026-07-27  
Связано: [content-blog-plan.md](./content-blog-plan.md), [seo-guide-articles-gpt-prompt.md](./seo-guide-articles-gpt-prompt.md), [landing-content-gpt-briefs.md](./landing-content-gpt-briefs.md)  
Персоны: [ai-journalists/README.md](./ai-journalists/README.md), [01-max.md](./ai-journalists/01-max.md), [00-editorial.md](./ai-journalists/00-editorial.md)

## Что в этой пачке

| Тип | Кол-во | Назначение |
|-----|--------|------------|
| Pack B: редакционные гиды | 9 | МСК / СПб / Казань / Екб: выходные, семья, концерты, река, SEO-лендинги |
| Pack B: колонки Макса | 2 | Авторский голос, литературный наблюдатель (Akunin-like), не SEO-лонгриды |
| Pack C: региональные гиды | 9 | Другие города с живым каталогом (НН, Самара, Уфа, Нск, Сочи, Ростов, Красноярск, Калининград, Ярославль) |

**Не дублировать** slug и кластеры из [content-blog-plan.md](./content-blog-plan.md) (инвентарь 33 MD + закрытые кластеры). Pack B/C = **новый угол** (intent / цены / карты), не rewrite 9 longforms. Pack C не повторяет Pack B по тем же 4 городам.

---

## Политика релизов (канон)

Сводка из Project / Tasktracker / qa / `.cursorrules`. Детали календаря: [seo-guide-articles-plan.md](./seo-guide-articles-plan.md) → «Календарь публикации».

### Частота

| Канал | Ритм | Примечание |
|-------|------|------------|
| SEO-гиды | **Хаос-график** «живая редакция» | Не ровно N/день и не круглые `09:00`. Пример ритма: **2 / 1 / перерыв вс / пн-колонка / 2 / 1**; времена вроде `11:15`, `16:40` MSK |
| Пн | **1 колонка/нед** (или ничего) | В понедельник SEO-гиды **не** ставить |
| Safety throttle | **1 гид/день** | Только если YM/GSC массово «малоценная» / excluded; owner в Вебмастере |
| Нормальный режим | KEEP хаос-темп | Пока индекс YM/GSC **80-90%** (owner мониторит **еженедельно**) |
| Weekly digest | **Вс 07:00** cron | `Article` status=`REVIEW`, **без** auto-publish |
| HIDDEN backlog | Не ускорять | Риск AI-spam |

### Микс шаблонов (~⅓ / ~⅓ / ~⅓)

- `long` (5-7k знаков без пробелов)
- `top5` (~3k)
- `events` (3.5-5.5k)

В дневной пачке **миксовать города** (МСК / СПб / Казань / Екб / регионы).

### PUBLISHED: жёсткие правила

1. GPT всегда сдаёт `status: DRAFT` - **не** `PUBLISHED`.
2. **Cover обязателен:** уникальный JPG на диске `apps/public/public/images/blog/{slug}.jpg` + `coverImageUrl` / `imageAlt` в frontmatter. Запрещены city-placeholder (`cities/*.png`).
3. **Inline 1-2 обязательны** в body до публикации:
   - `[image side=left|right src="/images/blog/{slug}-inline.jpg" alt="…"]`
   - второе: `{slug}-inline-2.jpg`
   - Файлы генерирует **агент** (GenerateImage), не GPT. `src` ≠ cover.
4. Публикация на сайт: `status: PUBLISHED` + `publishedAt` (ISO `+03:00`). Public API фильтрует `publishedAt <= now()` - future date скрывает URL до слота.
5. После merge: `npm run blog:sync-bodies` → deploy → `npm run blog:upsert` (prod `DATABASE_URL`).
6. Без cover и inline на диске агент **не** переводит в `PUBLISHED`.

### Featured («Материал недели» на `/blog`)

- Поле `Article.isFeatured` - **ручной** toggle в admin (`/admin/articles`).
- **Last-wins:** при set `true` сбрасываются остальные featured.
- Featured = отдельный Blog Hero на `/blog`, **не** дублируется в magazine grid.
- **Автоматической ротации нет** - владелец/редактор выбирает материал вручную после выхода.

### Кто утверждает

| Шаг | Кто |
|-----|-----|
| Тема и GPT-промпт | **Владелец** (этот документ) |
| Текст после GPT | **Владелец** - вычитка, анти-ИИ, факты |
| Cover + inline + MD в репо | **Агент** |
| `publishedAt` / go-live | **Владелец** (или агент по слоту из календаря после OK текста) |
| Weekly digest `REVIEW` → live | **Владелец** в admin |
| Featured Hero | **Владелец** в admin |
| GSC/YM throttle, переобход | **Владелец** (кабинеты только owner) |

---

## Общие правила тона (вставить в каждый промпт)

```
Правила текста (обязательно):
- Язык: русский, ясный, без канцелярита и без «ИИ-пафоса».
- Только обычный дефис "-". Запрещены длинное тире "—", среднее "–".
- Не выдумывать метрики: никаких ★4.7, "N отзывов", "продано 18500 билетов".
- Не выдумывать точные цены, телефоны, slug событий. Ориентиры и диапазоны - ок ("как две чашки кофе - около 700 ₽").
- CTA только на утверждённые CHPU из задания. Запрещён /events?q= как главный CTA.
- Без emoji в заголовках и NOTE label.
- Cover: coverImageUrl = /images/blog/{slug}.jpg (файл делает Cursor, не GPT).
- Inline ОБЯЗАТЕЛЬНО 1-2: [image side=… src="/images/blog/{slug}-inline.jpg" alt="…"] (+ -inline-2.jpg).
- status: DRAFT всегда.
```

Для гидов дополнительно вставить System из [seo-guide-articles-gpt-prompt.md](./seo-guide-articles-gpt-prompt.md) (блок «System prompt (универсальный)»).

---

## Формат сдачи MD (гиды)

Frontmatter канон (гиды):

```yaml
---
slug: kebab-case
title: "…"
excerpt: "1-2 предложения"
seoTitle: "… | Дайбилет"
seoDescription: "до ~155 символов"
seoH1: "…"
authorId: editorial
authorName: Редакция
articleType: gid
tag: Город | Семья | Концерты | Река | Выходные
citySlug: moscow | saint-petersburg | kazan | ekaterinburg | nizhny-novgorod | samara | ufa | novosibirsk | sochi | rostov-on-don | krasnoyarsk | kaliningrad | yaroslavl
date: "ДД месяц ГГГГ"
readMin: 7-12
imageAlt: "…"
coverImageUrl: "/images/blog/{slug}.jpg"
status: DRAFT
---
```

Структура body:

- Лид 2-4 абзаца (top5: 1-2).
- H2/H3 по заданию; каждые 3-4 абзаца - список / таблица / новый H2.
- Mid-article `[NOTE label="Совет" text="… [Анкор](https://daibilet.ru/…)"]`.
- 1-2 `[image …]` на естественных паузах (после лида или первого H2; второе - после следующего блока).
- Финал: кому какой вариант (редакция), без «в этой статье мы рассказали».

Колонка Макса - отдельный frontmatter (см. промпты K1/K2).

---

## Календарь пачки B (хаос, MSK)

Ритм после пилота из seo-guide-articles-plan. В **пн** только колонки.

| Дата | Время | Тип | Slug | Промпт |
|------|-------|-----|------|--------|
| 2026-08-04 пн | 10:40 | column | `moskva-parki-open-air-vyhodnye` | K1 |
| 2026-08-05 вт | 11:25 | long | `moskva-vykhodnye-dva-dnya-bez-gonki` | A1 |
| 2026-08-05 вт | 17:15 | top5 | `kazan-vykhodnye-pyat-sposobov` | A2 |
| 2026-08-06 ср | 14:50 | events | `ekb-s-detmi-odin-den-marshrut` | A3 |
| 2026-08-07 чт | - | - | - | **перерыв** (опционально) |
| 2026-08-08 пт | 12:05 | top5 | `moskva-koncert-novichku-zal-i-mesto` | A4 |
| 2026-08-09 сб | 15:30 | events | `kazan-volga-vechernaya-progulka` | A5 |
| 2026-08-10 вс | - | - | - | **перерыв** |
| 2026-08-11 пн | 11:10 | column | `ural-den-v-gorah-max` | K2 |
| 2026-08-12 вт | 10:55 | top5 | `spb-nochnye-mosty-pered-bronirovaniem` | A6 |
| 2026-08-12 вт | 18:05 | long | `moskva-planetariy-kupol-i-format` | A7 |
| 2026-08-13 ср | 13:40 | long | `moskva-zagorod-pushkin-petrodvorets` | A8 |
| 2026-08-14 чт | 16:20 | events | `ekb-stendap-formaty-i-kluby` | A9 |

После OK текста агент проставляет `publishedAt` по слоту и `status: PUBLISHED` при upsert.

---

## Календарь пачки C: другие города (хаос, MSK)

Старт после Pack B. Приоритет - города с **живым каталогом** (см. `tmp-catalog-events-cache.json`, `STRONG_CITY_SLUGS`, `/cities` hub). В **пн** SEO-гиды не ставить.

| Дата | Время | Тип | Slug | Промпт |
|------|-------|-----|------|--------|
| 2026-08-15 пт | 11:35 | top5 | `nn-stendap-impprov-pyat-voprosov` | A10 |
| 2026-08-16 сб | 15:55 | long | `samara-vykhodnye-dva-dnya-bez-gonki` | A11 |
| 2026-08-17 вс | - | - | - | **перерыв** |
| 2026-08-18 пн | - | - | - | **перерыв** (день колонки) |
| 2026-08-19 вт | 10:50 | events | `ufa-teatr-vecher-kak-vybrat` | A12 |
| 2026-08-19 вт | 17:25 | top5 | `rostov-vecher-pyat-sposobov` | A13 |
| 2026-08-20 ср | 14:15 | long | `novosibirsk-vykhodnye-chto-posmotret` | A14 |
| 2026-08-21 чт | - | - | - | **перерыв** (опционально) |
| 2026-08-22 пт | 12:40 | events | `sochi-vecher-koncert-ili-stendap` | A15 |
| 2026-08-23 сб | 16:05 | long | `kaliningrad-dva-dnya-samostoyatelno` | A16 |
| 2026-08-24 вс | - | - | - | **перерыв** |
| 2026-08-25 пн | - | - | - | **перерыв** (день колонки) |
| 2026-08-26 вт | 11:20 | events | `krasnoyarsk-odin-den-ekskursii` | A17 |
| 2026-08-26 вт | 18:30 | top5 | `yaroslavl-zolotoe-koltso-vykhodnye` | A18 |

Микс шаблонов Pack C: 3× `long`, 3× `top5`, 3× `events`. Города не из четвёрки Pack B (МСК / СПб / Казань / Екб).

---

## Промпты: 9 гидов Pack B (редакция)

Для каждого: один раз System (seo-guide-articles-gpt-prompt + блок тона выше), затем User ниже **по одному**.

### A1 - Москва, выходные без гонки (`moskva-vykhodnye-dva-dnya-bez-gonki`)

| Поле | Значение |
|------|----------|
| Угол | City guide / weekend: два дня в Москве без метро-марафона |
| template_type | `long` |
| citySlug | `moscow` |
| Целевой CHPU | `/cities/moscow/` |
| Соседние CHPU | `/moskva-rechnye-progulki-zaryade/` (статья), `/rechnye-progulki/moscow/` |
| readMin | 10 |
| Объём | 5000-7000 знаков без пробелов |

```
Напиши одну статью-путеводитель для блога Дайбилет. Верни только Markdown (frontmatter + body).

template_type: long
Title: Что делать в Москве в выходные: два дня без гонки по метро
slug: moskva-vykhodnye-dva-dnya-bez-gonki
Город: Москва, citySlug: moscow
Целевой CHPU: https://daibilet.ru/cities/moscow/
Соседние: https://daibilet.ru/rechnye-progulki/moscow/

Акцент: самостоятельный weekend - сонный центр vs один дальний кластер; не дублировать маршрут "2 дня самостоятельно" (уже есть другая статья).
Структура: лид (типичная ошибка - 5 районов в один день); H2 День 1 центр+Замоскворечье; H2 День 2 один дальний блок (ВДНХ ИЛИ Воробьёвы ИЛИ Сити); H2 Вечер: река или концерт (без выдуманных событий); H2 Бюджет и время на дорогу; вывод кому какой weekend.
NOTE после H2 День 1: мягкий CTA на афишу Москвы.
Ключи (органично): что делать в Москве в выходные, маршрут выходного дня Москва.

Общие правила тона и inline/cover - см. блок выше. status: DRAFT, authorId: editorial.
```

### A2 - Казань, пять способов на выходные (`kazan-vykhodnye-pyat-sposobov`)

| Поле | Значение |
|------|----------|
| Угол | Weekend picks / top5 |
| template_type | `top5` |
| citySlug | `kazan` |
| Целевой CHPU | `/cities/kazan/` |
| Соседние | `/rechnye-progulki/kazan/`, `/podborki/family-kids/kazan` |
| readMin | 7 |

```
template_type: top5
Title: Казань на выходные: 5 способов не застрять только в Кремле
slug: kazan-vykhodnye-pyat-sposobov
citySlug: kazan
Целевой CHPU: https://daibilet.ru/cities/kazan/
Соседние: https://daibilet.ru/rechnye-progulki/kazan/

Акцент: короткая подборка форматов (река, семья, стендап, МК, вечерний город) - не лонгрид по Кремлю.
Структура: лид 1-2 абзаца; 5 пунктов с подзаголовками (каждый - формат + кому + оговорка); без нумерованного SEO-мусора "№1 лучший".
NOTE после пункта 3: CTA на речные прогулки Казани.
Ключи: Казань выходные, что посмотреть Казань weekend.

top5 ~3000 знаков без пробелов. editorial. DRAFT. Inline 1-2. Дефис только "-".
```

### A3 - Екб, один день с детьми (`ekb-s-detmi-odin-den-marshrut`)

| Поле | Значение |
|------|----------|
| Угол | Family |
| template_type | `events` |
| citySlug | `ekaterinburg` |
| Целевой CHPU | `/podborki/family-kids/ekaterinburg` |
| Соседние | `/cities/ekaterinburg/` |
| readMin | 8 |

```
template_type: events
Title: Екатеринбург с детьми: один день без истерики (маршрут и слоты)
slug: ekb-s-detmi-odin-den-marshrut
citySlug: ekaterinburg
Целевой CHPU: https://daibilet.ru/podborki/family-kids/ekaterinburg
Соседние: https://daibilet.ru/cities/ekaterinburg/

Акцент: один день, возраст 5-10, туалеты/еда/сон, не общий гид "куда с детьми" (уже есть национальный).
Структура: лид; H2 Утро (музей/планетарий/анимация - форматы); H2 Обед и передышка; H2 Вечер (семейное шоу); H2 Если дождь; честные оговорки по возрастным маркировкам.
NOTE: CTA на подборку family-kids Екб.
Ключи: Екатеринбург с детьми, семейный маршрут Екб.

events 3500-5500 знаков. editorial. DRAFT.
```

### A4 - Москва, концерт новичку (`moskva-koncert-novichku-zal-i-mesto`)

| Поле | Значение |
|------|----------|
| Угол | Concerts |
| template_type | `top5` |
| citySlug | `moscow` |
| Целевой CHPU | `/koncerty/moscow/` |
| Соседние | `/podborki/concerts/moscow`, статья `kak-vybrat-koncert` |
| readMin | 7 |

```
template_type: top5
Title: Первый концерт в Москве: зал, партер и танцпол - что выбрать
slug: moskva-koncert-novichku-zal-i-mesto
citySlug: moscow
Целевой CHPU: https://daibilet.ru/koncerty/moscow/
Соседние: https://daibilet.ru/podborki/concerts/moscow

Акцент: выбор места и формата для новичка, не обзор артистов.
Структура: 5 сравнений (клуб vs арена, партер vs амфитеатр, стоячий vs сидячий, акустика, выход после концерта).
NOTE: CTA на листинг концертов Москвы.
Не дублировать статью kak-vybrat-koncert - фокус на Москве и первом визите.

top5 ~3000. editorial. DRAFT.
```

### A5 - Казань, вечер на Волге (`kazan-volga-vechernaya-progulka`)

| Поле | Значение |
|------|----------|
| Угол | River |
| template_type | `events` |
| citySlug | `kazan` |
| Целевой CHPU | `/rechnye-progulki/kazan/` |
| Соседние | статья `kazan-rechnye-progulki`, `/cities/kazan/` |
| readMin | 8 |

```
template_type: events
Title: Вечерняя прогулка по Волге в Казани: теплоход, катер или ужин на воде
slug: kazan-volga-vechernaya-progulka
citySlug: kazan
Целевой CHPU: https://daibilet.ru/rechnye-progulki/kazan/

Акцент: вечерний слот, не дневной обзор маршрутов (другая статья уже есть).
Структура: лид; H2 Форматы вечера (круиз, ужин, короткий рейс); H2 Причал и время прихода; H2 С детьми и без; H2 Погода и одежда; вывод.
NOTE после форматов: CTA на речные прогулки Казани.
Ключи: вечерняя прогулка Казань Волга, теплоход Казань вечер.

events 3500-5500. editorial. DRAFT.
```

### A6 - СПб, ночные мосты перед бронированием (`spb-nochnye-mosty-pered-bronirovaniem`)

| Поле | Значение |
|------|----------|
| Угол | SEO landing support (bridges) |
| template_type | `top5` |
| citySlug | `saint-petersburg` |
| Целевой CHPU | `/bridges-night/saint-petersburg/` |
| Соседние | `/night-bridges/saint-petersburg/`, статья `spb-razvod-mostov-kakoi-reis` |
| readMin | 7 |

```
template_type: top5
Title: Ночные мосты в Петербурге: 5 вопросов перед бронированием рейса
slug: spb-nochnye-mosty-pered-bronirovaniem
citySlug: saint-petersburg
Целевой CHPU: https://daibilet.ru/bridges-night/saint-petersburg/
Соседние: https://daibilet.ru/night-bridges/saint-petersburg/

Акцент: purchase intent - что проверить до оплаты (причал, длительность, 2 vs 5 мостов, одежда, возврат по правилам организатора).
Не переписывать spb-razvod-mostov-kakoi-reis - здесь чеклист перед покупкой, не сравнение рейсов.
Структура: 5 вопросов-ответов в narrative flow; NOTE с CTA на bridges-night.
top5 ~3000. editorial. DRAFT.
```

### A7 - Москва, планетарий (`moskva-planetariy-kupol-i-format`)

| Поле | Значение |
|------|----------|
| Угол | SEO landing support (planetarium) |
| template_type | `long` |
| citySlug | `moscow` |
| Целевой CHPU | `/planetarium/moscow/` |
| Соседние | `/podborki/planetarium/moscow`, статья `spb-planetarium-gid` (СПб - только ссылка по смыслу) |
| readMin | 9 |

```
template_type: long
Title: Планетарий в Москве: полнокупольное шоу, детский сеанс и концерт под куполом
slug: moskva-planetariy-kupol-i-format
citySlug: moscow
Целевой CHPU: https://daibilet.ru/planetarium/moscow/

Акцент: Москва (в СПб уже есть гид); выбор формата шоу vs концерта, возраст, опоздание, свет в зале.
Структура long: лид; H2 Типы программ; H2 С детьми; H2 Шоу vs концерт; H2 Практика (приход, мобильный, длительность); вывод.
NOTE: CTA на planetarium/moscow.
long 5000-7000. editorial. DRAFT.
```

### A8 - Москва, загород Пушкин/Петродворец (`moskva-zagorod-pushkin-petrodvorets`)

| Поле | Значение |
|------|----------|
| Угол | SEO landing support (country tours) |
| template_type | `long` |
| citySlug | `moscow` |
| Целевой CHPU | `/zagorodnye-ekskursii/moscow/` |
| Соседние | `/country-tours/moscow/` |
| readMin | 10 |

```
template_type: long
Title: Из Москвы в Пушкин и Петродворец: как выбрать загородную экскурсию на выходные
slug: moskva-zagorod-pushkin-petrodvorets
citySlug: moscow
Целевой CHPU: https://daibilet.ru/zagorodnye-ekskursii/moscow/
Соседние: https://daibilet.ru/country-tours/moscow/

Акцент: выезд на день, что входит в билет (парк vs дворец отдельно), сбор, длительность, дети.
Не путать с СПб Петергофом - только московский радиус.
Структура long + таблица "что обычно входит / что отдельно" (без выдуманных цен).
NOTE: CTA на zagorodnye-ekskursii/moscow.
long 5000-7000. editorial. DRAFT.
```

### A9 - Екб, стендап форматы (`ekb-stendap-formaty-i-kluby`)

| Поле | Значение |
|------|----------|
| Угол | SEO landing support (standup) + regional |
| template_type | `events` |
| citySlug | `ekaterinburg` |
| Целевой CHPU | `/stendap/ekaterinburg/` |
| Соседние | статья `ekb-stendap-uralskiy-yumor` (другой угол - юмор Урала), `/cities/ekaterinburg/` |
| readMin | 8 |

```
template_type: events
Title: Стендап в Екатеринбурге: открытый микрофон, импровизация и билет в день концерта
slug: ekb-stendap-formaty-i-kluby
citySlug: ekaterinburg
Целевой CHPU: https://daibilet.ru/stendap/ekaterinburg/

Акцент: форматы и площадки, не переписывать ekb-stendap-uralskiy-yumor (там - уральский юмор как phenomenon).
Структура: лид; H2 Форматы (открытый микрофон, headliner, импров); H2 Клуб vs бар; H2 Возраст и контент; H2 Когда брать билет; вывод.
NOTE: CTA на stendap/ekaterinburg.
events 3500-5500. editorial. DRAFT.
```

---

## Промпты: 9 гидов Pack C - другие города (редакция)

Критерий отбора городов: **≥15 событий** в каталоге (кэш 2026-07-27), `isDestination` / strong city, CHPU `/cities/{slug}/` и хотя бы один листинг (`/stendap/`, `/ekskursii/`, `/koncerty/` и т.д.). Не дублировать `afisha-regionalnye-goroda` (там - мультигородской обзор; здесь - один город, другой угол).

### A10 - Нижний Новгород, стендап и импровизация (`nn-stendap-impprov-pyat-voprosov`)

| Поле | Значение |
|------|----------|
| Угол | Purchase intent / comedy formats |
| template_type | `top5` |
| citySlug | `nizhny-novgorod` |
| Целевой CHPU | `/stendap/nizhny-novgorod/` |
| Соседние | `/cities/nizhny-novgorod/`, `/koncerty/nizhny-novgorod/` |
| readMin | 7 |

```
template_type: top5
Title: Стендап и импровизация в Нижнем Новгороде: 5 вопросов перед покупкой билета
slug: nn-stendap-impprov-pyat-voprosov
citySlug: nizhny-novgorod
Целевой CHPU: https://daibilet.ru/stendap/nizhny-novgorod/
Соседние: https://daibilet.ru/cities/nizhny-novgorod/

Акцент: чеклист перед оплатой - открытый микрофон vs headliner, импровизация vs готовый стендап, возраст, бар vs зал, возврат по правилам организатора.
Не переписывать afisha-regionalnye-goroda (там НН - один из трёх городов в обзоре).
Структура: 5 вопросов-ответов в narrative flow; NOTE с CTA на stendap/nizhny-novgorod.
top5 ~3000 знаков без пробелов. editorial. DRAFT. Inline 1-2. Дефис только "-".
```

### A11 - Самара, выходные без гонки (`samara-vykhodnye-dva-dnya-bez-gonki`)

| Поле | Значение |
|------|----------|
| Угол | City guide / weekend |
| template_type | `long` |
| citySlug | `samara` |
| Целевой CHPU | `/cities/samara/` |
| Соседние | `/ekskursii/samara/`, `/rechnye-progulki/samara/` |
| readMin | 10 |

```
template_type: long
Title: Самара на выходные: два дня без гонки по набережной и центру
slug: samara-vykhodnye-dva-dnya-bez-gonki
citySlug: samara
Целевой CHPU: https://daibilet.ru/cities/samara/
Соседние: https://daibilet.ru/ekskursii/samara/

Акцент: самостоятельный weekend - набережная Волги, один музейный блок, вечерний формат (концерт или прогулка). Не обзор всех достопримечательностей подряд.
Структура: лид (ошибка - весь город за день); H2 День 1 набережная + центр; H2 День 2 один кластер (музей ИЛИ экскурсия ИЛИ речной слот); H2 Вечер: афиша без выдуманных событий; H2 Логистика и бюджет; вывод кому какой weekend.
NOTE после H2 День 1: CTA на афишу Самары.
long 5000-7000 знаков. editorial. DRAFT.
```

### A12 - Уфа, театральный вечер (`ufa-teatr-vecher-kak-vybrat`)

| Поле | Значение |
|------|----------|
| Угол | Theater / evening formats |
| template_type | `events` |
| citySlug | `ufa` |
| Целевой CHPU | `/cities/ufa/` |
| Соседние | `/neobychnye-teatry/ufa/`, `/detyam-i-semyam/ufa/` |
| readMin | 8 |

```
template_type: events
Title: Театральный вечер в Уфе: как выбрать спектакль, не ошибившись с жанром
slug: ufa-teatr-vecher-kak-vybrat
citySlug: ufa
Целевой CHPU: https://daibilet.ru/cities/ufa/
Соседние: https://daibilet.ru/neobychnye-teatry/ufa/

Акцент: выбор постановки по описанию, возрасту и настроению; не переписывать блок про Уфу в afisha-regionalnye-goroda.
Структура: лид; H2 Камерный зал vs большая сцена; H2 Семейный спектакль vs взрослый; H2 Что смотреть в карточке события; H2 Приход и дресс-код; H2 Если спектакль не зашёл (честные оговорки); вывод.
NOTE: CTA на афишу Уфы или neobychnye-teatry/ufa.
events 3500-5500. editorial. DRAFT.
```

### A13 - Ростов-на-Дону, пять вечерних форматов (`rostov-vecher-pyat-sposobov`)

| Поле | Значение |
|------|----------|
| Угол | Evening picks / top5 |
| template_type | `top5` |
| citySlug | `rostov-on-don` |
| Целевой CHPU | `/cities/rostov-on-don/` |
| Соседние | `/stendap/rostov-on-don/`, `/koncerty/rostov-on-don/` |
| readMin | 7 |

```
template_type: top5
Title: Ростов-на-Дону вечером: 5 способов провести время после работы
slug: rostov-vecher-pyat-sposobov
citySlug: rostov-on-don
Целевой CHPU: https://daibilet.ru/cities/rostov-on-don/
Соседние: https://daibilet.ru/koncerty/rostov-on-don/

Акцент: короткая подборка форматов (стендап, концерт, мероприятие, семейное шоу, иммерсив) - не полный гид по городу.
Структура: лид 1-2 абзаца; 5 пунктов (формат + кому + оговорка); без SEO-мусора "№1 лучший".
NOTE после пункта 3: CTA на афишу Ростова.
top5 ~3000. editorial. DRAFT.
```

### A14 - Новосибирск, выходные (`novosibirsk-vykhodnye-chto-posmotret`)

| Поле | Значение |
|------|----------|
| Угол | City guide / weekend |
| template_type | `long` |
| citySlug | `novosibirsk` |
| Целевой CHPU | `/cities/novosibirsk/` |
| Соседние | `/ekskursii/novosibirsk/`, `/podborki/na-vyhodnye/novosibirsk` |
| readMin | 9 |

```
template_type: long
Title: Новосибирск на выходные: что посмотреть за два дня без спешки
slug: novosibirsk-vykhodnye-chto-posmotret
citySlug: novosibirsk
Целевой CHPU: https://daibilet.ru/cities/novosibirsk/
Соседние: https://daibilet.ru/ekskursii/novosibirsk/

Акцент: два дня в крупном региональном центре - центр, один культурный блок, вечерняя афиша. Учесть расстояния и холодный сезон (одежда, indoor fallback).
Структура long: лид; H2 Суббота: прогулка + музей/экскурсия; H2 Воскресенье: один дальний слот или концерт; H2 Транспорт и еда; H2 Если погода плохая; вывод.
NOTE: CTA на podborki/na-vyhodnye/novosibirsk или cities/novosibirsk.
long 5000-7000. editorial. DRAFT.
```

### A15 - Сочи, вечерний выбор (`sochi-vecher-koncert-ili-stendap`)

| Поле | Значение |
|------|----------|
| Угол | Resort evening / events |
| template_type | `events` |
| citySlug | `sochi` |
| Целевой CHPU | `/koncerty/sochi/` |
| Соседние | `/stendap/sochi/`, `/cities/sochi/` |
| readMin | 8 |

```
template_type: events
Title: Вечер в Сочи: концерт, стендап или шоу - как выбрать формат отдыхающему
slug: sochi-vecher-koncert-ili-stendap
citySlug: sochi
Целевой CHPU: https://daibilet.ru/koncerty/sochi/
Соседние: https://daibilet.ru/stendap/sochi/

Акцент: турист в курортном городе - вечер после пляжа/гор, не пляжный гид. Сравнение форматов, сезонность, дорога до площадки.
Структура: лид; H2 Концерт vs стендап vs семейное шоу; H2 Район и дорога (центр vs Адлер - без выдуманных адресов); H2 С детьми; H2 Билет в день мероприятия; вывод.
NOTE: CTA на koncerty/sochi.
events 3500-5500. editorial. DRAFT.
```

### A16 - Калининград, два дня (`kaliningrad-dva-dnya-samostoyatelno`)

| Поле | Значение |
|------|----------|
| Угол | City guide / self-guided |
| template_type | `long` |
| citySlug | `kaliningrad` |
| Целевой CHPU | `/cities/kaliningrad/` |
| Соседние | `/peshie-ekskursii/kaliningrad/`, `/ekskursii/kaliningrad/` |
| readMin | 10 |

```
template_type: long
Title: Калининград за два дня: самостоятельный маршрут без экскурсионного автобуса
slug: kaliningrad-dva-dnya-samostoyatelno
citySlug: kaliningrad
Целевой CHPU: https://daibilet.ru/cities/kaliningrad/
Соседние: https://daibilet.ru/peshie-ekskursii/kaliningrad/

Акцент: короткая поездка в калининградский анклав - исторический центр + один тематический блок; когда имеет смысл пешая экскурсия с гидом.
Структура long: лид; H2 День 1 остров Канта и окрестности; H2 День 2 музей или пешая экскурсия; H2 Вечер и афиша; таблица "самостоятельно / с гидом"; вывод.
NOTE: CTA на peshie-ekskursii/kaliningrad.
long 5000-7000. editorial. DRAFT.
```

### A17 - Красноярск, экскурсии на один день (`krasnoyarsk-odin-den-ekskursii`)

| Поле | Значение |
|------|----------|
| Угол | Excursions / day trip |
| template_type | `events` |
| citySlug | `krasnoyarsk` |
| Целевой CHPU | `/ekskursii/krasnoyarsk/` |
| Соседние | `/cities/krasnoyarsk/`, `/peshie-ekskursii/krasnoyarsk/` |
| readMin | 8 |

```
template_type: events
Title: Красноярск: один день с экскурсией - город, заповедник или промышленный маршрут
slug: krasnoyarsk-odin-den-ekskursii
citySlug: krasnoyarsk
Целевой CHPU: https://daibilet.ru/ekskursii/krasnoyarsk/
Соседние: https://daibilet.ru/cities/krasnoyarsk/

Акцент: выбор формата однодневной программы (обзорная, природная, тематическая) - не общий путеводитель по Сибири.
Структура: лид; H2 Обзорная по городу; H2 Природный или загородный слот; H2 Промышленный/тематический формат; H2 Что входит в билет; H2 Сезон и одежда; вывод.
NOTE: CTA на ekskursii/krasnoyarsk.
events 3500-5500. editorial. DRAFT.
```

### A18 - Ярославль, Золотое кольцо (`yaroslavl-zolotoe-koltso-vykhodnye`)

| Поле | Значение |
|------|----------|
| Угол | Golden Ring / weekend top5 |
| template_type | `top5` |
| citySlug | `yaroslavl` |
| Целевой CHPU | `/cities/yaroslavl/` |
| Соседние | `/ekskursii/yaroslavl/`, `/peshie-ekskursii/yaroslavl/` |
| readMin | 7 |

```
template_type: top5
Title: Ярославль на выходные: 5 форматов Золотого кольца без туристического конвейера
slug: yaroslavl-zolotoe-koltso-vykhodnye
citySlug: yaroslavl
Целевой CHPU: https://daibilet.ru/cities/yaroslavl/
Соседние: https://daibilet.ru/ekskursii/yaroslavl/

Акцент: короткая поездка в Ярославль - пешая экскурсия, обзорная, вечерний концерт, семейный формат, один музейный слот. Не лонгрид по всем храмам.
Структура: 5 пунктов с подзаголовками; NOTE с CTA на ekskursii/yaroslavl.
top5 ~3000. editorial. DRAFT. Inline 1-2.
```

---

## Промпты: 2 колонки Макса

Литературный наблюдатель (Akunin-like): ирония, деталь быта, «детектив взгляда» на город/маршрут. **Не** копировать стиль Акунина дословно.

Канон Макса сохраняем: приветствие **«Хей, читатели!»**, финал **«Мир лучше видеть своими глазами!»**, `authorId: max`. См. [01-max.md](./ai-journalists/01-max.md).

### System (колонки - один раз)

```
Роль: Макс, колонка «Изнанка маршрута» на Дайбилет.
Стиль: литературный наблюдатель (Akunin-like) - ирония, точная деталь, короткий абзац как улика, без канцелярита.
Не impersonation: не копировать Акунина/Птушкина дословно.
Объём: 1200-1800 знаков с пробелами, 4-5 абзацев.
Приветствие строго: «Хей, читатели!»
Финал строго: «Мир лучше видеть своими глазами!»
Только дефис "-". Без fake метрик и выдуманных цен.
Мягкий CTA на карточку/CHPU из задания в абзаце 3-4.
articleType: column. status: DRAFT.
Inline 1-2 шорткода [image …] как в гидах.
```

### K1 - Open-air в парках Москвы (`moskva-parki-open-air-vyhodnye`)

| Поле | Значение |
|------|----------|
| Угол | Editorial column / open-air weekend |
| citySlug | `moscow` |
| CHPU (мягкий) | `/podborki/rooftops/moscow` или `/cities/moscow/` |
| readMin | 3 |

```
User:
Напиши колонку Макса.
slug: moskva-parki-open-air-vyhodnye
title: Open-air в московских парках: шум, плед и почему билет лучше брать раньше
citySlug: moscow
Тема: выходной open-air / концерт в парке - толпа, звук с края, погода, что взять.
Мягкий CTA (абзац 3-4): [афиша Москвы](https://daibilet.ru/cities/moscow/) или [подборка rooftops](https://daibilet.ru/podborki/rooftops/moscow/).
Можно 1 [buy slug=…] только если в задании дали конкретный READY slug - иначе только ссылка на CHPU.
Frontmatter: authorId max, authorName Макс, articleType column, tag Колонка.
Верни только Markdown. DRAFT.
```

### K2 - Урал, день в горах (`ural-den-v-gorah-max`)

| Поле | Значение |
|------|----------|
| Угол | Editorial column / active day trip |
| citySlug | `ekaterinburg` |
| CHPU | `/cities/ekaterinburg/` или экскурсионный CHPU если owner укажет |
| readMin | 3 |

```
User:
Напиши колонку Макса.
slug: ural-den-v-gorah-max
title: Один день в Уральских горах: автобус, тропа и честный разговор о укачивании
citySlug: ekaterinburg
Тема: выездной день из Екб - автобус, гид, тропа, изнанка (укачивание, обувь, обед в дороге).
Литературный наблюдатель: детали как «улики», лёгкая ирония, без пафоса «душа России».
CTA (абзац 3-4): мягко на [афишу Екатеринбурга](https://daibilet.ru/cities/ekaterinburg/). Другой экскурсионный CHPU не придумывать - только если owner даст точную ссылку.
authorId max. column. DRAFT. Inline 1-2. Канон приветствия/финала.
```

---

## Автономные промпты (полная версия A10-A18, K1-K2)

Краткие User-блоки ниже - для пачечной генерации с общим System. **Полные автономные промпты** (все правила внутри каждого блока, готовы к copy-paste в GPT без сверки с другими секциями) - в файле владельца `daibilet_prompts_A10-A18_K1-K2.md`.

Сверка 2026-07-27: slug, углы, CHPU и календарь Pack C совпадают с этим документом. В Downloads дополнительно зафиксированы:

- точные тексты `[NOTE …]` и место вставки (см. таблицу ниже);
- явный запрет дублировать `afisha-regionalnye-goroda` в каждом промпте Pack C;
- для колонок K1/K2: запрет `[buy]`, канон «Хей, читатели!» / «Мир лучше видеть своими глазами!», объём 1200-1800 знаков с пробелами;
- K1: альтернативный CHPU `https://daibilet.ru/podborki/rooftops/moscow/`;
- K2: не придумывать экскурсионный CHPU - только `https://daibilet.ru/cities/ekaterinburg/`, пока owner не даст другой.

### Точные NOTE по Pack C (из автономных промптов)

| Промпт | После блока | Шорткод NOTE |
|--------|-------------|--------------|
| A10 | 3-й вопрос | `[NOTE label="Совет" text="Сравните доступные форматы в разделе [Стендап в Нижнем Новгороде](https://daibilet.ru/stendap/nizhny-novgorod/) перед оплатой билета."]` |
| A11 | H2 «День 1» | `[NOTE label="Совет" text="Перед поездкой посмотрите актуальные форматы в разделе [Афиша Самары](https://daibilet.ru/cities/samara/), чтобы выбрать один вечерний слот без перегруженного расписания."]` |
| A12 | H2 «Что смотреть в карточке» | `[NOTE label="Совет" text="Для нестандартного вечера сравните постановки в разделе [Необычные театры Уфы](https://daibilet.ru/neobychnye-teatry/ufa/)."]` |
| A13 | 3-й пункт | `[NOTE label="Совет" text="Сверьте форматы и время начала в разделе [Афиша Ростова-на-Дону](https://daibilet.ru/cities/rostov-on-don/), прежде чем строить вечер."]` |
| A14 | H2 «Суббота» | `[NOTE label="Совет" text="Проверьте идеи на ближайшие даты в подборке [Новосибирск на выходные](https://daibilet.ru/podborki/na-vyhodnye/novosibirsk/), а затем оставьте в плане только один вечерний формат."]` |
| A15 | H2 «Район и дорога» | `[NOTE label="Совет" text="Начните выбор с раздела [Концерты в Сочи](https://daibilet.ru/koncerty/sochi/) и сразу проверьте район площадки."]` |
| A16 | H2 «День 1» | `[NOTE label="Совет" text="Если хочется не просто пройти маршрут, а понять его контекст, посмотрите [Пешие экскурсии по Калининграду](https://daibilet.ru/peshie-ekskursii/kaliningrad/)."]` |
| A17 | H2 «Природный или загородный» | `[NOTE label="Совет" text="Сравните длительность и состав программы в разделе [Экскурсии в Красноярске](https://daibilet.ru/ekskursii/krasnoyarsk/) до покупки билета."]` |
| A18 | 3-й пункт | `[NOTE label="Совет" text="Чтобы не собирать маршрут из случайных точек, сначала сравните [Экскурсии в Ярославле](https://daibilet.ru/ekskursii/yaroslavl/)."]` |

Pack B (A1-A9) и краткие User-блоки K1/K2 в этом файле остаются каноном для batch-режима. Для одиночной генерации без System - использовать полные блоки из Downloads.

---

## Workflow генерации фото (агент)

GPT **не** генерирует файлы изображений. Cover и inline создаёт **агент** (Cursor GenerateImage) после того, как owner сдал текст DRAFT.

### Пути и frontmatter

| Тип | Файл на диске | Frontmatter / shortcode |
|-----|---------------|-------------------------|
| Cover | `apps/public/public/images/blog/{slug}.jpg` | `coverImageUrl: "/images/blog/{slug}.jpg"` + `imageAlt: "…"` |
| Inline 1 | `apps/public/public/images/blog/{slug}-inline.jpg` | `[image side=left\|right src="/images/blog/{slug}-inline.jpg" alt="…"]` |
| Inline 2 | `apps/public/public/images/blog/{slug}-inline-2.jpg` | `[image side=… src="/images/blog/{slug}-inline-2.jpg" alt="…"]` |
| Inline 3+ | `{slug}-inline-3.jpg` и т.д. | только если промпт явно требует больше двух |

Правила `.cursorrules` п.6-7:

- Cover обязателен для любой статьи; запрещены city-placeholder (`cities/*.png`).
- Inline 1-2 обязательны в body до `PUBLISHED`; `src` inline **≠** cover (`filterDuplicateImageBlocks` вырежет совпадение).
- Люди на фото: славянская внешность где уместно, позитив, не обязательно в камеру.
- Каждый файл - **уникальный** GenerateImage, не копия cover и не stock-placeholder.

### Порядок работы агента на одну статью

1. Получить MD от owner (`status: DRAFT`) или сгенерировать по промпту A/K.
2. **Cover:** GenerateImage по теме статьи и `imageAlt` → сохранить `{slug}.jpg`.
3. **Inline:** 1-2 (или больше по промпту) отдельных GenerateImage - другой ракурс/сцена, не дублировать cover → `-inline.jpg`, `-inline-2.jpg`.
4. Проверить shortcodes в body: пути совпадают с файлами на диске; `alt` осмысленный (станет подписью при hover, см. ниже).
5. Положить MD в `content/blog/{slug}.md`.
6. Перед `PUBLISHED`: все JPG на диске, `npm run blog:check-inline` (если есть), `blog:sync-bodies` → deploy → `blog:upsert`.

Без cover **и** inline на диске агент не переводит в `PUBLISHED`.

### Промпт GenerateImage (шаблон)

```
Фотореалистичное изображение для статьи блога о {тема}, город {город}.
Сцена: {конкретная сцена из alt}.
Стиль: естественный свет, без текста и водяных знаков на кадре.
Люди (если есть): славянская внешность, позитивное настроение.
Формат: горизонтальный 4:3, editorial travel/lifestyle.
```

Для inline - другой ракурс или деталь, чем на cover (зал крупным планом vs панорама города и т.п.).

---

## UI: подписи под inline-фото (hover)

Рендер: `BlogArticleContent` → `BlogFigure` (`apps/web` и `apps/public`).

- Подпись берётся из `alt` в shortcode `[image … alt="…"]`.
- На `<img>` / `SafeImage`: `alt` + `title` (нативный tooltip и screen readers).
- `<figcaption>`: `aria-hidden="true"` (дубль alt не озвучивается), скрыт на устройствах с hover до наведения на figure.
- CSS: `group` на `<figure>`, figcaption `opacity-0` → `group-hover:opacity-100` только при `@media (hover: hover)`; на touch без hover подпись **всегда видна**.
- Keyboard: `group-focus-within:opacity-100` на hover-устройствах.

---

## Batch workflow для владельца

1. **Подготовка:** открыть этот файл + [content-blog-plan.md](./content-blog-plan.md) (антидубли).
2. **GPT:** вставить System (гиды - из seo-guide-articles-gpt-prompt; колонки - System K выше) **один раз**.
3. **По одной статье:** копировать User A1…A9, A10…A18 (Pack C) или K1/K2. **Не** смешивать несколько тем в одном запросе.
4. **Сохранить** ответ как `{slug}.md` без markdown-ограждений ``` вокруг файла.
5. **Вычитка:** анти-ИИ чеклист из seo-guide-articles-gpt-prompt; проверить дефис `-`; убрать выдуманные цены/slug.
6. **Сдать агенту:** «размести пачку B/C, слоты из blog-content-gpt-briefs» + файлы или paste MD.
7. **Агент:** `content/blog/{slug}.md`, cover + inline JPG, `blog:sync-bodies`, deploy, `blog:upsert`, `publishedAt` по календарю.
8. **Featured (опционально):** после выхода сильного материала - toggle в admin `isFeatured`.
9. **Мониторинг:** раз в неделю YM/GSC; при mass «малоценная» - throttle 1 гид/день (owner).

### Что не делать

- Публиковать из GPT без cover/inline на диске.
- Ставить SEO-гиды в понедельник (день колонки).
- Жечь HIDDEN backlog быстрее графика.
- Rewrite 9 существующих longforms.
- Auto-publish weekly digest (`REVIEW` только).

---

## Чеклист агента перед PUBLISHED

- [ ] Slug не в инвентаре content-blog-plan
- [ ] `apps/public/public/images/blog/{slug}.jpg` exists (не placeholder)
- [ ] `-inline.jpg` и при необходимости `-inline-2.jpg` exists, src ≠ cover
- [ ] Body содержит 1-2 `[image …]` shortcodes
- [ ] Нет `—` / `–` в пользовательском тексте
- [ ] `status: PUBLISHED` + `publishedAt` MSK по календарю
- [ ] `blog:upsert` на prod после deploy

---

## Чеклист генерации по статье (Pack C + колонки)

Для каждой из 11 статей (A10-A18 + K1-K2) - отдельный проход. Тексты не генерировать пачкой без OK owner.

| # | Промпт | slug | Cover | Inline 1 | Inline 2 | Слот MSK |
|---|--------|------|-------|----------|----------|----------|
| 1 | A10 | `nn-stendap-impprov-pyat-voprosov` | `{slug}.jpg` | `-inline.jpg` | `-inline-2.jpg` | 2026-08-15 11:35 |
| 2 | A11 | `samara-vykhodnye-dva-dnya-bez-gonki` | idem | idem | idem | 2026-08-16 15:55 |
| 3 | A12 | `ufa-teatr-vecher-kak-vybrat` | idem | idem | idem | 2026-08-19 10:50 |
| 4 | A13 | `rostov-vecher-pyat-sposobov` | idem | idem | idem | 2026-08-19 17:25 |
| 5 | A14 | `novosibirsk-vykhodnye-chto-posmotret` | idem | idem | idem | 2026-08-20 14:15 |
| 6 | A15 | `sochi-vecher-koncert-ili-stendap` | idem | idem | idem | 2026-08-22 12:40 |
| 7 | A16 | `kaliningrad-dva-dnya-samostoyatelno` | idem | idem | idem | 2026-08-23 16:05 |
| 8 | A17 | `krasnoyarsk-odin-den-ekskursii` | idem | idem | idem | 2026-08-26 11:20 |
| 9 | A18 | `yaroslavl-zolotoe-koltso-vykhodnye` | idem | idem | idem | 2026-08-26 18:30 |
| 10 | K1 | `moskva-parki-open-air-vyhodnye` | idem | idem | idem | 2026-08-04 10:40 |
| 11 | K2 | `ural-den-v-gorah-max` | idem | idem | idem | 2026-08-11 11:10 |

**На статью:**

- [ ] GPT или owner: MD `status: DRAFT`, NOTE по таблице выше (Pack C)
- [ ] GenerateImage → cover `{slug}.jpg` + `imageAlt` в frontmatter
- [ ] GenerateImage → `-inline.jpg` (другая сцена, не cover)
- [ ] GenerateImage → `-inline-2.jpg` (если в body два shortcode)
- [ ] Shortcodes `[image side=… src=… alt=…]` совпадают с файлами
- [ ] `content/blog/{slug}.md` в репо
- [ ] Owner OK текста → `publishedAt` по слоту → `PUBLISHED` → sync/deploy/upsert
