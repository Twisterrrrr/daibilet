# План путеводителей (контентная воронка → CHPU)

**Дата:** 2026-07-23 (календарь антиспам пересобран 2026-07-23 вечер)  
**Цель:** статьи-гиды → утверждённые category×city / intent посадки.  
**Статус:** batch #1 (10 шт., Казань + Екб) утверждён; **пачка A + МСК/СПб** - тексты владельца (анти-ИИ) в `content/blog/`, CMS `PUBLISHED` + `publishedAt` по **хаос-календарю** (не ровно 3/день 09:00); пачка B (остаток batch #1) ждёт тексты GPT.  
**Первая генерация:** эталоны ТЗ №1 (ID 1), №2 (ID 8), №3 (ID 10) - см. `seo-guide-articles-gpt-prompt.md` → «Эталонные ТЗ (3 типа)».

Связанные файлы:
- CSV: `docs/seo-guide-articles-plan.csv`
- GPT-промпт: `docs/seo-guide-articles-gpt-prompt.md` (System + User-templates эталонов)

## Правила

- В copy только обычный дефис `-` (без длинного/среднего тире).
- Каждая статья = 1 главный deep-link на живой CHPU + 1-2 соседних ссылки по смыслу.
- Mid-article CTA - нативная плашка `[NOTE …]`, не мелкая ссылка только в конце.
- Thin landing (`noindex` при &lt; 6 офферов) можно упоминать как UX-ссылку; для batch #1 CTA всё равно ведём на рабочие CHPU из таблицы.
- Канон экскурсий Казани/Екб: `/ekskursii/{city}` (slug `excursions`).
- **Загородные:** роут `/zagorodnye-ekskursii/{city}` разрешён только для `saint-petersburg` (`LANDING_ALLOWED_CITY_SLUGS`). Для Казани/Екб в batch #1 CTA = `/ekskursii/{city}` (зафиксировано ниже).
- Отдельного CHPU «смотровые площадки» нет → CTA = `/ekskursii/ekaterinburg`.
- Год в H1 / `title` / `seoTitle` / `seoH1` - обновляемый (сейчас **2026**).
- **Публикация (антиспам, решение владельца 2026-07-23):** «живая редакция», не конвейер.
  - **Не** ровно N статей каждый день и **не** круглые таймстампы (`00:00`, каждые 8ч, все в `09:00`).
  - Ритм-пример: **2 / 4 / 1 / перерыв вс**; времена вроде `11:15`, `16:40` MSK.
  - В дневной пачке **миксовать города**.
  - Технически: `status: PUBLISHED` + `publishedAt` (ISO `+03:00`); public API / sitemap: `publishedAt <= now`.
- **Авторские колонки (щит от антиспама):** 4 персоны (Макс «Изнанка маршрута», Анна «Город крупным планом», Елена «Спокойный маршрут», Игорь «Место силы»; плюс Артур «На вкус»). Публиковать колонку в **пн**; в этот день **не** выкладывать SEO-гиды.
- **Микс шаблонов (~⅓ / ~⅓ / ~⅓):** длинный гид 5–7к; короткая подборка ТОП-5 ~3к; событийный анонс фестиваля/вечера. Не все статьи-близнецы по структуре (см. GPT-prompt).
- **Safety (индекс):** если Яндекс/GSC глотает **80–90%** URL - ок; если «малоценная» / не в индекс - снизить до **1 гид/день**. Owner action в Вебмастере (см. `docs/qa.md`, `docs/Diary.md`).

## Batch #1 - приоритет генерации (10 статей)

| # | Title | Город | Целевой CHPU (подтверждён) | Mid CTA акцент | Приоритет |
|---|-------|-------|----------------------------|----------------|-----------|
| 1 | Что посмотреть в Казани за 2-3 дня самостоятельно: готовый маршрут с картой | Казань | `/ekskursii/kazan/` | Пешая экскурсия Кремль + город | Критический |
| 2 | Куда съездить из Казани на один день: Свияжск, Болгар, Голубые озера | Казань | `/ekskursii/kazan/` | Загородный день / экскурсии из города | Критический |
| 3 | Казань с воды: лучшие маршруты речных прогулок по Волге и Казанке 2026 | Казань | `/rechnye-progulki/kazan/` | Речные прогулки | Критический |
| 4 | Куда сходить в Казани вечером: бары, стендапы, вечерние огни | Казань | `/stendap-i-yumor/kazan/` | Стендап и вечерняя афиша | Критический |
| 5 | Топ-10 бесплатных локаций Казани: как посмотреть город без бюджета | Казань | `/podborki/besplatno/kazan` | Бесплатные события / локации | Критический |
| 6 | Красная линия Екатеринбурга за 4 часа: маршрут и точки | Екб | `/ekskursii/ekaterinburg/` | Обзорные / пешие экскурсии | Критический |
| 7 | Куда сходить в Екатеринбурге на выходных | Екб | `/podborki/na-vyhodnye/ekaterinburg` | Выходные в городе | Критический |
| 8 | Стендап в Екатеринбурге: где послушать уральский юмор и посмеяться | Екб | `/stendap-i-yumor/ekaterinburg/` | Стендап (агрессивный NOTE после форматов) | Критический |
| 9 | Смотровые площадки Екатеринбурга: куда подняться за видом | Екб | `/ekskursii/ekaterinburg/` | Экскурсии / маршруты с видами | Критический |
| 10 | Уральский Марс и Бажовские места: топ загородных экскурсий из Екатеринбурга | Екб | `/ekskursii/ekaterinburg/` | Загородные выезды (NOTE в логистике) | Критический |

**Эталоны типов (генерировать первыми, по одному):**

| Эталон | ID | Тип | User-template в промпте |
|--------|----|-----|-------------------------|
| ТЗ №1 | 1 | Городской путеводитель | User-template ТЗ №1 |
| ТЗ №2 | 8 | Событийный вечерний | User-template ТЗ №2 |
| ТЗ №3 | 10 | Загородный | User-template ТЗ №3 |

### CHPU-заметки (сверка с `landing-routes.ts` / intents)

| Запрос владельца | Рабочий URL | Комментарий |
|------------------|-------------|-------------|
| `/ekskursii/kazan` | `/ekskursii/kazan/` | OK (`excursions`) |
| `/zagorodnye-ekskursii/kazan` | **нет** → `/ekskursii/kazan/` | `country-tours` только СПб |
| `/rechnye-progulki/kazan` | `/rechnye-progulki/kazan/` | OK |
| `/stendap-i-yumor/kazan` | `/stendap-i-yumor/kazan/` | OK |
| `/podborki/besplatno/kazan` | `/podborki/besplatno/kazan` | Intent OK; может быть thin |
| `/ekskursii/ekaterinburg` | `/ekskursii/ekaterinburg/` | OK |
| `/podborki/na-vyhodnye/ekaterinburg` | `/podborki/na-vyhodnye/ekaterinburg` | Intent OK |
| `/stendap-i-yumor/ekaterinburg` | `/stendap-i-yumor/ekaterinburg/` | OK |
| unusual/смотровые | **нет** → `/ekskursii/ekaterinburg/` | Отдельного CHPU нет |
| `/zagorodnye-ekskursii/ekaterinburg` | **нет** → `/ekskursii/ekaterinburg/` | `country-tours` только СПб |

## Примеры CTA / плашки

Обычная ссылка в тексте:

1. Посмотреть актуальное расписание экскурсий по Казани можно на [странице экскурсий](https://daibilet.ru/ekskursii/kazan/).
2. Сравнить даты стендапа удобно в [подборке стендапа и юмора](https://daibilet.ru/stendap-i-yumor/ekaterinburg/).

Нативная mid-article плашка (рендер `BlogArticleNote`):

```
[NOTE label="Важно" text="Билеты на пешую экскурсию по Кремлю и городу лучше брать заранее. Проверить места: [Смотреть экскурсии по Казани](https://daibilet.ru/ekskursii/kazan/)."]
```

Финальный баннер (опционально, рядом с NOTE):

```
[CTA title="Экскурсии по Казани" text="Актуальные даты и форматы от организаторов." button="Смотреть экскурсии" href="https://daibilet.ru/ekskursii/kazan/"]
```

## Batch #2+ (бэклог, не первая пачка)

| # | Title | Город | Целевой CHPU | Приоритет |
|---|-------|-------|--------------|-----------|
| 11 | Москва за 2 дня: маршрут без очередей и лишней суеты | МСК | `/peshie-ekskursii/moscow` | Высокий |
| 12 | Речные прогулки по Москве: дневные и вечерние рейсы | МСК | `/rechnye-progulki/moscow` | Высокий |
| 13 | Стендап в Москве: открытый микрофон или большое шоу | МСК | `/stendap-i-yumor/moscow` | Высокий |
| 14 | Выставки и музеи Москвы: как выбрать сеанс | МСК | `/vystavki-i-muzei/moscow` | Высокий |
| 15 | Необычные театры Москвы: иммерсив и камерные форматы | МСК | `/neobychnye-teatry/moscow` | Средний |
| 16 | Бесплатно в Москве: куда сходить без билета | МСК | `/podborki/besplatno/moscow` | Средний |
| 17 | Москва на выходных: короткий список идей | МСК | `/podborki/na-vyhodnye/moscow` | Высокий |
| 18 | Петербург за 3 дня: классика и альтернативные маршруты | СПб | `/peshie-ekskursii/saint-petersburg` | Высокий |
| 19 | Речные прогулки по Петербургу: Нева, каналы и мосты | СПб | `/rechnye-progulki/saint-petersburg` | Высокий |
| 20 | Экскурсии по крышам Санкт-Петербурга: кому подойдёт формат | СПб | `/progulki-po-krysham/saint-petersburg` | Высокий |
| 21 | Загородные экскурсии из Петербурга: Петергоф, Пушкин и дальше | СПб | `/zagorodnye-ekskursii/saint-petersburg` | Высокий |
| 22 | Стендап в Петербурге: клубы, даты и как выбрать вечер | СПб | `/stendap-i-yumor/saint-petersburg` | Высокий |
| 23 | Выставки и музеи Петербурга: маршрут на один день | СПб | `/vystavki-i-muzei/saint-petersburg` | Средний |
| 24 | Необычные театры Петербурга: куда пойти вместо классики | СПб | `/neobychnye-teatry/saint-petersburg` | Средний |
| 25 | Петербург на выходных: план суббота-воскресенье | СПб | `/podborki/na-vyhodnye/saint-petersburg` | Высокий |
| 26 | Разводные мосты Петербурга: как увидеть с воды | СПб | `/saint-petersburg/night-bridges` | Средний |
| 27 | Дворы Петербурга: пешие маршруты по парадным и дворам | СПб | `/saint-petersburg/spb-yards` | Средний |
| 28 | Автобусные экскурсии по Москве: когда это удобнее пешком | МСК | `/avtobusnye-ekskursii/moscow` | Средний |
| 29 | Автобусные экскурсии по Петербургу для первого визита | СПб | `/avtobusnye-ekskursii/saint-petersburg` | Средний |
| 30 | Вечеринки на теплоходе в Москве: формат и как выбрать рейс | МСК | `/vecherinki-na-teplohode/moscow` | Средний |

## Очередь публикации

1. **Хаос-календарь** (микс городов + шаблонов + пн-колонки) - таблица ниже. Статус: `PUBLISHED` + `publishedAt`.
2. **Пачка B:** остальной batch #1 (ID 2, 3, 4, 5, 6, 7, 9) - универсальный User с явным `template_type`; график - хаос, не конвейер 3×09:00.
3. Затем остаток batch #2 High/Средний МСК/СПб.
4. Средний - после editorial polish и насыщения каталога.

## Типы шаблонов (микс ~⅓)

| Тип | Объём тела | Когда | Эталон / hint |
|-----|------------|-------|---------------|
| `long` | 5000-7000 | городской маршрут на 2-3 дня | ТЗ №1 |
| `top5` | ~3000 | короткая подборка ТОП-5 / «как выбрать» без лонгрида | укороченный User + списки |
| `events` | 3500-5500 | стендап / концерт / фест / ужин-формат | ТЗ №2 + событийный угол |

## Правило колонок (пн = щит)

| Колонка | Автор | Живые / в графике |
|---------|-------|-------------------|
| Изнанка маршрута | Макс | ✅ `fentezi-fest-bylinnyy-bereg`; ⏳ пн 27.07 `open-air-festy-vyhodnoi-ru` |
| Город крупным планом | Анна | ✅ `muzyka-v-osobnyakah-spb` |
| Спокойный маршрут | Елена | ✅ `spb-s-rebenkom-v-dozhd` |
| На вкус | Артур | ✅ `kazan-na-vkus-master-klassy` |
| Место силы | Игорь | ⏳ пн 03.08 `bylinnyy-bereg-fentezi-fest-volhov` |

`bylinnyy-bereg-fentezi-fest` (Макс, HIDDEN) - дубль live-колонки, **не** в график.

В **пн** - только колонка (или ничего); SEO-гиды в пн не ставить.

## Календарь публикации (антиспам / хаос)

Время: Europe/Moscow, `publishedAt` ISO `+03:00`. Ритм: **2 / 1 / вс-перерыв / пн-колонка / 2 / 1**.

| Дата | Время | Тип | Город | Slug |
|------|-------|-----|-------|------|
| **2026-07-23** чт | 09:00 | long | Казань | `kazan-2-3-dnya-samostoyatelno-karta` ✅ live |
| **2026-07-23** чт | 09:00 | events | Екб | `ekb-stendap-uralskiy-yumor` ✅ live |
| **2026-07-23** чт | 09:00 | long | Москва | `moscow-2-dnya-samostoyatelno-marshrut` ✅ live |
| **2026-07-24** пт | 11:15 | top5 | Екб | `ekb-uralskiy-mars-bazhovskie-ekskursii` |
| **2026-07-24** пт | 16:40 | long | СПб | `sankt-peterburg-3-dnya-samostoyatelno` |
| **2026-07-25** сб | 14:25 | top5 | Москва | `moskva-rechnye-progulki-kak-vybrat` |
| **2026-07-26** вс | - | - | - | **перерыв** |
| **2026-07-27** пн | 10:35 | column | СПб | `open-air-festy-vyhodnoi-ru` (Макс) |
| **2026-07-28** вт | 11:50 | events | Москва | `uzhin-na-teplohode-moskva-kak-vybrat` |
| **2026-07-28** вт | 18:20 | top5 | СПб | `rechnye-progulki-neva-kanaly-kak-vybrat` |
| **2026-07-29** ср | 15:10 | events | СПб | `koncerty-peterburg-osobnyak-klub-zal` |
| **2026-08-03** пн | 12:20 | column | регионы | `bylinnyy-bereg-fentezi-fest-volhov` (Игорь) |

## Пилот размещения

| ID | Slug | publishAt MSK | Тип | Статус | Cover |
|----|------|---------------|-----|--------|-------|
| 1 | `kazan-2-3-dnya-samostoyatelno-karta` | 2026-07-23 09:00 | long | ✅ live | уникальный jpg (batch A) |
| 8 | `ekb-stendap-uralskiy-yumor` | 2026-07-23 09:00 | events | ✅ live | уникальный jpg (batch A) |
| 11 | `moscow-2-dnya-samostoyatelno-marshrut` | 2026-07-23 09:00 | long | ✅ live | TODO уникальное фото |
| 10 | `ekb-uralskiy-mars-bazhovskie-ekskursii` | 2026-07-24 11:15 | top5 | ⏳ schedule | уникальный jpg (batch A) |
| 18 | `sankt-peterburg-3-dnya-samostoyatelno` | 2026-07-24 16:40 | long | ⏳ schedule | TODO уникальное фото |
| 12 | `moskva-rechnye-progulki-kak-vybrat` | 2026-07-25 14:25 | top5 | ⏳ schedule | TODO уникальное фото |
| - | `open-air-festy-vyhodnoi-ru` | 2026-07-27 10:35 | column | ⏳ schedule пн | jpg есть |
| 30 | `uzhin-na-teplohode-moskva-kak-vybrat` | 2026-07-28 11:50 | events | ⏳ schedule | TODO уникальное фото |
| 19 | `rechnye-progulki-neva-kanaly-kak-vybrat` | 2026-07-28 18:20 | top5 | ⏳ schedule | TODO уникальное фото |
| - | `koncerty-peterburg-osobnyak-klub-zal` | 2026-07-29 15:10 | events | ⏳ schedule | TODO уникальное фото |
| - | `bylinnyy-bereg-fentezi-fest-volhov` | 2026-08-03 12:20 | column | ⏳ schedule пн | jpg есть |

Пачка B (не размещена): ID 2, 3, 4, 5, 6, 7, 9.
