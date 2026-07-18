# Diary — Daibilet

Технический дневник проекта. Формат записи: **Наблюдения**, **Решения**, **Проблемы**.

---

## 2026-07-19 — 4 статьи блога + weekly digest

### Наблюдения

- Пятый заголовок («Как купить билет на Дайбилете») снят по решению продукта — лишний trust/help.
- Прод читает статьи из `Article`; статика `blog-posts.ts` — карточки + SSR fallback; полный текст раньше в fallback сводился к excerpt.
- Обложки эталонно лежат в `apps/public/public/images/blog/` и копируются в Next public.

### Решения

- Контент 4 статей в `content/blog/*.md`; sync тел → `blog-article-bodies.ts`; upsert → `npm run blog:upsert`.
- Обложки сгенерированы (1536×1024), подключены по slug.
- Weekly digest: `scripts/blog-weekly-digest.js` + `deploy/cron/blog-weekly-digest.sh` (вс 07:00), status=`REVIEW`, без auto-publish.
- Документы: [content-blog-plan.md](./content-blog-plan.md), [deploy/cron/README.md](../deploy/cron/README.md).

### Проблемы

- Без деплоя и `blog:upsert` на prod полные тексты в БД не появятся (SSR fallback уже отдаёт bodies из статики).
- Первый cron-прогон дайджеста нужно поставить вручную на сервере (`crontab`).

---

## 2026-07-19 — Инвентарь статей блога (антидубли)

### Наблюдения

- Два источника контента: статика `apps/web/src/data/blog-posts.ts` и prod `Article`.
- Запрос к БД с prod: из `/opt/daibilet/apps/backend` + `NODE_PATH=…/node_modules` и `.cjs` (package `"type":"module"` ломает `require` в `.js`; `/tmp` + голый `pg` — нет).
- Статика и БД: по **13** статей, одинаковые slug; заголовки в БД чуть длиннее SEO-варианты.
- Уже закрыты: семья, концерты, джаз МСК, реки МСК/Казань, крыши/мосты/дворы/стендап/планетарий СПб, автобус МСК, эмаль, регионы.

### Решения

- Правило «не повторяться» зафиксировано в [content-blog-plan.md](./content-blog-plan.md): инвентарь обоих источников + 5 новых заголовков вне закрытых кластеров.
- Temp `tmp-list-articles` после инвентаря удалён (локально и с prod).

### Проблемы

- При расхождении статика↔БД карточки/SEO могут «плыть» — перед публикацией новых статей сверять оба источника.

---

## 2026-07-19 — Яндекс.Метрика на публичном Next

### Наблюдения

- В `apps/web` не было GTM/GA/Метрики — только JSON-LD и виджеты TC/TEP.
- Privacy/Legal уже упоминают Яндекс.Метрику как возможный инструмент аналитики.
- Admin (`apps/admin`) — отдельное приложение; счётчик нужен только на daibilet.ru.

### Решения

- Клиентский `YandexMetrika` (`next/script` `afterInteractive`) + `<noscript>` pixel в root `layout.tsx`.
- ID: `106786540` (override через `NEXT_PUBLIC_YANDEX_METRIKA_ID`), init: `ssr`, webvisor, clickmap, ecommerce `dataLayer`, accurateTrackBounce, trackLinks.
- Паттерн env как у виджетов; в admin Метрику не ставим.

### Проблемы

- Хиты появятся в кабинете Метрики только после деплоя Next на prod; SPA-переходы App Router при `ssr:true` обычно ок, при сомнениях — проверить «онлайн» после клиентской навигации.

---

## 2026-07-19 — Скрейпер liliabots.ru копирует афишу

### Наблюдения

- В Google выдаче `liliabots.ru` индексирует карточки с брендом «Дайбилет» (title/snippet с ценами и площадками) — зеркало/парсер контента.
- Публичный HTML и `/api/public/*` открыты без сессии (by design MVP); rate limit на API уже есть (60r/m).

### Решения

- `robots.txt`: `User-agent: liliabots|liliabot` → `Disallow: /`.
- Nginx: `map $daibilet_block_scraper` + `403` на `daibilet.ru` / `api.daibilet.ru` (`patch-prod-nginx-scraper-block.py`).
- Параллельно: жалоба в Google на копирование (Remove outdated content / Legal) — UA-блок не удаляет уже проиндексированные страницы зеркала.

### Проблемы

- Скрейпер может ходить с поддельным Chrome UA — тогда нужен Cloudflare Bot Fight / WAF и ужесточение HTML rate limit.

---

## 2026-07-19 — Cron TC orders-only + контент-план блога

### Наблюдения

- Зеркало заказов Ticketscloud на prod не обновлялось с 13.07 — sync только ручной, без cron; каталог (TEP 6ч) заказы не тянет.
- Teplohod orders API в интеграции не описан; email-парсинг отклонён как MVP-путь.
- Блог давно не обновлялся; нужен контент-план и еженедельный дайджест новых событий.

### Решения

- `deploy/cron/tc-orders-sync.sh` + crontab `*/10` только `npm run tc:orders` (`created_at=from,to`, lookback 3 дня, flock). Каталог не трогаем.
- Smoke 2026-07-18: импортирован 1 заказ TC `done` (первая внешняя продажа) + 1 билет.
- Контент-план: [content-blog-plan.md](./content-blog-plan.md) — 5 заголовков + дизайн weekly digest → Article status=`review`.

### Проблемы

- TEP-продажи в админке появятся только после partner orders API.
- Auto-publish дайджеста без редактора — не включать.

---

## 2026-07-18 — Google SERP: favicon + WebSite JSON-LD

### Наблюдения

- В выдаче Google сайт отображался как серый глобус + URL `daibilet.ru` вместо «Дайбилет» и цветной иконки.
- На проде `GET /favicon.ico` → **404**; в HTML не было `link rel="icon"` с PNG.
- SSR JSON-LD `WebSite` + `Organization` уже был в `apps/web/app/layout.tsx`, но `Organization.logo` указывал на несуществующий `/favicon.ico`.
- `robots.txt` иконки не блокирует (`Allow: /`).
- `og:site_name` / title template (`%s | Дайбилет`) уже заданы в root metadata.

### Решения

- Добавлены стабильные PNG: `/favicon-48x48.png`, `/favicon-96x96.png`, `/icon-192x192.png`, `/logo-192x192.png`, `/apple-touch-icon.png` (+ SVG/ICO fallback) в `apps/web/public/`.
- В root `metadata.icons` — `rel="icon"` type `image/png` (48/96/192) и apple-touch.
- JSON-LD `Organization.logo` → `https://daibilet.ru/logo-192x192.png` (192×192); `WebSite.name` = «Дайбилет», SearchAction на `/events?q={search_term_string}`.
- Для появления в SERP нужен деплой Next + переобход Google (дни/недели).

### Проблемы

- Без commit/push стандартный `deploy-prod-next.sh` (git pull) правки не подхватит.

---

## 2026-07-18 — Русификация UI админки

### Наблюдения

- Во всех разделах админки оставались английские бейджи и подписи: `imported`, `need attention`, `backend`, `Save`/`Close`, статусы `published`/`review`/`auto`, SEO-метки `index`/`noindex`, `Override`/`Source`.

### Решения

- Переведены пользовательские строки в страницах Events, Landings, Articles, Venues, Sources, Mapping, Settings, Dashboard, Change Requests и в shell/primitives.
- `StatusBadge` по умолчанию показывает русские статусы вместо сырых `live`/`draft`.

### Проблемы

- Имена провайдеров (Ticketscloud, Teplohod.info) и технические slug/SEO-поля оставлены как бренды/термины.

---

## 2026-07-18 — Full sync TC+TEP

### Наблюдения

- `tc:full-sync` на prod сохранил catalog; `tc-import-catalog` упал на `Event_slug_key` — `slugify(...).slice(0,120)` обрезал `externalId` у длинных title.
- `tep:sync` завершился: 187 events / 18129 sessions / 18577 ProviderLink.

### Решения

- `buildEventSlug(title, externalId)` — suffix id всегда внутри 120 символов; повторный `tc:import` после фикса.

### Проблемы

- —

---


### Наблюдения

- С `md` гамбургер скрывался, а desktop-nav включался, но City/Search — только с `lg` → на планшете шапка переполнялась и выглядела «неадаптивной».

### Решения

- Мобильное меню до `lg`; desktop nav с `lg`, второстепенные ссылки с `xl`.
- На `<lg` в шапке только гамбургер + логотип; поиск / FAQ / вход / избранное — в sheet.
- С `lg` — пиктограммы действий в шапке как раньше.
- Spacer height: 4rem до lg, 4.5rem с lg.

### Проблемы

- —

---


### Наблюдения

- После `860c818` (restore legacy widgets) из `TeplohodWidget.client.tsx` пропал `bootstrapTeplohodWidgets()` / повторный `TI_Tickets.init`.
- На `/events/[slug]` оставался пустой `.teplohod-info-wrapper` без кнопки — script грузился, но init после hydration не вызывался.
- На лендингах lean DTO без `purchaseUrl`/`externalId`; `LandingPurchaseButton` звал `getTeplohodWidgetIds` без парсинга `evt_tep_*`.

### Решения

- Восстановлен bootstrap + wait на `TI_Tickets.init`, retry mount, fallback на `account.teplohod.info`.
- Event buy card передаёт `purchaseUrl` в embed.
- Лендинги: `getTeplohodWidgetIdsFromSession` + `resolveTeplohodCheckoutUrl` (ID из `evt_tep_*`).
- Каталог `/events` по-прежнему без widget markup (`suppressPurchaseAnchors`).

### Проблемы

- —

---


### Наблюдения

- Полный admin catalog cache (~25s cold) при TTL 60s заставлял Events/Dashboard/Landings снова ждать при каждом «протухании».
- После SWR каталога: Events/Dashboard ~10–40 ms, но Landings ~700–800 ms (`matchesRule` × rules × ~3k) и Sources ~2.5 s (тяжёлый SQL).

### Решения

- Stale-while-revalidate каталога: fresh 5 мин, stale до 30 мин + фоновый rebuild; soft-invalidate; warm на startup.
- Landings: memo `adminLandingsBaseCache` по `catalogBuiltAt` + fingerprint saved landings; invalidate на PATCH landing/match.
- Sources: SWR fresh 2 мин / stale 10 мин; invalidate вместе с admin catalog.
- Warm startup: после grouped cache прогреваем Landings list + Sources.

### Проблемы

- Первый cold после hard-expire всё ещё дорогой — редкий кейс.
- Hotfix после `dcada19`: при вставке landings-кэша пропал `let adminGroupedEventsCache` → warm падал с ReferenceError; восстановлено.

---

### Наблюдения

- `eventRows(..., 10000)` обрезал admin Events/Landings; dashboard брал saleable public groups → расхождение 2526 vs 1353.
- Lean `description=null` давал ложный WEAK_DESCRIPTION почти на всём каталоге.
- В cache declaration свойство было `events`, а код читал `.items` (после populate писалось `items` — хрупко).

### Решения

- Admin cache: полный `eventRows(null)`, single-flight promise, ключ `items`.
- Dashboard launch metrics из того же `getCachedAdminGroupedEvents` (`source: admin_event_groups`).
- Lean: `descriptionLength` для readiness; `eventRowsByIds` через `WHERE id = ANY(...)`.
- Landing candidates переиспользуют cache.

### Проблемы

- Первый cold build admin cache на полном каталоге может быть медленным (~секунды); кэш 60с + single-flight.

---

## 2026-07-14 — Полный аудит админки (prod)

### Наблюдения

- В ходе аудита `GET /api/admin/events` и `/landings` отдавали **500** (`syntax error at or near "text"`): в lean `eventRows` SQL template случайно попали JS `//` комментарии после фикса override.
- Admin events cache режет `eventRows(..., 10000)` → `sourceEvents=10000`, `groupedEvents=1353`, тогда как dashboard/public показывают **2526** групп; readiness-метрики списка (needs_attention **1352**) не совпадают с dashboard (**0**).
- Stub-навигация: mapping / taxonomy / audit-log / settings; ECR API есть, UI в бандле выключен.
- Override description в lean после фикса читается (пример `evt_tep_370`); source `e.description` в lean по-прежнему null.

### Решения

- Hotfix `ea27651`: убраны JS-комментарии из SQL; api restart на prod — Events/Landings снова 200.

### Проблемы

- Неполный admin-каталог из-за hard limit 10k — P0 к следующему фиксу.
- Расхождение Dashboard vs Events metrics — P0/P1 для операционной достоверности.

---

## 2026-07-14 — Legacy widgets + description overrides + paragraphs

### Наблюдения

- Собственная iframe-модалка checkout — лишний велосипед; в legacy (`apps/public`) покупка шла через TC `data-tc-event` click и Teplohod embed + `.ti-tickets-event-tickets-buy`.
- Override описания «не сохранялся»: lean `eventRows` обнулял `override.description` / SEO-тексты → ContentTab открывался пустым и PATCH затирал БД `null`.
- Описания «полотенцем»: в Next `splitDescriptionParagraphs` не имел legacy fallback по одиночным `\n` (только blank lines), затем `cleanDisplayText` схлопывал всё в один абзац.

### Решения

- Purchase CTA снова на legacy-виджеты (без CheckoutModal в CTA).
- Lean admin list снова отдаёт override text fields; после PATCH инвалидируем `adminGroupedEventsCache`.
- `splitDescriptionParagraphs` как в legacy (+ soft-wrap join); заголовки разделов → `<h3>` по эвристике.

### Проблемы

- Source `e.description` в lean-списке по-прежнему null (тяжёлое поле) — в ContentTab подпись Source может быть пустой; override при этом читается/пишется корректно.

---

## 2026-07-14 — Checkout via own iframe modal (TC + TEP)

### Наблюдения

- Вендорные tcwidget.js / Teplohod Fancybox нестабильны в Next (synthetic click, style#loader, fallback races).
- Checkout URL обоих провайдеров **можно встраивать в iframe** (нет X-Frame-Options).

### Решения

- `CheckoutModal` + `CheckoutModalButton`: наша модалка с iframe на `ticketscloud.com/v1/widgets/common` и `account.teplohod.info/order/event-order`.
- Event page / landing / catalog purchase CTA переведены на эту модалку — предсказуемый UX без зависимости от vendor DOM.

### Проблемы

- Подход отозван: вернулись к legacy vendor widgets (см. запись выше).

---

## 2026-07-14 — Root cause: TC style#ticketscloud-loader misdetected as spinner

### Наблюдения

- В `tcwidget.js` `#ticketscloud-loader` — это **`<style>` в `<head>`**, а не DOM-спиннер. После первого запуска он остаётся навсегда.
- Next `openTcWidget` считал его «stuck loading», сносил overlay/`dismissTcWidget` и открывал popup — TC-модалка выглядела «не грузится».
- Teplohod отдельно ломали auto-`window.open` на account (уже чинили); оставили Vite-подобный init + без агрессивного dismiss.

### Решения

- Visible = iframe **или** `div#tc-widget-overlay` (не STYLE).
- Больше не удаляем `style#ticketscloud-loader`; не считаем его stuck.
- `openTcWidget`: ensure + `ticketsCloudWidget.init` + click; popup fallback только если shell не появился ~4с.
- Teplohod: `async` script + повторный `init` после paint.

### Проблемы

- —

---

## 2026-07-14 — Teplohod fancybox killed by account fallback

### Наблюдения

- На event 554 (`…-za-1-chas-554`) виджет Teplohod рисует кнопку «Купить билеты» inline; выбор дат/категорий должен открываться в Fancybox-модалке.
- Наш `bindTeplohodBuyFallback` через 2.5s открывал `account.teplohod.info` во вкладке, если Fancybox ещё не детектился — UX «не в модалке» + вторая кнопка fallback.
- `openTeplohodPurchase` мог закрывать пустой Fancybox и тоже уводить во внешний checkout.

### Решения

- Убран auto-`window.open` с клика buy; fallback-ссылка только если кнопка Teplohod так и не смонтировалась (~8с).
- `openTeplohodPurchase` больше не dismiss'ит Fancybox; внешний URL — last resort.
- z-index для `.fancyboxtkt-*`; parse `event_id` из account checkout URL.

### Проблемы

- —

---

## 2026-07-14 — TC widget infinite loader again

### Наблюдения

- После клика «Купить» Ticketscloud рисует `#tc-widget-overlay` + `#ticketscloud-loader` до iframe.
- `isTcWidgetVisible` считал overlay успехом → fallback на `purchaseUrl` не срабатывал, loader крутился бесконечно.
- TEP: `ensureTeplohodWidgetScript` мог resolve до появления `TI_Tickets.init`.

### Решения

- Visible = реальный iframe (не overlay/loader); stuck loading → dismiss + popup fallback.
- Teplohod script wait до `TI_Tickets.init`.

### Проблемы

- iframe может появиться пустым и всё ещё крутиться — если повторится, добавить проверку contentDocument/timeout внутри iframe.

---

## 2026-07-14 — Catalog list description restored

### Наблюдения

- Lean list DTO убрал `description` вместе с widget URL / full slots; на `/events` горизонтальные карточки потеряли excerpt при том, что UI (`formatListDescription`) уже его ждал.
- Основной perf-выигрыш был от виджетов в list HTML и hydrate page-only, не от самого текста описания.

### Решения

- `toPublicCatalogListItem` снова отдаёт `description` как plain-text excerpt (≤420 символов, без HTML).
- `PublicCatalogListItemDto.description` возвращён в контракт; `EventCardHorizontal` типизирован под list DTO.

### Проблемы

- Полный HTML description в list по-прежнему не нужен (раздувает JSON); detail остаётся на event page.

---

## 2026-07-14 — ChunkLoad после redeploy + harden deploy

### Наблюдения

- После `deploy-prod-next.sh` старые вкладки запрашивали chunk hashes предыдущего билда → 404 / `ChunkLoadError` (Application error).
- Актуальный HTML уже ссылался на новые chunks; проблема клиентского кэша сессии, не nginx static proxy.

### Решения

- Prod: `systemctl stop daibilet-web` → `rm -rf apps/web/.next/cache` → start → internal revalidate (home/catalog tags+paths).
- `deploy-prod-next.sh`: очистка `.next/cache` перед start + post-deploy `POST /api/internal/revalidate`; **re-exec после `git pull`**, чтобы хвост скрипта не оставался от старой версии.
- `ChunkLoadRecovery` в root layout: один `location.reload()` на ChunkLoad / dynamic import failure per session.
- Prod: заполнен пустой `DAIBILET_NEXT_REVALIDATE_SECRET` (раньше всегда 401).

### Проблемы

- PowerShell+SSH quoting ломает Bearer/json в one-liner; для ad-hoc лучше remote Python/scp.
- На prod `DAIBILET_NEXT_REVALIDATE_SECRET` в `.env` был **пустым** → post-sync/deploy revalidate всегда 401; сгенерирован и прописан новый секрет, web+api перезапущены.

---

## 2026-07-14 — Docs + commit + prod deploy (admin pagination + catalog perf)

### Наблюдения

- Worktree содержал админскую пагинацию, compact dashboard, catalog lean DTO, SEO redirects и Teplohod checkout fix — без пуша.
- Одноразовые `scripts/inspect-*` / `probe-*` / `scrape-*` не входят в коммит.

### Решения

- Документы: Project/Tasktracker/Diary/current-state обновлены под контракты admin API и catalog perf rules.
- Deploy: `feat/next-monorepo` @ `6175ad5` → prod (`deploy-prod-next.sh`); nginx www→apex 301 применён; Next matcher hotfix (static array).

### Проблемы

- SQL LIMIT read-model (0.5.8) остаётся следующим perf-блоком после warm-cache wins.
- На сервере перед pull был stash `pre-deploy-f59d52c` (локальные hotfix-файлы) — не потерять при необходимости.

---

## 2026-07-14 — Catalog/perf + metrics + SEO redirects

### Наблюдения

- `/api/public/events?limit=50` собирал весь grouped catalog и hydratил upcomingSlots до тысячи карточек, потом slice.
- В HTML `/events` в каждой карточке жили скрытые TC/Teplohod widget-блоки.
- Dashboard launch metrics считал raw Event rows, public `/stats` — saleable groupKey.
- SSR city/landing тащили 160–240 полных сессий (~1.7–2 МБ HTML).
- `www.daibilet.ru` и старые `/river-cruises` не 301.

### Решения

- Catalog API: shared cache без full slot hydrate; hydrate только page slice; lean list DTO без widget URL.
- Catalog cards: `suppressPurchaseAnchors` по умолчанию; horizontal без widget markup.
- Dashboard launch metrics = public catalog groups (`source: public_catalog_groups`); UI предпочитает `launch.groupedEvents`.
- City SSR ≤48 lean items; landing sessions ≤48 lean.
- Middleware/next.config: www→apex + `/river-cruises`→`/rechnye-progulki`; `pageTitle`/`og:url` route-specific.
- Warm/revalidate: stats, events page, SPB/MSK, river/bus landings.

### Проблемы

- Полный SQL LIMIT на группах (без in-memory filter catalog) всё ещё впереди — отдельно materialized PublicCatalogGroup.

---

### Наблюдения

- Codex acceptance: не только client-side slice; API `page/limit/q` → `{ page, pages, limit, total, rows }`.
- Gaps: cities без pager; landings list без page params; landing detail hard-cap `events.slice(0, 160)` без «Далее»; dashboard раньше ещё отдавал пустые `*Rows` массивы (и importJob).
- Events/venues/buyers/orders уже имели envelope + UI pager, но events/venues всё ещё filter-after-full-load (не SQL OFFSET).

### Решения

- Cities: `destinationSummaryRowsFast` + `page/limit/q` + UI Назад/Далее.
- Landings list/detail: page envelope; detail events paginated (`page/limit/q`); reuse `getCachedAdminGroupedEvents`.
- Dashboard contract: только `generatedAt` + `metrics` (compact).
- hydrateAdminData больше не затирает локальные row-fallback через `Object.assign` всего payload.

### Проблемы

- **Performance blocker (отдельный):** `buildAdminEventsList` / landings match всё ещё собирают полный grouped catalog в JS, потом slice. Нужен Prisma/SQL read-model с group+filter+page в БД.

---

## 2026-07-14 — Teplohod widget fallback → «Ошибка!»

### Наблюдения

- На дискотеке `event/1375` клик по виджету открывал fallback `https://teplohod.info/event/1375`, а публичные `/event/{id}` у Teplohod сейчас отдают 404 «Ошибка!».
- Рабочий checkout: `https://account.teplohod.info/order/event-order?widget_id=14208&event_id=…` (тот же URL, что в fancybox `data-src`).
- Fallback срабатывал через ~700 ms, если fancybox ещё не смонтировался.

### Решения

- `buildTeplohodUrl` / purchase URLs → account checkout + `widget_id`.
- Игнор старых `offerDeeplinkUrl` на teplohod.info/event/* для TEP.
- Клиент: `resolveTeplohodCheckoutUrl`, timeout fallback 2.5 s.

### Проблемы

- Публичные карточки на teplohod.info/event/* недоступны — зависимость от account checkout.

---

## 2026-07-13 — Admin lists: pagination / load

### Наблюдения

- Админские списки (orders/buyers/events/landings/venues) грузили почти всё в память: `eventRows(10000)` с полными `description`, у заказов — `jsonb_agg` всех билетов, пагинация была только в JS после полной выборки.
- UI pager на Events/Orders уже был, на Buyers/Venues — нет; Landings тащили полный каталог ради счётчиков правил.

### Решения

- Orders/Buyers: lean SQL (counts + distinct titles без полного jsonb билетов); детали билетов — только в `GET /orders/:id`.
- Events/Landings: `eventRows(..., { lean: true })` без description/SEO blob; кэш grouped events 60с для списка событий.
- Venues/Buyers: page/limit в API + pager в UI.
- Ответ списка заказов не тащит tickets payload — sheet и так подгружает detail.

### Проблемы

- Полная замена на SQL `LIMIT/OFFSET` для events после `groupAdminEventRows` ещё впереди: пока lean + cache, фильтры по-прежнему на сгруппированном наборе.
- Поисковый q по номеру билета в списке заказов слабее (нет ticket ids в lean row) — детали по-прежнему в карточке заказа.

---

## 2026-07-11 — Slice 5: help, blog, legal, my-orders

### Наблюдения

- Slice 5 портирован из Vite `apps/public`: trust pages, FAQ `/help`, блог (static fallback + API), `/my-orders` lookup.
- Codex (`codex/phase2-foundation`, `229ad3b`) продолжает Phase 2 backend: schema, Event Change Requests, docs по spbboats; коммит `5b18225` переводит **`apps/public` на Next + proxy** — конфликтует с Path B (`apps/web`).
- Client-компоненты (`HelpPage`, `MyOrdersPage`) не могут импортировать async `SiteLayout` (тянет `pg` в client bundle).

### Решения

- Slice 5 — только `apps/web`, без merge Codex Next/proxy.
- `SiteLayout`: try/catch при `buildPublicDestinationsDto` — build без локальной БД не падает.
- `HelpPage` / `MyOrdersPage`: обёртка `SiteLayout` на server `page.tsx`, контент — в client view.
- Добавлены `public-articles.dto`, `public-orders.dto`, API routes `/api/public/articles`, `/orders`.
- Header: ссылка «Помощь»; footer: blog, help, legal links.

### Проблемы

- Локальный `pnpm web:build` без Postgres на `:5437` — static pages с пустым footer city block (на prod при build БД доступна).
- Wholesale merge Codex по-прежнему невозможен (~429 files diff).

---

## 2026-07-10 — F3 staging cutover выполнен

### Наблюдения

- Staging сервер был на `integrate/mvp-launch` + Node 20; для F3: Node 22, pnpm, checkout `feat/next-monorepo`.
- `start-web.sh` в systemd пересобирал Next при каждом start — заменён на `start-web-prod.sh`.
- nginx `/api/` → `:4001` (legacy), `/` → Next `:3000`.
- Smoke script падал из-за `pipefail` + pipeline вне `check()` — исправлено.

### Решения

- Deploy: `deploy-staging-next.sh`, `patch-staging-next.py`, `daibilet-web-staging.service`.
- Staging URL: https://staging.daibilet.ru — SSR catalog/landings в HTML.
- Prod cutover — следующий шаг (rollback plan нужен).

### Проблемы

- `/api/health` через nginx = backend (by design); Next health на `:3000` отдельно.
- Widget click — manual smoke.

---

## 2026-07-10 — Codex audit + split стратегия + старт F3

### Наблюдения

- На GitHub **нет** ветки `codex/phase2-finance-next`; Codex работает в **`codex/phase2-foundation`** (`229ad3b`, unrelated history с `feat/next-monorepo`).
- Codex сделал Phase 2 schema (~66 models), Event Change Requests, admin queue — **ценно для cherry-pick**.
- Codex также перевёл **`apps/public` на Next с proxy** на `:4000` (`5b18225`) — **конфликтует** с Path B (`apps/web`, full-stack read).
- Cursor F2 complete: `apps/web`, 36 landing SSG paths, parity script.

### Решения

- **Canonical public Next:** только `apps/web` на `feat/next-monorepo`. Codex Next/proxy **не мержить**.
- **Интеграция Codex:** cherry-pick schema + event change requests + admin contracts **после F3 cutover** ([codex-cherry-pick-plan.md](./codex-cherry-pick-plan.md)).
- Handoff обновлён: [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md).
- F3 артефакты: `deploy-staging-next.sh`, `daibilet-web-staging.service`, `staging-next.conf.snippet`, `launch-staging-smoke-next.sh`.

### Проблемы

- Wholesale merge `codex/phase2-foundation` → guaranteed conflicts (schema, Next app location, lockfile).
- F3 server-side deploy требует ops на staging (213.171.7.16) — локально только scripts/docs.

---

## 2026-07-10 — F2 закрыт: landings ISR, filters, widgets, parity

### Наблюдения

- Legacy landings используют сложную URL-схему: category-first (`/rechnye-progulki/moscow/`) и city-first (`/saint-petersburg/night-bridges/`). Логика портирована из `landing-routes.ts` SPA.
- `buildPublicLandingPage` / `buildPublicLandingPageManaged` уже в `dto.js`; для Next достаточно wrapper `public-landing.dto.ts` по аналогии с venue/city.
- Next build pre-renderит 36 landing paths (9 one-segment + 23 two-segment) с `revalidate=3600`.
- Каталог typed DTO использует `from`/`to` для date range; legacy URL — `dateFrom`/`dateTo`. Маппинг добавлен в `parseCatalogPageQuery`.

### Решения

- Landings: ISR + `generateStaticParams` для top slugs; catch-all `[segment]`/`[segment2]`/`[segment3]` с `notFound()` для не-landing путей.
- Middleware 301: `/landings/*` и misordered `/{city}/{category}` → canonical landing href.
- Widgets: SSR рендерит цену/описание; `PurchaseWidget.client.tsx` — Teplohod → TC → external link.
- Parity: `pnpm backend:next:parity` — расширенный catalog (city/date/sort) + landing slugs + optional HTTP compare (`WEB_BASE_URL` vs `LEGACY_BASE_URL`).
- F3 checklist вынесен в отдельный doc.

### Проблемы

- `pnpm` не в PATH на некоторых Windows-средах — сборка через `npm exec pnpm -- web:build`.
- `/podborki` с `searchParams` остаётся dynamic (ƒ) несмотря на `revalidate` — приемлемо для MVP.
- Полный UI landings (3600 строк SPA) не портирован — упрощённый SSR view + EventCard grid.

---

## 2026-07-10 — F2 core: catalog, event, city, venue SSR

### Наблюдения

- Next bundler ломал `createRequire` в `db.ts` — заменён на прямой `import pg`.
- `@daibilet/backend` в `transpilePackages`, `pg` в `serverExternalPackages`.

### Решения

- Read path через `@daibilet/backend/public-read` без HTTP proxy.
- Catalog default 100, selector 100/200/300 в `@daibilet/contracts/catalog`.

### Проблемы

- Type casts в public-city.dto.ts для совместимости с Next build — временно до F5.

---

## 2026-07-10 — F1: monorepo shell

### Наблюдения

- Path B утверждён: SEO не откладываем, full-stack Next.

### Решения

- pnpm workspaces, apps/web Next 15, packages/contracts + config.

### Проблемы

- Prod остаётся на Vite до F3 cutover.

---

## 2026-07-10 — F3 prod cutover + Post-F3 cherry-pick (slice 1–4)

### Наблюдения

- Prod Next на **:3001** (staging :3000) — один хост, разные порты.
- Snapshot rollback: `/var/backups/daibilet/pre-next-20260710-185139`.
- `next build` OOM на 3.8GB RAM — workaround: остановить staging Next на время build.
- Smoke: SSR через nginx ✅; локальный `:3001` health может флапать при restart systemd.
- Codex cherry-pick: 4 migrations + schema 29→66 models, ECR backend + admin contracts + Vite page.

### Решения

- Prod nginx patched (`patch-prod-next.py`), `daibilet-web` enabled.
- Cherry-pick через `git checkout origin/codex/phase2-foundation -- <paths>` (не wholesale merge).
- Admin UI за `VITE_DAIBILET_EVENT_CHANGE_REQUESTS=1`; API routes wired в `server-entry.ts`.
- Codex Next/proxy (`5b18225`) по-прежнему **skip**.

### Проблемы

- `pnpm db:deploy` на staging/prod ещё не выполнен — нужен backup `5438`/`5437`.
- `backend:test:ts` не включает ECR tests — запускать отдельно `tsx --test src/event-change-request-*.test.ts`.

---

## 2026-07-10 — Next UI polish (slice 1): design system + shell + home

### Наблюдения

- F3 data path готов, но Next выглядел «голым»: 3 nav-ссылки, минимальный footer, простые карточки.
- Vite public содержит полный design system (~290 строк CSS) и Header/Footer с 7 разделами.

### Решения

- Порт `globals.css` + tailwind tokens из `apps/public`.
- Header: fixed blur, mobile sheet, полная nav (events/cities/venues/locations/podborki).
- Footer: 4 колонки (события, города, компания), email.
- Home: gradient hero + поиск, популярные события, city cards, format tiles, trust block.
- EventCard: рейтинг, price pill, hover, category chip.

### Проблемы

- Полный UI parity (landings block renderer, catalog advanced filters, auth/favorites) — следующие slices.
- `/images/cities/*.png` — static assets на nginx, не в repo; fallback emoji + `heroImageUrl` из API.

---

## 2026-07-11 — Next UI polish (slice 3): event page hero + sticky buy

### Наблюдения

- После slice 1–2 event page оставалась на упрощённом `PurchaseWidget`: без hero, без sticky buy card, без списка сеансов.
- Vite `EventPage.tsx` — эталон: full-bleed hero, breadcrumbs, mobile CTA, buy card с категориями/сеансами, TC slot-клики, Teplohod embed.

### Решения

- `EventHero` + `EventBuyCard` в `EventPage.client.tsx`; описание/теги — `EventPageSections.tsx`.
- Утилиты: `event-page-utils.ts` (цены, возраст, HTML описание), `event-purchase.ts` (TC targets, purchasable sessions).
- `TcWidget.client.tsx`: `TcSessionSlot`, hero/default `TcWidgetButton`, session rows.
- `TeplohodWidget.client.tsx`: embed с `#teplohod-widget`, CSS override, hero scroll+click.
- Layout `/events/[slug]`: hero → 2-col (content + sticky `top-20`) → related events.

### Проблемы

- Slice 4 (landings block renderer) и slice 5 (auth/help/legal) — следующие.
- QuickInfo на event page упрощён vs Vite (без event-location resolver) — достаточно для functional parity.

---

## 2026-07-11 — Next UI polish (slice 4): landings content blocks

### Наблюдения

- Backend (`dto.js`) уже отдаёт `blocks` (DB `LandingContentBlock` или `buildDefaultLandingBlocks`).
- Next `LandingPageView` показывал только заголовок + карточки событий — без trust/value/city grid/FAQ.

### Решения

- `LandingContentBlocks` + `LandingFaqSection` — порт типов блоков из Vite.
- Типизация `PublicLandingPageDto.blocks` → `LandingContentBlockDto[]`.
- Секция событий `#variants` для CTA anchor.

### Проблемы

- Полный landing parity (hero sticky, filters, bridges/dinner profiles) — отдельно, не slice 4.
- Slice 5: auth/pages (`/help`, `/blog`, legal).
