# qa.md — открытые вопросы

## 2026-07-25 - Conversion surfaces (owner) — ЗАКРЫТО

1. **Home video:** **photo rotator KEEP** до продакшн-съёмки. Stock muted loops **отклонены** (фейковый/дешёвый вид). Предпочтительны реальные фото МСК/СПб в WebP/AVIF. Статус: **HC.10 / CV.6 / H.7** - video hero остаётся **deferred**.
2. **Social proof «проданные билеты»:** цифра **только** после реального TC order-aggregate. Hardcoded fake counts **запрещены**. До появления данных - только честные каталожные counts (города/события/площадки, CV.3). Future: Order paid count, когда агрегат стабилен (**CV.11** deferred).
3. **Скидки в каталоге:** сортировку «по акциям» **не строить**, пока в DTO/sync нет `discount` / `strikePrice`. **CV.5** - backlog до sync architecture sprint.
4. **Venue logistics:** CMS admin-поле **«как найти»** (метро + human landmark text), заполняет админ вручную. Geocode-шаблон из адреса **отклонён**. Venues << events - manual ок (**CV.9**; owner label «Спринт CV.5» ≠ Tasktracker **CV.5** discounts). Спека: [venue-logistics-spec.md](./venue-logistics-spec.md).
5. **Blog auto-embeds:** **только** ручной `[buy slug=…]` или admin custom field (CV.4). Автоподбор по тегам статьи **отклонён** (высокий misfire убивает native conversion) - **CV.8** 🚫.

## 2026-07-25 - Venue logistics CV.9 (open)

1. **Yandex Maps в event-modal:** достаточно ли **iframe** `yandex.ru/map-widget/v1` без JS API key (маркер по lat/lng; fallback query по address), или нужен `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` / Constructor?
2. **Venue pages:** оставляем текущий **OsmMapEmbed** (OSM) и только в modal ставим Yandex, или выравниваем оба на Yandex в follow-up?
3. **Admin address:** в CV.9b делать `address` editable в Next form, или только новые logistics-поля (address остаётся sync-only)?
4. **Event DTO:** logistics через fetch `/api/public/venues/:slug` при открытии modal - ок, или встраивать slim fields в event page payload?

## 2026-07-25 - Catalog interstitial analytics

1. **GTM / Metrika goals:** клиент шлёт `catalog_interstitial_click` (dataLayer + ym reachGoal при наличии `NEXT_PUBLIC_YANDEX_METRIKA_ID`). Нужен ли отдельный trigger/goal в кабинетах, или достаточно raw push?

## 2026-07-23 - Антиспам блога / индекс (owner)

1. **Safety marker (гиды):** если Яндекс/GSC индексирует **80–90%** опубликованных URL гидов - темп хаос-графика ок. Если массово «малоценная» / не в индекс - **снизить до 1 гид/день** и пересмотреть шаблоны. Действие только владельца в Вебмастере / GSC.
2. **Пн-колонки:** достаточно ли 1 колонки/неделю как антиспам-щит, или чередовать персон чаще после исчерпания HIDDEN-бэклога?
3. **Template mix:** текущие 9 текстов в основном longform - нужен ли owner rewrite под `top5`/`events` объёмы, или достаточно нового угла в пачке B?

## 2026-07-23 - F4 и качество landing matching

1. **Решение владельца:** следующий крупный поток - F4 admin → Next (shell + live dashboard F4.1). Finance contour / ЛК поставщиков отложен до готовности продукта. До cutover канон - Vite admin; нужен ли отдельный `admin.` vhost на Next раньше полного port UI?
2. **F4.1 env:** достаточно ли `ADMIN_*` из общего `.env` у `daibilet-web`, или явно задавать `DAIBILET_ADMIN_API_URL=http://127.0.0.1:4000` в unit?
3. **Канон правил:** до F5 public landing runtime исполняет legacy `dto.js`, а TypeScript `landing-rules.ts` служит typed public path и тестам. Любое изменение правил вносится в оба файла. Нужна ли отдельная генерация rules из единого источника до F5?
4. **Проверка выдачи:** `LandingMatch` в public path применяется только для ручных `PINNED`/`EXCLUDED`; пересчёт automatic rows не исправляет public выдачу. Нужен ли отдельный автоматический scheduled audit всех landing rules с алертами на характерные мусорные слова?

## 2026-07-23 - SEO-листинги, решения владельца

1. **Стартовое ядро:** утверждён TOP-15 URL. Приоритет редакторских текстов - эти 15 страниц.
2. **Крыши:** city-URL `/progulki-po-krysham/saint-petersburg` остаётся СПб-only (Москва не в sitemap city-path). Национальный `/progulki-po-krysham` с 2026-07-25 показывает ближайший релевант (смотровые / выход на крышу), пока в sync нет SPB roof-туров.
3. **Телефон:** пока не публикуем. Слот для 8-800 или городского номера pending у владельца, launch не блокирует. На `/contacts` - email, ИНН и ОГРНИП; в футере только email (реквизиты убраны 2026-07-24 по запросу владельца). **Gap:** без телефона Яндекс в нише билетов может маркировать как «однодневку» - закрывается только реальным 8-800 от владельца.
4. **Порог индекса:** `MIN_LISTING_OFFERS_FOR_INDEX = 6` критичен из-за масштаба Екб (~57) / Казань (~51) vs СПб/Москва; повышать до 10-12 нельзя. Soft-цель контента = 10.
5. **SEO-тексты:** seed принят как MVP для launch set. Нужна последующая редакторская вычитка без изменения URL и правил.
6. **Карточки каталога:** текста для роботов мало - ок на сейчас; SEO-вес на CHPU-листингах, не раздувать card copy.
7. **Теги `/podborki`:** клики переведены на CHPU где возможно; остаётся gap по редким/служебным тегам (query fallback). Нужно ли периодически расширять словарь по новым топ-тегам из sync?

---

## 2026-07-19 — Teplohod orders API — ЗАКРЫТО / отложено

**Ответ партнёра:** у teplohod.info **нет** функционала API/выгрузки заказов для агента.

- Не запрашивать `TEP_ORDERS_TOKEN`; не считать отсутствие токена launch-blocker.
- Cron `tep-orders-sync` на prod **отключён** (2026-07-19).
- Скрипт `tep:orders` в репо — заготовка на случай появления API позже.
- Активный orders-path: только **Ticketscloud** (`tc:orders` + cron `*/10`).


## 2026-07-19 — после аудита админки

1. **Admin landings / public catalog SQL:** Events list уже на SQL group page (0.5.8). Когда переводим landings match и `GET /api/public/events` с in-memory full catalog на SQL/materialized groups?
2. **Роли / ACL:** Basic Auth + один `ADMIN_EMAIL` достаточно до F4, или нужен второй операторский аккаунт раньше?
3. **ECR:** включать `VITE_DAIBILET_EVENT_CHANGE_REQUESTS` после первого реального change-request, или держать до Phase 2 supplier flow?
4. **Архив заказов:** оставляем auto-archive cancelled ≥30d, или нужен отдельный sync «живых» confirmed из TC/TEP чтобы active-список не выглядел пустым?
5. **Lean description 4000:** хватает для ContentTab Source, или редакторам нужен полный текст только из `:id` (уже есть)?
6. **landing_match filter:** SQL quick-filter сейчас смотрит `LandingMatch` rows (не полный rule-engine). Нужен ли parity с `LANDING_RULES` hits в фильтре?

## Ранее

См. историю в `f:\coding\DAIBILET\docs\qa.md` (архитектурные вопросы Next vs Vite, 11.07.2026).
