# Разведка: переход на Next.js 16.3.7

**Дата:** 2026-09-29. **Исполнитель:** Cline. **Характер:** чтение, изменений в коде нет.

**Источники**
- Upgrade guide: `docs/01-app/02-guides/upgrading/version-16.mdx` (canary)
- Релизный блог: `nextjs.org/blog/next-16`

**Вердикт: 4 часа, но не сейчас.** Не из-за цены, а потому что Turbopack —
рантайм-переменная, и смешивать её с `ignoreBuildErrors` (тоже рантайм) и Wave 1
(деплой) нельзя: три переменные в одном окне не разделяются.

## Профиль проекта

| | |
|---|---|
| Next | 15.5.20 (`^15.5.0`) |
| Node | 22.23.1, `engines: >=22.13.0 <23` |
| React | 19.0.0 |
| Кэш-слой | 12 файлов на `unstable_cache`, ~45 мест |
| Cache Components | не используется |
| `middleware.ts` | есть, SEO-критичная логика внутри |
| `webpack` в конфиге | `resolve.extensionAlias` |

## 1. Бесплатно — код уже готов (10 из 10)

| Пункт | Состояние |
|---|---|
| `images.qualities` обязателен | уже `[75, 85, 88, 90, 92, 95]`, в конфиге комментарий «Next 16 will require this list» |
| `images.domains` → `remotePatterns` | уже `remotePatterns`, 7 хостов |
| async `params`/`searchParams` | сделано в 15: 24 `await params`, 33 `await searchParams` |
| Node ≥ требуемого | 22.23.1 |
| `next lint` удалён | скрипта lint нет |
| `runtimeConfig` | не используется |
| `experimental.dynamicIO` / `useCache` | не используются |
| `unstable_rootParams` | не используется |
| `next/legacy/image` | не используется |
| `devIndicators` (удалённые опции) | не используются |
| `experimental.staleTimes` | **работает в 16 без изменений** — см. п. 2e |

Кто-то готовил проект заранее — про `qualities` это прямо написано в конфиге.

## 2. Задевает — 4 часа

### a) Turbopack по умолчанию и `extensionAlias` — 1–2 ч, **рантайм, не косметика**

Первоначальная гипотеза: «нужен только одному тесту, `catalog-client-fetch.test.ts`,
тесты не идут через бандлер Next». **Проверка это опровергла.**

```
apps/web/app + src (без тестов):  0 файлов с .js-импортами
packages/contracts/src:           7 файлов, напр. index.ts:
                                    export * from './admin.js';
```

`@daibilet/contracts` в `transpilePackages`, при этом:

```json
"exports": { ".": { "default": "./src/index.ts" } }
```

— пакет отдаёт **сырой TypeScript**, `dist/` нет, сборки нет (`"scripts": { "typecheck" }`).
Значит Next бандлит `index.ts`, где `import './admin.js'`, а на диске только `admin.ts`.
**Разрешение обязано происходить в бандлере, и `extensionAlias` — единственное,
что его обеспечивает.**

Под Turbopack webpack-конфиг игнорируется, и контракт перестанет резолвиться.

**Проверено эмпирически 29.09:** удалён только блок `webpack` из `next.config.ts`,
запущена `pnpm web:build` — сборка падает:

```
../../packages/contracts/src/schemas.ts
Module not found: Can't resolve './catalog.js'
  Import trace: ./src/server/catalog-query.ts → ./src/components/CatalogShell.client.tsx

../backend/src/public-read.ts
Module not found: Can't resolve './public-catalog.dto.js'
```

Затрагиваются **оба** transpile-пакета: `contracts` и `backend`. Конфиг после
проверки восстановлен, дерево чистое.

Хорошая новость: падение **громкое**, на этапе сборки, а не тихое на рантайме.
Это тот же класс, что `ignoreBuildErrors`, только в другую сторону — здесь ошибка
не может уехать незамеченной.

Фикс: не «косметика», а перенос `extensionAlias` на Turbopack-эквивалент либо
возврат к webpack флагом. **Решение продуктовое, не механическое.**

### b) `middleware.ts` → `proxy.ts` — 1 ч, но с smoke

Внутри: admin basic auth, rewrite admin host, кириллический редирект событий,
заголовки канонизации `events-catalog`, landing-редиректы, podborki SEO.
Это несущая SEO-логика, а не тривиальный middleware.

Гайд прямо предупреждает: «Edge middleware is not blindly renamed to proxy».
**Зелёной сборке не доверять** — обязателен smoke на 10–12 URL из
`docs/seo/webmaster-top15-checklist.md`.

### c) `revalidateTag()` требует второй аргумент — 1 ч

5 мест в 3 файлах: `admin-event-actions` (3), `admin-hero-banner-actions` (1),
`admin-review-actions` (1). Сейчас все вызовы однопараметрические.

Механика: `revalidateTag(tag, profile)` для SWR либо `updateTag(tag)` в Actions.
**Ошибка здесь не падает сборкой, а тихо протухает контент в админке** — самый
дорогой класс регрессии, потому что заметен поздно.

Smoke: изменить событие в админке, убедиться, что кэш сбросился.

### d) React 19.0 → 19.2 — 0.5 ч

### e) `experimental.staleTimes` — **работает, изменений не требует** ✅

Проверено 29.09 по документации текущей версии (в навигации — Latest 16.3.7) и по
`staleTimes.mdx` в canary.

**Опция НЕ удалена и НЕ переименована.** API прежний, дефолты прежние:

| Свойство | Дефолт | Что покрывает |
|---|---|---|
| `dynamic` | **0 секунд** (не кэшируется) | страница не статическая и не префетчена |
| `static` | **5 минут** | статические страницы, `prefetch={true}`, `router.prefetch()` |

История версий: `v14.2.0` — введена, `v15.0.0` — дефолт `dynamic` изменён
с 30 с на 0 с. Записей об удалении или депрекации нет.

**Важная деталь про наш конфиг.** Мы ставим `dynamic: 30`, и это не «усиление»,
а **возврат к значению, которое Next убрал в v15**: дефолт стал 0, и комментарий
в `next.config.ts` («default dynamic staleTime is 0 → soft nav always waits on a
new flight») описывает ровно эту боль. То есть настройка держит поведение,
которое иначе регрессировало бы.

При переходе на 16.3.7 значения `dynamic: 30, static: 180` продолжают работать
без правок. **Снимается с оценки.**

Оговорка: опция помечена в доках как experimental и «not recommended for
production», поэтому может измениться в будущем 16.x. На переход 15.5.20 → 16.3.7
это не влияет, но при планировании более далёкого апгрейда учитывать.

## 3. Отдельная задача

### `cacheComponents` — НЕ включать при апгрейде

Гайд: «Cache Components and React Compiler are **not enabled merely to complete
the upgrade**». У нас 12 файлов на `unstable_cache` — рукописный кэш-слой.
Переход = переписать кэширование, а не обновить зависимость. В рамках SEO-работ
вреден.

### Снятие `ignoreBuildErrors` — отдельная ветка после Wave 1

Причина флага (OOM на 4 ГБ VPS, `635eab187`, 19.07) отпала: MSK теперь 8 ГБ,
`web:build` уже ставит `--max-old-space-size=5120`. Но снимать одновременно с
Wave 1 — значит смешать две переменные.

## Порядок

| # | Что | Когда | Проверка |
|---|-----|-------|----------|
| 1 | Wave 1 + title событий | сейчас | гейт: typecheck/тесты/сборка + smoke 10–12 URL |
| 2 | Снять `ignoreBuildErrors` | после деплоя, отдельная ветка | лог сборки без `Skipping validation of types` |
| 3 | **Пауза 24–48 ч** | — | рантайм-наблюдение |
| 4 | Next 16, отдельная ветка | после паузы | + smoke по b) и c) |
| 5 | `DayRoutePanel` остаток | после Wave 1.5 | — |

**Пауза между 2 и 4 обязательна.** `ignoreBuildErrors` может вылезти сюрпризом не
на сборке, а на рантайме, и Next 16 замаскирует такой сюрприз под свои breaking
changes. Один-два дня наблюдения — дешёвая страховка.

## Проверочный чек-лист апгрейда

Из migration guide, пункты под наш проект:

- [ ] `middleware` → `proxy` с сохранением runtime и роутинга
- [ ] `revalidateTag` с новой сигнатурой; кэш админки сбрасывается
- [ ] image-запросы проходят при новых ограничениях (qualities уже заданы)
- [ ] `runtimeConfig` заменён без потери видимости server/client
- [ ] скрипты и CI больше не зовут `next lint`
- [ ] зелёная сборка **не закрывает** рантайм-находки

Codemod: `npx @next/codemod@canary upgrade latest`
