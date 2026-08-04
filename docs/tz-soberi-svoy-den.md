# ТЗ: «Собери свой день» (маршрут из точек → подбор экскурсий)

**Статус:** draft  
**Дата:** 2026-07-31  
**Связь:** [geo-autolink](./tz-geo-venue-route-autolink.md) = **Phase 0 dependency** для качества матча. Без coords + STOP на топ-точках фича покажет «дыру данных», не wow.  
**Стек:** `feat/next-monorepo` · Location ↔ Excursion · `EventVenueRouteItem`  
**Вне поставки MVP:** комбо-билет, finance / YooKassa / `.159`

---

## 1. Цель

Пользователь накликивает точки (Парк Горького + Пётр I + причал) → сайт показывает экскурсии, которые **максимально покрывают набор**, опционально позже - комбо-билет.

### Вне скоупа (MVP)
- Комбо-билет / пакетный AdmissionProduct (фаза 2)
- Автопокупка, изменение checkout / pay.daibilet.ru
- Гео-автозапись STOP в БД (отдельное ТЗ: [tz-geo-venue-route-autolink.md](./tz-geo-venue-route-autolink.md))
- Finance / YooKassa / `.159`

---

## 2. Продуктовый UX

### 2.1. Точка входа
- На карточке локации / venue / must-see: иконка **«В мой маршрут»** (не путать с общим «Избранное» wishlist, если оно уже есть - отдельный bucket `dayRoute`).
- На странице точки: та же кнопка.
- В хедере / sticky: счётчик «Маршрут · N» → страница/шит **«Мой день»**.

### 2.2. Экран «Мой день»
- Список выбранных точек (title, city, thumb, удалить, drag-reorder опционально).
- Блок **«События поблизости»**: карточки с score покрытия (`3 из 3 точек`, `2 из 3`).
- Пустые состояния:
  - 0 точек → CTA «Добавьте места из гида города»
  - точки есть, туров 0 → «Пока нет экскурсии, покрывающей набор» + ссылка на афишу города / «Рядом» по одной точке
- Лимит MVP: **2-8 точек**, один город (если точки из разных городов - предупреждение, матч только по доминирующему city).

### 2.3. Не делать в MVP
- Оптимизация пешего порядка «как Google Maps trip»
- Шаринг публичного URL дня (фаза 1.5 ок)
- Push/email напоминания

---

## 3. Данные

### Хранение набора (MVP)
| Вариант | Когда |
|---------|--------|
| **A. localStorage / cookie** `dayRoute: { cityId, venueIds[] }` | Гость, быстрый старт |
| **B. User favorites kind=`DAY_ROUTE`** | Если уже есть auth + favorites |

Рекомендация: **A сейчас**, B когда появится стабильный wishlist API.

### Источники покрытия экскурсии ↔ точка
Приоритет score (жёстко разделить в UI):

1. **STOP** (`EventVenueRouteItem.role=STOP`) - «в маршруте»
2. **START** (`Event.venueId`) - «старт у точки»
3. **Nearby fallback** (haversine ≤300 м от start venue) - бейдж **«рядом»**, не считать полным покрытием для SEO-текста «включает»

Инвариант: не подменять STOP runtime-nearby в выдаче «покрывает».

### Prefill контента точек
Для ценности фичи нужны coords + осмысленные карточки; без STOP фича деградирует в «nearby по стартам». Зависимость: editorial/geo STOP на топ-городах ([tz-geo-venue-route-autolink.md](./tz-geo-venue-route-autolink.md)).

---

## 4. Алгоритм подбора

Вход: `venueIds[]` (и `cityId`).

Для каждого активного события города (`status` не DRAFT/HIDDEN):

```
coveredStop  = | venueIds ∩ stopVenueIds(event) |
coveredStart = | venueIds ∩ { event.venueId } |
coveredNear  = | venueIds ∩ nearbyToStart(event, 300m) |  // только ids ещё не в stop/start
score        = 3*coveredStop + 2*coveredStart + 1*coveredNear
coveragePct  = coveredStop+coveredStart / |venueIds|
```

Сортировка: `score` ↓, затем `coveragePct` ↓, затем ближайшая дата сессии / цена.

Фильтры:
- только события того же `primaryCity` (или city выбранных точек)
- min score ≥ 1 (хотя бы одно касание)
- limit 12-24

Выдача в карточке:
- какие точки покрыты STOP / start / nearby (иконки)
- какие **не** покрыты (чтобы пользователь видел дыру)

---

## 5. API (предложение)

```
GET  /api/day-route/matches?venueIds=a,b,c
→ { cityId, venues[], matches: [{ eventId, score, covered: { stop[], start[], nearby[] }, missing[] }] }

# опционально auth позже
PUT  /api/me/day-route  { cityId, venueIds[] }
GET  /api/me/day-route
```

Public read-only match может работать без auth (ids в query). Rate-limit по IP.

Contracts: новый лёгкий DTO в `packages/contracts`, не ломать venue detail.

---

## 6. UI-компоненты
1. `AddToDayRouteButton` на LocationCard / LocationVenueLayout
2. `DayRouteBadge` в chrome (счётчик)
3. `DayRoutePanel` (page или sheet): список точек + matches
4. Аналитика: `day_route_add`, `day_route_match_view`, `day_route_event_click`

---

## 7. SEO
- Страница «Мой день» - **noindex** (персональная/утилитарная).
- Не плодить URL `/day/park+petr+prichal` в индекс без editorial.
- Каноникал точек / events не менять.

---

## 8. Не делать
- Не писать STOP автоматом из этой фичи
- Не менять `Event.venueId`
- Не merge nearby в stopEvents на витрине локации
- Не комбо-checkout в MVP
- Не finance

---

## 9. Acceptance
- [ ] Добавление/удаление точки обновляет счётчик
- [ ] 3 точки с общим STOP-туром → тур в топе с «3 из 3»
- [ ] Тур только nearby → в списке с бейджем «рядом», ниже чистых STOP
- [ ] Разные города → warning, матч по одному city
- [ ] Без точек / без матчей - понятные empty states
- [ ] Гость: набор переживает reload (localStorage)
- [ ] pay/checkout не затронуты

### Тест-кейсы
| # | Кейс | Ожидание |
|---|------|----------|
| T1 | 2 точки, оба STOP одного event | score max, «2 из 2» |
| T2 | 1 STOP + 1 только nearby | в covered разделение ролей |
| T3 | точка без туров | в missing у всех / empty matches |
| T4 | 9-я точка | блок или truncate с сообщением |
| T5 | logout/clear storage | маршрут пуст |

---

## 10. Этапы
| Phase | Что | Оценка | Зависимость |
|-------|-----|--------|-------------|
| **0** | Координаты + STOP на P0-городах (editorial + [geo-autolink](./tz-geo-venue-route-autolink.md)) | editorial/geo | иначе слабый match |
| **1 MVP** | Button + localStorage + match API + panel | **2-3 дня** | Phase 0 хотя бы Москва/СПб |
| **1.5** | Share link `?day=id1,id2` noindex | 0.5 дня | |
| **2** | Auth sync favorites | 1 день | user API |
| **3** | Комбо-билет / пакет | отдельно | каталог products |

**Критерий MVP:** пользователь собирает 2-5 точек одного города и видит ранжированные экскурсии с прозрачным покрытием STOP/start/nearby. Без комбо в MVP.
