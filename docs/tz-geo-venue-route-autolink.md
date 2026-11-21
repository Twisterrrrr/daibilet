# ТЗ: автопривязка экскурсий к ближайшим памятникам / локациям (geo)

**Статус:** draft  
**Дата:** 2026-07-31  
**Связь:** Phase 0 dependency для качества [«Собери свой день»](./tz-soberi-svoy-den.md) - без наполненных coords/STOP матч дня деградирует в nearby по стартам.  
**Область:** Location ↔ Excursion / `EventVenueRouteItem`  
**Ветка:** `feat/next-monorepo`  
**Вне поставки этого ТЗ:** finance / YooKassa / `.159`, wide catalog CTA

---

## 1. Цель / вне скоупа

### Цель
Дать редакторам и пайплайну **автоматический geo-матчинг** «экскурсия ↔ локация/памятник» на основе `Venue.latitude` / `Venue.longitude`, чтобы:

- предлагать кандидатов на **явные остановки маршрута** (`RouteItemRole = STOP`);
- опционально помечать geo-хабы (`NEARBY_HUB`) без подмены старта;
- ускорить наполнение `event_venue_route_items`, где сейчас STOP почти пустые, а UI живёт на runtime-fallback `nearbyEvents`.

### Вне скоупа
- SEO-тексты, blog, hero copy, must-see seed-контент, `hookFact` (кроме чтения).
- Смена канона `Event.venueId` (старт).
- Merge `nearbyEvents` в `stopEvents` на public API / UI.
- Finance, supplier LC, YooKassa, `.159`.
- Wide catalog CTA.
- PostGIS как обязательная зависимость MVP (допустима haversine + bbox, как сейчас в public).

---

## 2. Термины

| Термин | Значение в продукте |
|--------|---------------------|
| **START** | Точка старта экскурсии. Канон: только `Event.venueId`. Enum `RouteItemRole.START` **reserved** (MVP не пишет). |
| **STOP** | Явная остановка маршрута в `EventVenueRouteItem` (`role=STOP`). Источник правды для «экскурсия включает это место», `stopEvents`, `venueStops`, SEO/витрина «включают». |
| **NEARBY_HUB** | Reserved роль в enum: явный «хаб рядом» (не остановка маршрута). MVP public **не читает** эту роль; сейчас «Рядом» = runtime geo. |
| **nearby UI («Рядом»)** | Public fallback: если у venue **нет** `stopEvents`, и есть coords → события, чей **старт** (`Event.venueId` → start venue coords) в радиусе **≤ 300 м** (haversine). Подпись UI: «Рядом». **Не merge** со STOP. |
| **stopEvents** | Public DTO: события с явным STOP на эту площадку (и merged venue ids группы). |
| **venue-links (admin)** | CRUD STOP-рядов: `PUT /api/admin/events/:id/venue-links`; форма `AdminEventVenueLinksForm`. `Event.venueId` не меняется. |

---

## 3. Данные и инварианты

### Схема (уже есть)
```text
enum RouteItemRole { STOP | START | NEARBY_HUB }

model EventVenueRouteItem {
  id, eventId, venueId
  role      RouteItemRole @default(STOP)
  sortOrder Int
  label     String?
  @@unique([eventId, venueId, role])
  @@map("event_venue_route_items")
}

Venue.latitude / Venue.longitude  Float?
Event.venueId                     // только старт
Venue.kind                        // в т.ч. MONUMENT, PARK, ATTRACTION, MUSEUM_ART_SPACE, …
```

### Инварианты (жёстко)
1. **`Event.venueId` = только старт.** Автомат и admin venue-links **никогда** не переписывают `venueId`.
2. **STOP ≠ nearby.** Explicit STOP пишет pivot; geo «Рядом» - runtime, пока STOP пуст.
3. Admin write сейчас принимает **только `role=STOP`** (другие роли skip). Расширение на `NEARBY_HUB` - отдельное решение (см. §5).
4. Unique `(eventId, venueId, role)`: одна роль на пару; STOP и NEARBY_HUB теоретически могут сосуществовать, но MVP **не должен** дублировать смысл без нужды.
5. Не линковать venue на самого себя как STOP, если это тот же id, что `Event.venueId` (старт уже выражен через `venueId`).
6. Кандидаты только с валидными coords (те же правила, что `isValidVenueCoordinatePair` / public).
7. События-кандидаты: `status NOT IN ('HIDDEN','DRAFT')` (как public).
8. Целевые локации для матчинга: предпочтительно `pageStatus` ∈ `{PUBLISHED, CANDIDATE}` и `kind` из allowlist (MONUMENT, PARK, ATTRACTION, MUSEUM_ART_SPACE, OUTDOOR_LOCATION, …) - конфиг, не хардкод в SQL без константы.

### Текущий runtime nearby (эталон порога)
- BBox prefilter: `abs(Δlat) ≤ 0.005`, `abs(Δlng) ≤ 0.005` (~550 м по широте).
- Точный фильтр: `haversineMeters ≤ 300`.
- Limit: 12, sort by distance.
- Сейчас сравнивается **координата страницы venue** с **координатой start venue события** (`e.venueId`), не с STOP-точками.

---

## 4. Алгоритм

### 4.1. Расстояние
- MVP: **haversine** (уже есть `haversineMeters` в backend `dto.js`).
- PostGIS / `earthdistance` - optional Phase B, если объём кандидатов станет узким местом.

### 4.2. Пороги (конфиг, дефолты)
| Параметр | Default | Назначение |
|----------|---------|------------|
| `SUGGEST_STOP_RADIUS_M` | **150** | Жёсткий кандидат на STOP (памятник «на маршруте» у старта / известной точки). |
| `SUGGEST_NEARBY_RADIUS_M` | **300** | Согласовано с public nearby UI. |
| `SUGGEST_SOFT_RADIUS_M` | **500** | Soft-suggest в admin (требует ручного approve). |
| `BBOX_DEG` | `0.005`…`0.008` | Prefilter до haversine. |
| `MAX_CANDIDATES_PER_EVENT` | 20 | Cap выдачи. |
| `MAX_AUTO_APPLY_PER_EVENT` | 5 | Cap автозаписи STOP за прогон. |

Пороги вынести в env/константу; не разъезжаться с public 300 м для «nearby-класса».

### 4.3. Направления матчинга
**A. Event → Venues (основной для наполнения STOP)**  
Опорная точка: coords **start venue** (`Event.venueId`).  
Найти venue-локации в радиусе (не равные start), отфильтровать kind/pageStatus, отсортировать по distance.

**B. Venue → Events (для страницы локации / batch по must-see)**  
Опорная точка: coords venue.  
Найти events, у которых start (или уже существующий STOP) в радиусе.  
Использовать для suggest на venue admin / batch «наполнить Пермь».

**C. (Опционально Phase B)** Event → Venues от **уже известных STOP** coords (расширение маршрута), не только от старта.

### 4.4. Кандидаты и скоринг
Для каждой пары `(event, venue)`:
```
distanceMeters = haversine(anchor, venue)
sameCityBonus   = event.primaryCityId == venue.cityId ? 1 : 0
kindScore       = MONUMENT/PARK/ATTRACTION > MUSEUM > OTHER
confidence =
  distance ≤ 150 → high
  150 < d ≤ 300 → medium
  300 < d ≤ 500 → low
```
Исключить:
- уже есть STOP на эту пару;
- venue == `Event.venueId`;
- ONLINE / без coords;
- HIDDEN venues / DRAFT events.

### 4.5. Дедуп
1. Unique `(eventId, venueId, role)` на insert.
2. В рамках одного suggest-прогона: один venue на event на роль.
3. Merged venue groups (если public уже мержит ids): не предлагать дубликаты aliases одной канонической площадки.
4. При apply: idempotent upsert; не wipe существующих STOP, которых нет в payload (режим **merge**, не replace-all admin form).

---

## 5. Режимы: dry-run / auto-suggest / apply

| Режим | Поведение | Запись в БД |
|-------|-----------|-------------|
| **dry-run** | Считает кандидатов, отдаёт JSON/CSV: eventId, venueId, distance, confidence, action. | Нет |
| **auto-suggest** | Пишет предложения во временный слой **или** отдаёт в admin UI queue (preferred). | Нет в `event_venue_route_items` (или таблица `…_suggestions`, если решим persist) |
| **apply** | Вставка `EventVenueRouteItem` `role=STOP` (+ опционально label = null / «Остановка у {title}»). | Да |

### Approve policy (рекомендация owner-канона)
- **`confidence=high` (≤150 м) + same city + kind allowlist:** можно **auto-apply** в batch с флагом `--apply --auto-high` (логировать).
- **`medium` (≤300 м):** только **ручной approve** в admin.
- **`low` (≤500 м):** только suggest, без batch-apply.
- **NEARBY_HUB:** по умолчанию **не писать** в MVP; public nearby остаётся runtime. Если owner захочет persist «Рядом» - отдельный флаг и чтение роли в public (вне MVP этого ТЗ).

CLI / admin job пример:
```bash
node scripts/suggest-venue-route-links.js --city=perm --mode=dry-run
node scripts/suggest-venue-route-links.js --city=perm --mode=apply --auto-high --limit=200
```

---

## 6. Admin UX

### Уже есть
- Блок «Места маршрута (STOP)» на карточке события: venueId/slug, label, sortOrder.
- Save → `PUT …/venue-links` (replace-all STOP для event).

### Добавить (MVP UX)
1. Кнопка **«Подобрать рядом»** на форме venue-links:
   - вызывает suggest API от start venue;
   - показывает список: title, kind, distance м, confidence;
   - чекбоксы → «Добавить выбранные» в rows (не автосейв).
2. Бейдж на уже существующих STOP: ручной / suggested / auto.
3. (Опционально) На странице venue admin: «Экскурсии рядом (suggest)» с approve → создаёт STOP на event.

### Не делать в UX
- Не давать UI менять `Event.venueId` через этот блок.
- Не смешивать подписи «Остановка» и «Рядом» в одном списке без разделения.

---

## 7. API / DTO влияние

### Public (минимальные изменения)
- **Не менять** контракт: `stopEvents` / `nearbyEvents` раздельно; nearby только если `stopEvents.length === 0`.
- После успешного STOP-наполнения nearby на локации **естественно пропадёт** (это желаемое поведение).
- DTO: опционально позже `distanceMeters` только во внутренних admin suggest, не обязательно в public.

### Admin
- Существующий `PUT /api/admin/events/:id/venue-links` - оставить; для batch apply лучше **merge-endpoint** или CLI, чтобы не стереть ручные STOP replace-all'ом.
- Новый (предложение):
  - `GET /api/admin/events/:id/venue-link-suggestions?radiusM=300`
  - `POST /api/admin/events/:id/venue-links:apply` body `{ links: [{ venueId, role:'STOP', label? }], mode: 'merge' }`

### Contracts
- При появлении admin DTO suggest - в `packages/contracts` (admin), public contracts не ломать.

---

## 8. SEO / контент - не трогать

- Не генерировать SEO title/description/H1 от автолинков.
- Не менять blog / колонки / cover / inline images.
- Не трогать `hookFact` автоматом.
- Не включать wide catalog CTA.
- Индексация venue page (`isIndexable` / weak page) - без изменений логики из-за suggest.

---

## 9. Не делать

1. **Не мержить** `nearbyEvents` в `stopEvents`.
2. **Не менять** `Event.venueId` автоматом или из venue-links.
3. **Не трогать** finance / YooKassa / supplier secrets / `.159`.
4. **Не force-push**, не коммитить `.env`.
5. **Не** считать runtime nearby заменой editorial STOP для SEO-программы «включают это место» (источник правды - pivot STOP).
6. **Не** писать `START`/`NEARBY_HUB` без отдельного решения owner (enum reserved).
7. **Не** replace-all STOP в batch apply (только merge / explicit allowlist ids).

---

## 10. Acceptance criteria + тест-кейсы

### Acceptance
- [ ] Dry-run по городу возвращает стабильный список пар с `distanceMeters` и не пишет БД.
- [ ] Apply high-confidence создаёт `EventVenueRouteItem(role=STOP)`, не трогает `Event.venueId`.
- [ ] Повторный apply идемпотентен (нет дублей unique).
- [ ] После STOP на venue: public `stopEvents.length > 0`, `nearbyEvents` пуст (fallback не включается).
- [ ] Venue без STOP и с coords: `nearbyEvents` по-прежнему ≤300 м от **start** venue события.
- [ ] Admin «Подобрать рядом» добавляет кандидатов в форму без автосейва; save идёт через существующий поток.
- [ ] Batch apply не удаляет заранее созданные вручную STOP.
- [ ] События DRAFT/HIDDEN и venue ONLINE/без coords не попадают в кандидаты.

### Тест-кейсы
| # | Кейс | Ожидание |
|---|------|----------|
| T1 | Start venue и памятник на 80 м, same city, kind=MONUMENT | high → STOP candidate / auto-apply ok |
| T2 | 220 м | medium → suggest only |
| T3 | 400 м | low → soft only, no apply |
| T4 | 280 м, но already STOP | не в suggest / skip insert |
| T5 | candidate venueId == event.venueId | exclude |
| T6 | Public venue с 0 STOP, соседний start 100 м | nearbyEvents ≥1, UI «Рядом» |
| T7 | После apply STOP на этот venue | stopEvents ≥1, nearbyEvents=[] |
| T8 | Apply merge при 2 ручных STOP | ручные остаются |
| T9 | Admin PUT venue-links по-прежнему не принимает role≠STOP | ignore / no write |
| T10 | Haversine unit: известная пара lat/lng ≈ N метров | погрешность в допуске |

---

## 11. Оценка / этапы MVP

### Phase 0 - канон уже сделан (не делать заново)
Prisma `EventVenueRouteItem` / roles, admin venue-links STOP, public stop/nearby 300 м, `Event.venueId`=старт.

### Phase 1 - MVP suggest (оценка: **1.5-2.5 дня**)
1. CLI dry-run + apply merge (`scripts/suggest-venue-route-links.js`).
2. Переиспользовать `haversineMeters` + bbox.
3. Пороги 150/300/500, city filter, kind allowlist.
4. Лог + счётчики; без PostGIS; без NEARBY_HUB write.
5. Смоук: 1 город (например Пермь must-see) dry-run → выборочный apply → проверка public DTO.

### Phase 2 - Admin UX (оценка: **1-1.5 дня**)
1. `GET …/venue-link-suggestions`.
2. UI «Подобрать рядом» + merge apply.
3. Защита replace-all: batch только merge endpoint.

### Phase 3 - optional (бэклог)
- Persist `NEARBY_HUB` + чтение в public вместо/вместе с runtime nearby.
- PostGIS index.
- Suggest от промежуточных STOP, не только start.
- Confidence в LocationCard analytics.

### Риски
- Грязные/нулевые coords → мусорные линки (нужен validate + same-city).
- Replace-all admin form vs batch merge - развести API.
- Слишком большой радиус → ложные STOP и «ломание» смысла nearby fallback.

---

**Критерий готовности MVP:** редактор может dry-run по городу, approve/auto-high применить STOP, на must-see локациях появляются `stopEvents`, `Event.venueId` и finance не затронуты, public контракт stop/nearby без merge сохранён.
