# Москва mustSee → ~200: пайплайн (канон)

**Дата:** 2026-09-20  
**Статус:** ABCD / «ядро 25» **сняты**. Цель - залить curated mustSee в хаб, потом smoke выборкой.

**Целевая метрика:** ~200 in-city (LOCKED в Project.md). Финальное число после дедупа может быть **180 или 220** - не подгонять под 200.  
**Не путать:** `CANDIDATE` Venue из sync ≠ mustSee хаба.

---

## Три правила (owner 2026-09-20)

1. **Ключ дедупликации = координаты, не название.**  
   «Парк Горького» / «ЦПКиО» / «Парк культуры» - одна точка.  
   Расстояние **&lt; 50 м** = дубль. Название - только display + soft `name_review`.

2. **Метка expand / insert - на уровне точки.**  
   Одна точка может жить в хабе под одним slug, в дампе - под другим.  
   **expand** = расширяем карточку хаба, не insert.  
   **Источник правды для expand = hub**, не дамп. Дамп даёт кандидатов.

3. **Suburb POI 98 vs 58 - не путать слои.**  
   - mustSee in-city = **58**  
   - significantSuburbs = **8 городов × 5 POI = 40** (Сергиев Посад, Коломна, Звенигород, Архангельское, Истра, Абрамцево, Бородино, Мелихово)  
   - **58 + 40 = 98** - это не «хаб 98» и не мусор парсера.  
   Пригороды - day-trip слой, **не входят** в mustSee ~200.  
   В union их не смешивать.

Ошибка «хаб = 144» - отменена. Канон seed: **58** in-city.

---

## Что уже есть

| Артефакт | Кол-во | Файл |
|----------|--------|------|
| Дамп после редакции | **190** | `docs/drafts/moscow-must-see-201-edited.md` |
| Хаб in-city | **58** | `scripts/data/patch-moscow-hub-pack.js` + `moscow-hub-mustsee-names.json` |
| Diff / union | скрипт | `docs/drafts/_diff-moscow-mustsee.mjs` |
| ABCD ядро | **superseded** | `docs/drafts/moscow-must-see-core-25.md` |

Пересчёт: `node docs/drafts/_diff-moscow-mustsee.mjs`  
→ `moscow-must-see-union.json`, `moscow-dump-minus-hub.json`.

---

## Пайплайн (порядок)

1. **Union** - dump + hub, дедуп **только coords &lt; 50 м**. Выход: `moscow-must-see-union.json`.
2. **Роли на точке** - `expand` | `insert` | `hub_only`; отдельно `name_review` (похожее имя, &gt;50 м - руками).
3. **Геокодер API** по всем точкам сразу после union (Яндекс / DaData). Не из модели. Primary = lat/lng дампа, где есть.
4. **Intra-dump дедуп** coords &lt; 50 м.
5. **События** (MSK/API, когда доступ) - метка 2+ saleable рядом; не gate заливки.
6. **Описания** - батчи по 18-20, канон в `moscow-mustsee-etalon-10.md` (8 типов открытия, авточастоты, данные из seed). Эталон 10 approved → `moscow-mustsee-batch-01.md` и далее.
7. **Фото** - диск + `MOSCOW_IMAGES`.
8. **JSON-LD** - Place / TouristAttraction.
9. **Seed** - dry-run → owner OK → apply MSK.
10. **IndexNow** + sitemap.
11. **Приёмка** - случайные **10** из залитых. 8/10 ок → дальше.

---

## Категории (не изобретать)

Источник правды:
- **тип площадки** = public kind из `venue-meta.ts` (`theater`, `museum`, `park`, `club_bar_restaurant`, …)
- **чип хаба** = только `MustSeeFilterId` из `must-see-filters.ts` (`gastro`, `museum`, `park`, `main`, …)

В хабе **нет** вкладки «Театры». Театр → `type: theater`, `mustSeeFilter: main` (не `park`).  
Гастро → `type: club_bar_restaurant`, `mustSeeFilter: gastro`.  

Запрещено: sticky-секции дампа (`## Парки` → всё ниже = park), выдуманные id `family` / `unusual` / отдельная секция theater.

Скрипт: `scripts/build-moscow-mustsee-seed-draft.mjs` классифицирует по **имени**, секция дампа - только слабый hint.

---

## Счётчики union (coords + name_review decisions, 2026-09-20)

| | |
|--|--|
| dump | **190** |
| hub mustSee | **58** |
| expand (coords &lt;50 м + name_review) | **40** |
| insert (после intra-dump) | **143** |
| hub_only | **23** |
| name_review open | **0** (21 decisions applied) |
| **union** | **206** (не подгонять) |

Файлы:
- `moscow-must-see-union.json`
- `moscow-must-see-name-review.md` + `moscow-must-see-name-review-decisions.json`
- `moscow-must-see-seed-draft.json` (143 insert placeholders)
- `moscow-must-see-geocode.json` (в прогоне Nominatim; Yandex/DaData если ключ в env)

---

## Definition of done (волна 1)

- [x] Union coords-only (&lt;50 м); name не auto-merge
- [x] Suburb 98 разобран: 58 + 40 day-trip, не мусор
- [x] `name_review` выгружен → `moscow-must-see-name-review.md` (21)
- [x] Draft seed skeleton → `moscow-must-see-seed-draft.json` (insert+expand)
- [x] Геокодер API по union → `moscow-must-see-geocode.json` (Nominatim **221/221** ok)
- [x] Ручной разбор `name_review` (21 → 0 open)
- [x] Описания: эталон 10 approved + канон батчинга (8 открытий, данные seed, `не+глагол` ≤30%, батчи 18-20)
- [x] batch 01–11 PASS freqs (`scripts/check-mustsee-batch-freqs.mjs`)
- [x] Assemble: `descStatus=ready` **201/201** + `scripts/data/must-see-editorial-moscow.json` (201; coords 201/201)
- [x] Slug Измайлово разведён: insert `moscow-izmaylovskiy-park` / hub_only `moscow-izmaylovskiy-park-i-kreml` (cityInfo + patch + image alias)
- [x] enrich: expand keyed `(hubSlug + title)`; insert/hub_only slug uniqueness assert; shared hub OK (Арбат×3, Царицыно×2, …)
- [ ] Фото: 20–30 приоритетных insert; остальные `photoStatus: missing` (не блокер apply)
- [x] Дубли в etalon: `В Лаврушинском` ×1
- [x] Чекер: unicode-границы; `а не …` ≠ «не X»
- [x] Seed filter: «Большая глина № 4» → `art` (editorial + seed-draft; было union `monument`)
- [ ] Dry-run seed: local PG `:5437` ECONNREFUSED → нужен MSK `DATABASE_URL` / VPN
- [ ] Apply волнами: 50 → smoke 10 → 75 → 76 (`--limit=` + `--file=scripts/data/must-see-editorial-moscow.json`)
- [ ] Owner OK → apply MSK
- [ ] Smoke 10 + IndexNow

---

## Apply (порядок)

1. Починить slug Измайлово + проверить enrich shared hub — **done 2026-09-21**.
2. Поднять DB (MSK tunnel / local `:5437`).
3. Dry-run: `node scripts/enrich-must-see-editorial.js --dry-run --file=scripts/data/must-see-editorial-moscow.json --cities=moscow`
4. Apply wave 1: `--apply --limit=50` → smoke 10 URL.
5. Wave 2: 75, wave 3: 76.
6. Фото — отдельной веткой, не блокировать seed.

- Не возвращаться к ABCD как gate.
- Не подгонять число под ровно 200.
- Не класть suburb POI в mustSee ~200.
- Не merge по названию без coords &lt; 50 м.
- Не геокодить «по названию площади», если lat/lng уже в дампе.
