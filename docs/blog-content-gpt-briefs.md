# GPT-брифы: блог Дайбилет (owner assign)

Дата: 2026-07-27  
Связано: [content-blog-plan.md](./content-blog-plan.md), [seo-guide-articles-gpt-prompt.md](./seo-guide-articles-gpt-prompt.md), [landing-content-gpt-briefs.md](./landing-content-gpt-briefs.md)  
Персоны: [ai-journalists/README.md](./ai-journalists/README.md), [01-max.md](./ai-journalists/01-max.md), [00-editorial.md](./ai-journalists/00-editorial.md)

## Что в этой пачке

| Тип | Кол-во | Назначение |
|-----|--------|------------|
| Редакционные гиды | 9 | Разные углы: город, выходные, семья, концерты, река, поддержка SEO-лендингов |
| Колонки Макса | 2 | Авторский голос, литературный наблюдатель (Akunin-like), не SEO-лонгриды |

**Не дублировать** slug и кластеры из [content-blog-plan.md](./content-blog-plan.md) (инвентарь 33 MD + закрытые кластеры). Pack B = **новый угол** (intent / цены / карты), не rewrite 9 longforms.

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
citySlug: moscow | saint-petersburg | kazan | ekaterinburg
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

## Промпты: 9 гидов (редакция)

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
Мягкий CTA: афиша Москвы или подборка вечерних форматов.
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
CTA: мягко на афишу Екатеринбурга / экскурсии региона.
authorId max. column. DRAFT. Inline 1-2. Канон приветствия/финала.
```

---

## Batch workflow для владельца

1. **Подготовка:** открыть этот файл + [content-blog-plan.md](./content-blog-plan.md) (антидубли).
2. **GPT:** вставить System (гиды - из seo-guide-articles-gpt-prompt; колонки - System K выше) **один раз**.
3. **По одной статье:** копировать User A1…A9 или K1/K2. **Не** смешивать несколько тем в одном запросе.
4. **Сохранить** ответ как `{slug}.md` без markdown-ограждений ``` вокруг файла.
5. **Вычитка:** анти-ИИ чеклист из seo-guide-articles-gpt-prompt; проверить дефис `-`; убрать выдуманные цены/slug.
6. **Сдать агенту:** «размести пачку B, слоты из blog-content-gpt-briefs» + файлы или paste MD.
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
