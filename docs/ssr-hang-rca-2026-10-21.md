# SSR-hang RCA: остаточный Path B в sitemap, 2026-10-21

Связанные: INC.504.15 (root), INC.504.22, INC.504.23, [codex-ssr-hang-brief.md](./codex-ssr-hang-brief.md), [ssr-hang-crawler-2026-10-16.md](./ssr-hang-crawler-2026-10-16.md), [inc-504-ssr-hardening.md](./inc-504-ssr-hardening.md).

## Симптомы

- 2026-10-21 (внешний замер): три последовательных curl (главная, `/events`, `/_next/image`) отдались с TTFB ~11.5 с каждый; минутами позже те же URL - 0.14-0.36 с. Steady-state сервера быстрый. Локальный сетевой сбой не исключён, но паттерн совпадает с классом SSR-hang.
- 2026-10-14 18:45:27 UTC и 2026-10-16 03:45:27 UTC: SIGKILL от `ssr-healthcheck.sh`, 3 и 11 nginx 502.
- CPU-сэмплер: Next занимал ~1 CPU прямо перед hang; MemAvailable ~4 GiB; OOM в kernel journal нет.

## Почему kill-таймстампы - XX:45:27

Пайплайн healthcheck (minutely cron): curl `--max-time 12` (timeout) -> retry curl 12 с -> SIGUSR2 report + `sleep 2` -> SIGKILL. 12+12+2+накладные = ~27 с от начала минуты. Оба инцидента завершились kill на 27-й секунде минуты - это латентность пайплайна детекции, а не cron-триггер на :45. Сам hang начинался в окне XX:43-45.

## Остаточный Path B (root-cause контур)

INC.504.22 (merge `f93b770`) увёл почти весь public SSR на HTTP к API `:4000`. Остался один прямой импорт `@daibilet/backend/public-read` в `apps/web`: `apps/web/src/lib/sitemap-data.ts`.

| Чанк sitemap | Что выполнялось в процессе Next | Нагрузка |
|---|---|---|
| venues | `buildPublicVenuesDto(limit=10000, forceRefresh=true)` - DB-запрос + DTO 10k площадок, force-refresh каждые 5 мин (TTL снапшота) | тяжёлый sync DTO + рендер XML на event loop |
| blog | `buildPublicArticlesListDto()` - DB-запрос всех статей | средний |
| events | `buildPublicEventFreshnessMap()` - select+join по всем Event/EventOverride (legacy pg-пул, TTL 5 мин) + пагинированные HTTP-выборки | средний |
| events/venues ответ | `Cache-Control: no-store` - nginx не кэширует, каждый хит краулера входит в Next и ре-рендерит 45k-entry / 10k-venue XML | усилитель |

Механика hang: bulk-краулеры (AhrefsBot / GPTBot и др.) поллят sitemap и `/_next/image`. При `no-store` каждый хит запускает роут: rebuild по TTL (10k venues force-refresh) + синхронный рендер XML на десятки тысяч строк + freshness-запрос. Совпадение с нагрузкой image-optimizer (remote 2-16 MiB fetch + sharp) и GC даёт multi-second блокировки event loop -> TTFB 0 / 11с для всех -> healthcheck SIGKILL. Совпадает с наблюдением 2026-10-16 («Next using about one CPU immediately before the hang»).

## Что сделано 2026-10-21 (ветка `cline/d7f89`)

1. `sitemap-data.ts`: venues -> `fetchPublicApiJson('/api/public/venues', { limit: 10000 })`. Полный паритет: `buildPublicVenuesDto` - обёртка над тем же `buildPublicVenuesCatalog`, который обслуживает HTTP-роут; DB/DTO работа остаётся в процессе API.
2. `sitemap-data.ts`: blog -> `fetchPublicApiJson('/api/public/articles')` (тот же `buildPublicArticlesList`, backend-кэш ответа).
3. `sitemapResponseHeaders`: events/venues `no-store` -> `public, s-maxage=120, stale-while-revalidate=600`. Экспозиция деградированной карты (пустой venue-список при лежащем API) ограничена 2 минутами вместо 30-минутного кэша nginx, который мотивировал `no-store` (`ef8d3383`, 2026-10-08). Откат - вернуть `no-store` в этой функции.

После отдельного изменения Codex карта freshness также отдаётся backend через `/api/public/events/freshness` (публичный slug и ISO `updatedAt`, TTL 5 мин). Web sitemap читает её по HTTP с тайм-аутом 10 секунд. Прямых импортов `@daibilet/backend/public-read` в `sitemap-data.ts` больше нет. До выпуска backend и web необходимо развернуть вместе: версия web с HTTP-чтением ожидает новый endpoint.

## Что дальше

- **Codex (backend):** endpoint `/api/public/events/freshness` и HTTP-чтение в sitemap реализованы в отдельной ветке; нужен CI и совместный выпуск backend+web. Lean `sitemap/venues` без тяжёлых полей остаётся опциональным.
- **Owner (MSK):** после деплоя проверить по чеклисту из `ssr-hang-crawler-2026-10-16.md` (journalctl `daibilet-ssr-health`, node-reports, cpu-sample) - пропало ли окно XX:43-45 hang'ов.
- **Проверки PR:** `pnpm --filter @daibilet/web typecheck` (baseline 140), `pnpm web:test:ci`, `pnpm web:build` (с БД). Smoke: `/sitemaps/events.xml`, `/sitemaps/venues.xml`, `/sitemaps/blog.xml` - 200, валидный XML, заголовок `s-maxage=120`.
