# Москва mustSee → ~200: пайплайн (канон)

**Дата:** 2026-09-20  
**Статус:** ABCD / «ядро 25» **сняты** как протокол приёмки. Цель - залить ~200 локаций в хаб, потом smoke выборкой.

**Целевая метрика:** ~200 curated mustSee in-city (LOCKED в Project.md).  
**Не путать:** `CANDIDATE` Venue из sync ≠ mustSee хаба.

---

## Что уже есть (не начинать с нуля)

| Артефакт | Кол-во | Файл |
|----------|--------|------|
| Дамп после редакции | **190** | `docs/drafts/moscow-must-see-201-edited.md` |
| Хаб in-city (seed pack) | **58** | `docs/drafts/moscow-hub-mustsee-names.json` + `scripts/data/patch-moscow-hub-pack.js` |
| Diff dump↔hub | скрипт | `docs/drafts/_diff-moscow-mustsee.mjs` → `moscow-dump-minus-hub.json` |
| Старый черновик 58 | справочно | `docs/drafts/moscow-must-see-draft.md` |
| ABCD ядро | **superseded** | `docs/drafts/moscow-must-see-core-25.md` |

### Счётчики union (2026-09-20, порог **50 м** / имя)

Скрипт: `node docs/drafts/_diff-moscow-mustsee.mjs`  
Парсит **только** `mustSee` до `significantSuburbs` (не suburb POI).  
Выход: `moscow-must-see-union.json`, `moscow-dump-minus-hub.json`.

| | |
|--|--|
| dump | **190** |
| hub mustSee | **58** |
| expand (дамп ∩ хаб) | **42** |
| insert (только дамп, после intra-dump &lt;50 м) | **141** (−7 дублей внутри дампа) |
| hub-only (в хабе, нет в дампе) | **23** (Сити, Зоопарк, Планетарий, Винзавод, Artplay, Флакон, Горького, Музеон, смотровые, часть улиц…) |
| **union in-city** | **206** |

Цель после лёгкого editorial trim: **~200**.  
Ошибка «хаб = 144» - отменена. Канон seed: **58**.

---

## Пайплайн (порядок)

1. **Свести списки** - dump 190 + hub-only ~19 + уже засеянные 58. Дедуп по имени + coords. Выход: `moscow-must-see-union.json` (draft).
2. **Пометить overlap** - `expand` | `insert` | `hub_only`.
3. **Координаты через API** - Яндекс Geocoder / DaData. Не из модели. Primary = coords из дампа, где уже есть.
4. **Дедуп по coords** - расстояние **&lt; 50 м** = дубль (ужесточить скрипт с 100 → 50).
5. **События** - когда есть MSK/API: отметить точки с 2+ saleable рядом (не блокер заливки; справочные точки без афиши допустимы).
6. **Описания** - 2–3 абзаца «в один укус», не академический.
7. **Фото** - файл на диск + map в `MOSCOW_IMAGES` / city-place-images.
8. **JSON-LD** - Place / TouristAttraction: geo, address, openingHours где есть.
9. **Seed в хаб** - `seed-cityinfo-must-see-venues.js` / patch pack; **prod DB только по OK owner**.
10. **IndexNow** + sitemap.
11. **Приёмка** - не 25 ABCD, а **случайные 10** из залитых через 2–3 дня. Если 8/10 ок - катим остальное / правки шаблона.

---

## Параллельно (без блокировки seed draft)

- Геокодер по всем 200.
- Выгрузка events MSK (psql/API) - афиша как обогащение, не gate.
- Codex: не мешать crawler/backend; этот трек = content/seed (`scripts/data`, `docs/drafts`, images).

---

## Definition of done (волна 1)

- [x] Union-файл с expand/insert/hub_only и coords (`moscow-must-see-union.json`, 206)
- [x] Дедуп &lt;50 м (dump↔hub + intra-dump); geocoder API - следующий шаг
- [ ] Draft seed локально / dry-run
- [ ] Owner OK → apply MSK
- [ ] Smoke 10 карточек (фото + текст + geo + ссылка в хаб)
- [ ] IndexNow отправлен

---

## Не делать

- Не возвращаться к ABCD как gate перед заливкой.
- Не ждать «идеальных 5 nearby-insert» - хаб уже покрыл популярные места.
- Не путать suburb significantSuburbs с mustSee 200.
- Не геокодить «по названию площади», если есть lat/lng в дампе.
