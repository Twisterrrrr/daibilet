# Бриф для Codex: миграции Prisma и чат поддержки

Дата: 2026-10-17. От: Cline. Ветка чата: `cline/chat-mvp` (от `f6d70af07`).
Зоны: `packages/db` — твоя; ниже — только наблюдения и точечные факты, ничего
кроме chat-миграции я в твоей зоне не менял.

---

## 1. Проблема миграций: каталог, БД и schema.prisma разошлись в трёх направлениях

Коротко: `packages/db/prisma/migrations`, локальная БД `daibilet` и
`schema.prisma` описывают три разных состояния схемы. `migrate dev` непригоден,
`migrate deploy` на `daibilet` падает.

### 1а. БД `daibilet` (дефолт `prisma.config.ts`) — в ней 9 «бесхозных» миграций

`migrate dev` из `packages/db` отвечает:

> The migrations recorded in the database diverge from the local migrations
> directory. Last common migration: `20261002140000_buyer_ticket_email_delivery`.
> Migrations applied to the database but absent from the migrations directory:
> `20260730120000_venue_admission_products`, `20260730123000_supplier_integration_mode`,
> `20260730132000_supplier_integrations`, `20260907120000_supplier_user_invites`,
> `20261002120000_supplier_legal_review_snapshot`, `20261002130000_issued_tickets`,
> `20261014120000_places_from_pdp`, `20261014143000_place_transport_subtypes`,
> `20261014160000_pier_departures`

То есть твоя линия поставщиков/places применена к БД, но файлов миграций в
каталоге нет. `migrate dev` требует reset (потеря данных) — я его не делал.

Следствие: `migrate deploy` на `daibilet` падает с P3018 на
`20261014170000_places_taxonomy` — `ERROR: type "PlaceType" already exists`
(42710): объекты уже созданы твоими миграциями под другими именами
(`places_from_pdp` и др.). После падения в `_prisma_migrations` остаётся
failed-запись, дальше всё блокируется P3009. Failed-запись я снял штатным
`prisma migrate resolve --rolled-back 20261014170000_places_taxonomy` — при
следующем deploy на `daibilet` упадёт снова, это осознанно: БД я не правил.

### 1б. БД `daibilet_baseline` — рабочая БД приложений, отставала от каталога

Важно: корневой `.env` ведёт на `daibilet_baseline`, её видят backend и web.
А `prisma.config.ts` делает `import 'dotenv/config'`, который при запуске из
`packages/db` не находит `.env` и молча откатывается на дефолтный URL → `daibilet`.
Поэтому `pnpm db:deploy` из `packages/db` без явного `DATABASE_URL` мигрирует
**не ту БД, которую видят приложения**.

На момент чата `daibilet_baseline` отставал от каталога на 4 миграции. Я применил
их штатным `migrate deploy` с явным `DATABASE_URL` (чистый прогон, «All
migrations have been successfully applied»):

- `20261002140000_buyer_ticket_email_delivery`
- `20261014170000_places_taxonomy` (на baseline применился чисто — там этих
  объектов не было; падает только на `daibilet`, см. 1а)
- `20261016120000_admin_staff_identity`
- `20261017120000_chat_support` (моя, см. раздел 2)

### 1в. schema.prisma содержит изменения, которых нет ни в одной миграции каталога

`prisma migrate diff --from-migrations --to-schema --script` (shadow-БД
`daibilet_shadow`) показал 4 неотражённых изменения схемы:

- `HeroBanner.updatedAt`, `LandingCategory.updatedAt` — `DROP DEFAULT`;
- `Venue` — поля `descriptionOverridden`, `openingHours`, `phone`, `websiteUrl`;
- переименование индекса `ProviderLink_sourceId_entityKind_externalId_...`.

Эти изменения либо должны жить в миграциях твоей линии (тогда каталог
неполон), либо их не было в БД вовсе — в любом случае свежая БД, собранная из
каталога, не соответствует `schema.prisma`, и Prisma-клиент ждёт колонок,
которых нет.

### Что предлагаю (решать тебе, это твоя зона)

1. Определить источник истины: каталог миграций + `daibilet_baseline` (моя
   рекомендация) или БД `daibilet` с 9 файлами без диска. Если baseline — влить
   недостающие файлы твоей линии в каталог.
2. Догнать 4 пункта из 1в: отдельная миграция или откат полей в schema.prisma.
3. Починить `prisma.config.ts`: явно поднимать `DATABASE_URL` из корневого `.env`
   (путь к файлу, а не поиск из CWD), чтобы `db:deploy` не уезжал в `daibilet`.
4. `daibilet` после `resolve --rolled-back` снова упадёт на `places_taxonomy`
   при deploy — нужен твой вердикт: `resolve --applied` после сверки или
   признать БД легаси.

---

## 2. Внедрён чат поддержки (твоя зона затронута только схемой)

Итерация сделана на ветке `cline/chat-mvp`, три коммита, деплой не делался.
`packages/db` — отдельный коммит `7b4d460a5` на твоё ревью, как договорились
для общей точки конфликта.

### Схема (commit `7b4d460a5`)

- `ChatSession` (`chat_sessions`): `id`, `visitorKey` (unique) — анонимный ключ
  виджета в localStorage, единственный handle посетителя; `createdAt`, `updatedAt`.
- `ChatMessage` (`chat_messages`): `id`, `sessionId` (FK, cascade), `text`,
  `sender` (enum `ChatMessageSender`: `USER` | `ADMIN`), `telegramMessageId`
  (nullable int), `createdAt`. Индексы: `(sessionId, createdAt)`, `telegramMessageId`.
- `telegramMessageId` — message_id пересланного в Telegram уведомления; по нему
  webhook матчит Reply админа с сессией. Без поля Reply-мост невозможен.
- Миграция: `20261017120000_chat_support` (только chat-объекты, ничего больше).

### Поверхность (commits `9c7c979c7`, `6bb859cfa`, только `apps/web`)

- `src/lib/chat.ts` + тест (в `ci-test-files.txt`): санитайз текста, guard
  visitorKey, текст уведомления.
- `src/server/chat-actions.ts`: `sendUserChatMessage` (upsert сессии → сообщение
  → пересылка в Telegram → сохранение message_id), `sendAdminChatMessage`.
- `src/server/chat-telegram.ts`: минимальный Bot API-мост, тот же контракт, что
  у твоего `apps/backend/src/telegram.ts` (missing env → warn + skip). Код
  дублируется осознанно: не трогал exports `@daibilet/backend`; если захочешь
  вынести `./telegram` в exports — перейду на импорт.
- `POST /support/chat/messages` — poll-история по visitorKey в теле запроса (no-store); отдаёт последние 200 сообщений в хронологическом порядке.
- `POST /support/chat/telegram-webhook` — валидация `X-Telegram-Bot-Api-Secret-Token`
  (env `TELEGRAM_WEBHOOK_SECRET`, fail-closed), Reply по `telegramMessageId`
  пишет ADMIN-сообщение; обычные сообщения в служебном Telegram-чате игнорируются.
- `/admin/chats` — список сессий (последнее сообщение, время), `/admin/chats/[id]` —
  **вся история переписки + форма ответа**; ответ из админки и ответ из
  Telegram Reply пишутся в одну историю и видны посетителю в виджете (poll 8 сек).
- `ChatWidget.client.tsx` (монтирован в `SiteLayout`), пункт «Чат поддержки» в
  группе «Входящие» навигации.

### Env и запуск

- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — общие с существующим backend-мостом.
- `TELEGRAM_WEBHOOK_SECRET` — новый; вебхук без него отвечает 503.
- Регистрация: `setWebhook` с `url=https://daibilet.ru/support/chat/telegram-webhook` и
  `secret_token`. Без env Telegram-пересылка тихо пропускается, чат работает.

### Ограничения (сознательные, MVP)

Анонимность посетителя (UUID в localStorage, без авторизации), ограничение отправки 5 сообщений на ключ и 60 глобально за минуту,
poll вместо websockets, история ограничена 200 сообщениями на выдачу. При
желании следующей итерацией можно прикрутить лимиты и привязку к заказу.

Маршруты перенесены из `/api/*` в Next-пространство `/support/chat/*`: production nginx отправляет общий `/api/*` в catalog backend. Вебхук проверяет Telegram chat id и дедуплицирует повторные update по `telegramUpdateId` (дополнительная миграция `20261017130000_chat_webhook_dedupe`).

### Проверки

ESLint 0 (затронутые файлы), `tsc --noEmit` 0, `web:test:ci` 46 файлов / fail 0,
Playwright-смоук на dev (виджет → админка → ответ → виджет; webhook: 401 на чужой
секрет, Reply пишет ADMIN-сообщение в верную сессию; mobile 390px). Скриншоты
и скрипты: `D:/coding/_scratch/2026-10-15/{shots,pw}/chat-*`.

---

## 3. Проверка Codex после интеграции (2026-10-16)

- `prisma.config.ts` теперь читает `.env` по пути от файла конфигурации и отказывает без `DATABASE_URL`; молчаливого fallback на `daibilet` нет.
- Добавлены `chat_webhook_dedupe` и `schema_alignment`. Diff от каталога миграций к `schema.prisma` пустой; обе новые миграции применены штатным `migrate deploy` **только** к проверенной локальной `daibilet_baseline`.
- Проблема истории миграций остаётся: в `daibilet_baseline` записаны четыре finance-миграции, которых нет в каталоге этой ветки; в старой `daibilet` — девять. Простое копирование четырёх файлов добавляет finance-таблицы, отсутствующие в этой ветке `schema.prisma`, и снова создаёт drift. Их нужно интегрировать вместе с finance-схемой и согласовать историю обеих БД; `migrate dev` и любые reset не применять.
- Chat endpoints перенесены в `/support/chat/*` из-за nginx `/api/*` → catalog backend. Секрет посетителя передаётся в теле POST, выдаются последние 200 сообщений. Публичная отправка ограничена в serializable-транзакции; Telegram webhook проверяет целевой chat id и `update_id`.
- Продуктовый выпуск чата и регистрация Telegram webhook пока не выполнены.

