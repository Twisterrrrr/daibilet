# Typecheck: разбор 29.09 — почему 191 ошибка не блокирует Wave 1

**Дата:** 2026-09-29. **Команда:** `apps/web` → `node node_modules/typescript/bin/tsc --noEmit`

```
tests:  994 pass / 0 fail
tsc:    191 ошибок
```

## Главный вывод

Правило «три зелёных перед деплоем» остаётся в силе, но картина не та, что
казалась: **на пути Wave 1 (venue PDP) ошибок нет вообще.** Все 191 — на других
поверхностях. Typecheck не является блокером Wave 1.

## Как это выяснилось

`git stash` не годится для такого сравнения — он не трогает закоммиченное
изменения, то есть сравнивал бы HEAD с самим собой. Проверка делалась так:

```bash
git checkout 2cc5c0977 -- apps/web/src/lib/event-card-meta.test.ts   # базовый файл
npx tsc --noEmit --pretty false | grep -c 'error TS'
git checkout HEAD -- apps/web/src/lib/event-card-meta.test.ts        # мой файл
npx tsc --noEmit --pretty false | grep -c 'error TS'
```

Результат: **baseline 192, моя ветка 198.** Шесть ошибок были моими — в
`event-card-meta.test.ts` я переписал фикстуры слотов и убрал `dateLabel`, который
`DateTimeSlot` требует по типу (форматтер его больше не читает, но DTO требует).
Исправлено, count вернулся к 192.

Ошибка в `venue-program.ts` (`session.eventTitle`) была **предсуществующей**: поля
нет в `PublicSessionDto`, и публичный маппер его не заполняет — fallback всегда был
`undefined`. Это была единственная ошибка на пути Wave 1; убрана.

## Почему web не проверяется: `ignoreBuildErrors`

```ts
// apps/web/next.config.ts:7-8
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true },
```

Добавлено коммитом `635eab187` (2026-07-19) «fix(web): skip lint/tsc in next
build on low-mem prod» — обход OOM на 4 ГБ VPS. С тех пор не возвращено, а
`web:typecheck` в CI так и не добавлен, потому что он был бы красным.

**Следствие:** все 191 ошибка молча проходили в прод. Ниже — что из этого вышло.

### Что нашлось при разборе

1. **6 ошибок были нашими.** `event-card-meta.test.ts`: при переписывании фикстур
   слотов убран `dateLabel`, который `DateTimeSlot` требует по типу. Baseline был
   192, стал 198. Исправлено через общий `slotFixture()`.

2. **Краш в «Мой день».** `DayRoutePanel.client.tsx` выполнял
   `void showStatusChip;` в начале тела компонента, а `const showStatusChip`
   объявлен на ~30 строк ниже — temporal dead zone, `ReferenceError` на каждом
   рендере строки маршрута. Переменная была мёртвой: фича grid/list удалила
   использование, а `const` и `void` остались. **Тихо уехало в прод.**

3. **Один предикат типа = 49 ошибок.** В том же файле `.filter()` объявлял
   `place.type` опциональным, а `.map()` выше всегда его писал. Предикат не
   соответствовал типу элемента (TS2677), TypeScript отказывался сужать, и все
   потребители ниже видели `row` как `| null` — 43 ошибки TS18047 из одной строки.

Итог по шагу 1: **191 → 140 ошибок**, `DayRoutePanel` 66 → 15.

## Классификация

| Зона | Ошибок | Блокирует Wave 1 |
|------|--------|-------------------|
| **A1 Venue PDP (Wave 1)** | **0** | нет |
| A2 `Мой день` / day-route | 58 | нет |
| A3 События (event/session/home) | 0 | нет |
| A4 SEO-поверхность (хабы, лендинги) | 21 | нет |
| A5 Остальное (blog, каталог, тесты) | 61 | нет |

Зоны Codex (`apps/backend`) в этом прогоне **не участвуют** — typecheck запускается
по `apps/web` и не заходит в backend.

### `apps/backend` — 0 ошибок, и он уже в гейте

```
apps/backend: tsc --noEmit → 0 ошибок (tsconfig: strict + noUncheckedIndexedAccess
                                    + exactOptionalPropertyTypes, 131 файл)
```

Ноль проверен инъекцией: подмена `START_GRACE_MS` на строку дала TS2363, после
восстановления снова 0. То есть это настоящий ноль, а не «ничего не проверяется».

**`pnpm backend:typecheck` уже стоит в `.github/workflows/ci.yml:42`** и блокирует
merge. Тревога owner закрыта без единой правки — backend был в гейте всё это время.

### Что предлагается по гейту

| Сейчас | Предложение |
|--------|-------------|
| backend typecheck в CI, блокирует | оставить как есть |
| web typecheck — **нет ни в CI, ни в сборке** | добавить `web:typecheck` в `ci.yml` **неблокирующим** шагом, чтобы число было видно |
| `ignoreBuildErrors: true` | оставить до плана; MSK теперь 8 ГБ, `web:build` уже ставит `--max-old-space-size=5120` |

Блокирующим делать нельзя — 140 ошибок не вычистятся к деплою. Видимость вместо
блокировки: число перестаёт быть неизвестным, и тренд будет виден.

Отдельно решить: снимать ли `ignoreBuildErrors` сейчас. MSK вырос с 4 до 8 ГБ, и
причина флага («low-mem prod») больше не действует. Но это отдельная правка с
перезапуском сборки в CI, не смешивать с деплоем Wave 1.


## Топ файлов долга

| Ошибок | Файл |
|--------|------|
| 66 | `src/components/DayRoutePanel.client.tsx` |
| 22 | `src/lib/selected-city.test.ts` |
| 16 | `src/server/day-route-match.ts` |
| 8 | `src/lib/city-destination-registry.ts` |
| 6 | `src/lib/seo-meta.test.ts` |
| 5 | `src/components/LocationsCatalogMap.client.tsx` |

Треть всего долга — один файл `DayRoutePanel`, это «Мой день», не venue PDP.

## Преобладающий класс ошибок

```
TS18047  'x' is possibly 'null'   54   ← null-безопасность, 43 из них в DayRoutePanel
TS2322   Type ... not assignable  41
TS2345   Argument ... not assignable 33
TS2339   Property does not exist  30
```

`TS18047` — это один и тот же паттерн: значение, которое может быть `null`,
используется без сужения. В `DayRoutePanel` он повторяется 43 раза, значит там
один неверный тип-хелпер порождает всю лавину. Это первая задача долга, а не 66
отдельных.

## Правило

1. `tsc --noEmit` по `apps/web` — зелёный.
2. `node scripts/run-unit-tests.mjs` — зелёный.
3. `pnpm web:build` — зелёный.

Три зелёных, потом деплой. Отдельно стоит решить, считать ли `apps/backend`
(зона Codex) частью этого гейта — сейчас он не проверяется вовсе.
