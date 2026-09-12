# Города вне публичного каталога destinations

Дата аудита: 2026-07-19 (prod DB тогда на historical host `213.171.7.16`; live catalog сейчас MSK `.184`)
**Обновление политики:** 2026-07-19 — см. ниже; код `data/geo/city-routing.ru.json` + `isPublicRegionName`.

Критерий включения в исходную выборку: distinct `City.title` с событиями **READY** и/или **saleable**, но город **не** был в `standaloneCities` на момент аудита (36 city destinations).

## Политика (зафиксировано 2026-07-19)

| Ситуация | Куда кладём | В сводке «дыр»? |
|----------|-------------|-----------------|
| Адм. центр субъекта + saleable | `standaloneCities` (+ hub) | нет — публичный city |
| Город субъекта, не центр | `cityToRegion` → область/край/республика | **нет** - штатная свёртка |
| Мелкий посёлок без хаба (Лебяжье, …) | только `cityToRegion`, не standalone | нет |
| Туристический магнит не-адмцентр (Сортавала) | dual: `standaloneCities` + `cityToRegion`; индекс `/cities` при events > 5; search сразу | нет |
| Набережные Челны | `cityToRegion` → Республика Татарстан → под карточкой **Казани** | нет (после fix republic) |
| Зарубежье (Батуми, Осака, …) | `foreignCities` — cut из destinations и public catalog sessions | нет — намеренный отсев |
| Нет saleable | не попадает в destination buckets | `no-saleable` |

**Не считать `cityToRegion` «дырой» allowlist** — это намеренный region bucket.

### 2026-08-20 audit note
- Dual (Тольятти/Сургут/Новокузнецк/Сортавала) и fold Зеленоград/Щербинка/Пушкин - intentional.
- Orphan region target: `Каспийск` → `Республика Дагестан` (нет в `region-hubs.ru.json`). Hub не invent - оставляем thin region до отдельного решения owner.
- Alias: destination slug `novokuzneck` vs asset `novokuznetsk`; `khanty-mansiysk` → `hanty-mansiysk` (web focus + images).

## 2026-07-19 — хвост allowlist (63) + зарубежье

После expand адмцентров оставалось **63** города только с причиной `allowlist`. Закрыто:

| Действие | Кол-во | Примеры |
|----------|-------:|---------|
| `cityToRegion` → субъект РФ | **59** | Балашиха→МО, Выборг→ЛО, Туапсе→Краснодарский край, … |
| Fold в standalone city | **3** | Зеленоград→Москва, Щербинка→Москва, Пушкин→Санкт-Петербург |
| `foreignCities` (cut) | **1** (+Осака вне хвоста) | Батуми; Осака убрана из `cityToRegion`→Япония |

**Без маппинга из хвоста 63:** 0.

Механизм: `data/geo/city-routing.ru.json` → `foreignCities`; `dto.js` / `public-catalog.mapper.ts` отсекают foreign в `mapGroupedPublicSession` и `isAllowedPublicDestination`. Мелкие города **не** добавлялись в `standaloneCities`.

## Исправления после аудита

1. **`republic-regex`:** `isPublicRegionName` принимает префикс `Республика …` (`/^республика(?:\s|$)/iu`) и суффиксы `область|край|республика|округ`. Челны видны в `Республика Татарстан` под Казанью.
2. **standaloneCities:** + адмцентры с saleable (Владивосток, Хабаровск, Иркутск, Барнаул, Чебоксары, Липецк, …) — не все 126 и не посёлки.
3. **cityToRegion:** Тольятти→Самарская, Магнитогорск→Челябинская, Сортавала→Карелия, Лебяжье→ЛО, Королёв/Подольск/…→МО, и др.
4. **foreignCities + хвост 63:** см. секцию выше.

## Сводка причин (на момент аудита, до expand)

Всего исключённых городов на аудит: **144**

| Причина (сводка аудита) | Кол-во | Комментарий после политики |
|---|---:|---|
| allowlist | 126 | Часть → standalone (адмцентры) или cityToRegion |
| cityToRegion | 8 | **Не дыра** — штатная свёртка |
| no-saleable | 8 | без изменений |
| republic-regex | 1 | **Исправлено** (Челны) |
| other | 1 | «Не указан» |

## Таблица аудита (историческая)

Ниже — снимок на момент аудита (причина = что блокировало **city** listing тогда). Актуальный routing — в JSON.

| Город | Событий (READY/saleable) | Причина (аудит) | После политики |
|---|---:|---|---|
| Сортавала | 0/877 | allowlist | **standalone 2026-08-17** (search + URL; сетка `/cities` при events > 5) |
| Раменское | 362/199 | cityToRegion→Московская область | без изменений (region) |
| Лебяжье | 0/72 | allowlist | cityToRegion→Ленинградская область |
| Чебоксары | 75/62 | allowlist | **standalone** |
| Светлогорск | 68/54 | allowlist | cityToRegion→Калининградская область |
| Владивосток | 31/31 | allowlist | **standalone** |
| Тольятти | 21/17 | allowlist | **standalone 2026-08-17** (сетка да, 18 READY) |
| Липецк | 15/17 | allowlist | **standalone** |
| Новороссийск | 20/12 | cityToRegion→Краснодарский край | region |
| Королёв | 14/11 | allowlist | cityToRegion→Московская область |
| Хабаровск | 10/10 | allowlist | **standalone** |
| Сургут | 18/9 | allowlist | **standalone 2026-08-17** (сетка да, 14 READY) |
| Иркутск | 10/9 | allowlist | **standalone** |
| Барнаул | 9/8 | allowlist | **standalone** |
| Набережные Челны | 9/8 | republic-regex | cityToRegion→Республика Татарстан (под Казанью) |
| Курган | 8/8 | allowlist | **standalone** |
| Киров (Кировская область) | 3/8 | allowlist | **standalone** |
| Новокузнецк | 19/7 | allowlist | **standalone 2026-08-17** (сетка да, 9 READY) |
| Пенза | 7/6 | allowlist | **standalone** |
| Подольск | 7/6 | allowlist | cityToRegion→Московская область |
| Череповец | 6/6 | allowlist | cityToRegion→Вологодская область |
| Иваново | 4/6 | allowlist | **standalone** |
| Владимир | 12/5 | allowlist | **standalone** |
| Кемерово | 5/5 | allowlist | **standalone** |
| Чита | 5/4 | allowlist | **standalone** |
| Не указан | 4/4 | other:нет primaryCity | — |
| Улан-Удэ | 4/4 | allowlist | **standalone** |
| Магнитогорск | 3/3 | allowlist | cityToRegion→Челябинская область |
| Саранск | 3/3 | allowlist | **standalone** |
| Тамбов | 3/3 | allowlist | **standalone** |
| Брянск | 3/2 | allowlist | **standalone** |
| Архангельск | 2/2 | allowlist | **standalone** |
| Белгород | 2/2 | allowlist | **standalone** |
| Курск | 2/2 | allowlist | **standalone** |
| Мурманск | 2/2 | allowlist | **standalone** |
| Смоленск | 2/2 | allowlist | **standalone** |
| Сыктывкар | 2/2 | allowlist | **standalone** |
| Южно-Сахалинск | 2/2 | allowlist | **standalone** |
| Астрахань | 1/2 | allowlist | **standalone** |
| Калуга | 1/1 | allowlist | **standalone** |
| Кострома | 1/1 | allowlist | **standalone** |
| Йошкар-Ола | 2/2 | allowlist | **standalone** |
| Благовещенск (Амурская область) | 2/2 | allowlist | **standalone** |

Полный список аудита (включая 1-saleable и no-saleable) сохранён в git history коммита аудита; актуальная маршрутизация — только JSON + код.
