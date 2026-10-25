# UI-RBAC-0: карта страниц, действий и API админки

Дата: 2026-10-15. Автор: Cline (UI-инвентаризация). Решения по GAP приняты Codex 2026-10-16. С 2026-10-25 Next server actions проверяют перечисленные права через персональную сессию; direct-Prisma страницы чата и hero-banners также ограничены на сервере. Backend endpoint enforcement остаётся opt-in до закрытия оставшихся gaps.

Источники: `apps/web/app/(admin)/admin`, `apps/web/src/server/admin-*.ts`, словарь прав `packages/contracts/src/admin-access.ts` (`ADMIN_PERMISSIONS`, `ADMIN_ROLES`), проект RBAC [admin-rbac-design-2026-10.md](./admin-rbac-design-2026-10.md).

## Легенда

- **Тип данных:** `публичные` (каталог, контент, лендинги) / `контакт` (имя, email, телефон покупателя) / `финансы` (платежи, возвраты, суммы, расчёты) / `технические` (конфигурация обмена, realm, API base; секреты в UI не показываются).
- **Право:** значение из `ADMIN_PERMISSIONS`. Если в словаре подходящего права нет - помечено **GAP** с предложением; такие строки требуют решения Codex до реализации guards.
- **403 (страница):** server guard отдаёт 403 до рендера; страница показывает «Нет доступа к разделу» без данных и счётчиков. **403 (блок):** на смешанной странице блок заменяется явной плашкой «Нет доступа к данным блока» (не нулём). **403 (действие):** кнопка скрыта при отсутствии права; прямой POST всё равно получает 403 от сервера.

- Смешанные страницы разделены на блоки с разными правами - право не угадывается для страницы целиком.

## 1. Страницы и блоки

| Маршрут | Блок | Тип данных | Право | Backend | Состояние 403 |
|---|---|---|---|---|---|
| `/admin` (Обзор) | Контроль каталога (готовность, проблемы) | публичные | `catalog.read` | `GET /api/admin/dashboard` | блок 403 |
| `/admin` | Двигатель SEO-трафика (лендинги, хабы) | публичные | `seo.read` | `GET /api/admin/dashboard` | блок 403 |
| `/admin` | Состояние импортов | технические | `integrations.read` | `GET /api/admin/sources` | блок 403 |
| `/admin` | Заказы (сводка двух каналов) | финансы | `finance.summary.read` + `orders.read` | `GET /api/admin/orders?limit=1`, `GET /api/internal/admin/orders` | блок 403; при 403 по одному из прав - прочерки, не частичная сумма |
| `/admin` | Верхние метрики (смешанные) | публичные/технические | `catalog.read` + `integrations.read` | `GET /api/admin/dashboard`, `GET /api/admin/sources` | карточка 403 по своему праву |
| `/admin/orders` | Реестр (статусы, суммы, фильтры) | финансы | `orders.read` | `GET /api/admin/orders` (catalog), `GET /api/internal/admin/orders` (finance) | страница 403 |
| `/admin/orders` | Колонка «Покупатель», поиск по email/телефону | контакт | `orders.pii.read` | те же GET | колонка скрыта/маскирована; поиск без права - 403 |
| `/admin/orders/[id]` (внешняя карточка) | Заказ, билеты, источник | финансы | `orders.read` | `GET /api/admin/orders/:id` | страница 403 |
| `/admin/orders/[id]` | Покупатель (имя, email, телефон) | контакт | `orders.pii.read` | тот же GET | блок 403/маска |
| `/admin/orders/[id]` | Подбор события (кандидаты) | публичные | `catalog.read` | `GET /api/admin/order-event-candidates` | блок 403 |
| `/admin/orders/internal/[code]` | Заказ, билеты | финансы | `orders.read` | `GET /api/internal/admin/orders/:code` | страница 403 |
| `/admin/orders/internal/[code]` | Платёж и возврат (статусы, суммы) | финансы | `finance.read` | тот же GET | блок 403 |
| `/admin/orders/internal/[code]` | Покупатель | контакт | `orders.pii.read` | тот же GET | блок 403/маска |
| `/admin/buyers` | Весь экран (контакты, агрегаты заказов) | контакт | `orders.pii.read` (+`orders.read` для агрегатов) | `GET /api/admin/buyers` | страница 403 |
| `/admin/events` | Список, метрики готовности, фильтры | публичные | `catalog.read` | `GET /api/admin/events`, `GET /api/admin/taxonomy` | страница 403 |
| `/admin/events/[id]` | Source-панель (импортные факты) | публичные | `catalog.read` | `GET /api/admin/events/:id` | блок только чтение |
| `/admin/events/[id]` | Override: описание и тексты | публичные | `content.edit` | `POST /api/admin/events/:id/override` | форма 403 |
| `/admin/events/[id]` | Override: сниппет и индексация | публичные | `seo.edit` | `POST /api/admin/events/:id/override` | форма 403 |
| `/admin/events/[id]` | Override: изображение | публичные | `catalog.edit` | `POST /api/admin/events/:id/override` | форма 403 |
| `/admin/events/[id]` | Модерация/публикация события | публичные | `catalog.publish` | `POST /api/admin/events/:id/moderation` | действие 403 |
| `/admin/events/[id]` | Таксономия, связи с площадками | публичные | `catalog.edit` | `POST /api/admin/events/:id/taxonomy`, `.../venue-links` | формы 403 |
| `/admin/venues`, `/admin/venues/[id]` | Просмотр | публичные | `catalog.read` | `GET /api/admin/venues[/:id]` | страница 403 |
| `/admin/venues/[id]` | Форма редактирования | публичные | `catalog.edit` | `PATCH /api/admin/venues/:id` | форма 403 |
| `/admin/cities`, `/admin/cities/[id]` | Просмотр | публичные | `catalog.read` | `GET /api/admin/cities[/:id]` | страница 403 |
| `/admin/cities/[id]` | Форма редактирования | публичные | `catalog.edit` | `PATCH /api/admin/cities/:id` | форма 403 |
| `/admin/landings`, `/admin/landings/[slug]` | Список, карточка, кандидаты матчей | публичные | `seo.read` | `GET /api/admin/landings[/:slug]`, `.../candidates` | страница 403 |
| `/admin/landings/[slug]` | SEO-поля, матчи событий | публичные | `seo.edit` | `PATCH /api/admin/landings/:slug`, `POST .../matches/:eventId` | формы 403 |
| `/admin/articles`, `/new`, `/[id]`, `/[id]/preview` | Просмотр и черновики | публичные | `content.read` | `GET /api/admin/articles[/:id]` | страница 403 |
| `/admin/articles/[id]` | Редактор, архивация | публичные | `content.edit` | `POST /api/admin/articles`, `PATCH /:id` | форма 403 |
| `/admin/articles/[id]` | Публикация, «В Hero на /blog» | публичные | `content.publish` | `PATCH /:id` (статус, isFeatured) | действие 403 |
| `/admin/hero-banners` | Список баннеров главной | публичные | `content.read` | прямой Prisma-запрос (без API) | страница 403 |
| `/admin/hero-banners` | Toggle isActive (ротатор главной) | публичные | `content.publish` | server action (Prisma) | действие 403 |
| `/admin/reviews` | Список отзывов | публичные | `content.read` | `GET /api/admin/reviews` | страница 403 |
| `/admin/reviews` | Модерация (approve/reject) | публичные | `content.publish` | `POST /api/admin/reviews/:id/:action` | действие 403 |
| `/admin/change-requests`, `/[id]` | Очередь и карточка заявок | публичные (заявка поставщика) | `suppliers.read` | `GET /api/admin/event-change-requests[/:id]` | страница 403 |
| `/admin/chats`, `/admin/chats/[id]` | Диалоги с посетителями | контакт (текст обращения может содержать ПДн) | `support.read` | прямой Prisma-запрос в Next | страница 403 |
| `/admin/sources`, `/admin/sync-health` (alias) | Импорт, health, manual sync | технические | `integrations.read` | `GET /api/admin/sources` | страница 403 |
| `/admin/settings` | Доступ и API, импорты, флаги | технические | `integrations.read` | env-факты + `GET /api/admin/sources` | страница 403 |
| `/admin/settings` | Будущий раздел сотрудников | технические | `staff.manage` | - (API ещё нет) | блок 403 |


## 2. Server actions (UI-команды)

| Действие | Файл | Тип данных | Право | Backend | 403 |
|---|---|---|---|---|---|
| `saveAdminArticleAction` | admin-article-actions | публичные | `content.edit`; перевод в PUBLISHED - дополнительно `content.publish` | `POST /api/admin/articles`, `PATCH /:id` | action 403 |
| `archiveAdminArticleAction` | admin-article-actions | публичные | `content.edit` | `PATCH /:id` | action 403 |
| `setAdminArticleFeaturedAction` («В Hero на /blog») | admin-article-actions | публичные | `content.publish` | `PATCH /:id` | action 403 |
| `saveAdminCityAction` | admin-city-actions | публичные | `catalog.edit` | `PATCH /api/admin/cities/:id` | action 403 |
| `runAdminEcrAction` (approve/reject) | admin-ecr-actions | публичные | `suppliers.manage` | `POST /api/admin/event-change-requests/:id/:action` | action 403 |
| `runAdminEcrAction` (apply - пишет в каталог) | admin-ecr-actions | публичные | `suppliers.manage` + `catalog.edit` | тот же POST | без `catalog.edit` apply запрещён даже при `suppliers.manage` |
| `saveAdminEventOverrideAction` (секция «Описание») | admin-event-actions | публичные | `content.edit` | `POST /api/admin/events/:id/override` | форма 403 |
| `saveAdminEventOverrideAction` (секция «SEO») | admin-event-actions | публичные | `seo.edit` | тот же POST | форма 403 |
| `saveAdminEventOverrideAction` (секция «Изображение») | admin-event-actions | публичные | `catalog.edit` | тот же POST | форма 403 |
| `saveAdminEventModerationAction` | admin-event-actions | публичные | `catalog.publish` | `POST /api/admin/events/:id/moderation` | action 403 |
| `saveAdminEventTaxonomyAction` | admin-event-actions | публичные | `catalog.edit` | `POST /api/admin/events/:id/taxonomy` | action 403 |
| `saveAdminEventVenueLinksAction` | admin-event-actions | публичные | `catalog.edit` | `POST /api/admin/events/:id/venue-links` | action 403 |
| `rewriteAdminEventDescriptionAction` (AI-текст) | admin-event-actions | публичные | `content.edit` | `POST /api/admin/events/:id/rewrite-description` | action 403 |
| `fetchAdminVenueLinkSuggestionsAction` (read-only) | admin-event-actions | публичные | `catalog.read` | `GET /api/admin/events/:id/venue-link-suggestions` | fetch 403 |
| `setHeroBannerActiveAction` | admin-hero-banner-actions | публичные | `content.publish` | server action (Prisma) | action 403 |
| `saveAdminLandingSeoAction` | admin-landing-actions | публичные | `seo.edit` | `PATCH /api/admin/landings/:slug` | action 403 |
| `saveAdminLandingMatchAction` (матчи лендинга) | admin-landing-actions | публичные | `seo.edit` (альтернатива `catalog.edit` - на решение Codex) | `POST /api/admin/landings/:slug/matches/:eventId` | action 403 |
| `operateInternalAdminOrderAction` (refund) | admin-order-actions | финансы | `refunds.execute` | `POST /api/internal/admin/orders/:key/operation` (finance host) | action 403 |
| `operateInternalAdminOrderAction` (cancel неоплаченного) | admin-order-actions | финансы | `orders.cancel` | тот же POST | action 403 |
| `syncAdminOrdersTcAction` | admin-order-actions | технические | `integrations.retry` | `POST /api/admin/orders/sync` | action 403 |
| `archiveAdminOrdersBulkAction` (массовая архивация) | admin-order-actions | финансы | `orders.manage` | `POST /api/admin/orders/archive` | action 403 |
| `archiveAdminOrderAction` / `unarchiveAdminOrderAction` | admin-order-actions | финансы | `orders.manage` | `POST /api/admin/orders/:id/archive|unarchive` | action 403 |
| `upsertAdminOrderTicketAction` (ticket-link) | admin-order-actions | финансы | `orders.manage` | `POST /api/admin/orders/:id/tickets` | action 403 |
| `deleteAdminOrderAction` (жёсткое удаление) | admin-order-actions | финансы | штатного права нет: действие и endpoint вывести из рабочего интерфейса; исторические данные сохранять | `DELETE /api/admin/orders/:id` | закрыть, затем удалить маршрут |
| `moderateAdminReviewAction` (approve/reject) | admin-review-actions | публичные | `content.publish` | `POST /api/admin/reviews/:id/:action` | action 403 |
| `triggerSourceSyncAction` (TC / Teplohod) | admin-source-actions | технические | `integrations.retry` | `POST /api/admin/sources/ticketscloud/sync`, `POST /api/v1/tep/sync` | action 403 |
| `sendAdminChatMessage` | chat-actions | контакт | `support.write` | прямой Prisma-запрос в Next | action 403; до персональных сессий отдельная повторная проверка Basic Auth |
| `saveAdminVenueAction` | admin-venue-actions | публичные | `catalog.edit` | `PATCH /api/admin/venues/:id` | action 403 |

### Реализация server guards (2026-10-25)

Все перечисленные Next server actions вызывают общий `requireAdminPermissions` до сетевого вызова или записи. Проверяется актуальная персональная сессия через backend `/api/admin/auth/me`; invalid session закрывает операцию. Когда `DAIBILET_ADMIN_RBAC_ENFORCE` выключен, действующий legacy Basic Auth временно считается SUPERADMIN. Прямые Prisma-экраны чата и hero-banners проверяют права до чтения: `support.read` и `content.read`; ответ в чате требует `support.write`, переключение hero-баннера — `content.publish`.

Backend guard для article save и event override использует фактический payload: для override permission определяется отдельно для каждого поля; для статьи проверяются итоговые status/featured и текущие значения записи. Next action для override также проверяет право выбранной секции. Archive читает текущий статус и требует `content.publish`, если снимает опубликованную или featured статью.

## 3. Экспорты

В текущем UI экспортов нет. Право `orders.export` зарезервировано под будущий экспорт заказов: при появлении кнопки экспорт получает собственную строку в таблице 2 и проверку на server action/endpoint (кнопка без права скрывается, прямой вызов - 403).

## 4. Read-only API-вызовы (data loaders)

| Endpoint | Тип данных | Право | Примечание |
|---|---|---|---|
| `GET /api/admin/dashboard` | публичные/технические | `catalog.read` + `seo.read` + `integrations.read` | смешанный ответ; варианты обработки - в GAP №6 |
| `GET /api/admin/sources` | технические | `integrations.read` | |
| `GET /api/admin/orders`, `GET /api/admin/orders/:id` | финансы | `orders.read`; поля buyer - при `orders.pii.read` | catalog API |
| `GET /api/internal/admin/orders`, `GET /api/internal/admin/orders/:code` | заказ/финансы/контакт | `orders.read` для основных полей; `finance.read` для платежей, ledger и возвратов; `orders.pii.read` для buyer | finance host должен проецировать поля по правам сотрудника; сервисного токена Next недостаточно |
| `GET /api/admin/buyers` | контакт | `orders.pii.read` | |
| `GET /api/admin/order-event-candidates` | публичные | `catalog.read` | |
| `GET /api/admin/events`, `GET /api/admin/events/:id`, `GET /api/admin/taxonomy` | публичные | `catalog.read` | |
| `GET /api/admin/venues[/:id]`, `GET /api/admin/cities[/:id]` | публичные | `catalog.read` | |
| `GET /api/admin/landings[/:slug]`, `.../candidates` | публичные | `seo.read` | |
| `GET /api/admin/articles[/:id]` | публичные | `content.read` | |
| `GET /api/admin/reviews` | публичные | `content.read` | |
| `GET /api/admin/event-change-requests[/:id]` | публичные | `suppliers.read` | |

## 5. Решения по шести GAP

1. **Операции с заказами:** добавить `orders.manage` для архива и ticket-link. На первом выпуске оно есть только у SUPERADMIN; после аудита действий его можно разделить на более узкие права.
2. **Жёсткое удаление заказа:** не добавлять `orders.delete`. Кнопка и server action удалены; backend отвечает 403 на DELETE endpoint. Исправление ошибочного импорта делать отдельной обслуживающей процедурой с журналом, не действием из карточки.
3. **Отмена неоплаченного:** добавить отдельное `orders.cancel` для FINANCE и SUPERADMIN. Отмена брони не равна исполнению денежного возврата; `refunds.execute` остаётся самостоятельным правом.
4. **Матчи лендинга:** `seo.edit`. Операция управляет составом SEO-подборки, не полями исходного события.
5. **Статьи:** при сохранении целевого состояния `PUBLISHED` или `isFeatured=true` сервер требует `content.publish`, включая редактирование уже опубликованного материала. Для черновика достаточно `content.edit`. Проверять итоговое состояние после объединения с текущими данными, а не доверять только присланным полям формы.
6. **Dashboard:** оставить один маршрут с серверной проекцией по правам на отдельные секции. Любое доступное право открывает только свою секцию; отсутствующие секции не должны возвращаться в payload. Финансовая сводка загружается отдельно из двух API и требует оба `finance.summary.read` и `orders.read`. UI показывает 403 или недоступность блока, а не ноль.

Смешанные ответы заказов также требуют серверной проекции: `orders.read` не подразумевает доступ к контактам или деталям платежа. Скрытая колонка в браузере не предотвращает утечку через прямой API-запрос.

## 6. Сводка прав по профилям (кросс-проверка сценариев RBAC-дизайна)

- **COPYWRITER** (`catalog.read`, `content.read/edit`, `seo.read/edit`): видит каталог, статьи, тексты карточек событий, SEO-поля; не видит `/admin/orders`, `/admin/buyers`, `/admin/sources`, `/admin/settings` (без `integrations.read`), `/admin/change-requests` (без `suppliers.read`).
- **FINANCE** (`orders.*`, `refunds.*`, `finance.*`, `payouts.approve`, `documents.read`, `suppliers.read/bank.read`, `audit.read`): не имеет `catalog.publish` и `content.*` - не может публиковать события и статьи.
- **INTEGRATIONS** (`catalog.read`, `integrations.read/retry`, `audit.read`): видит импорт и диагностику; не видит заказы и покупателей.
- **SUPPORT** (`orders.read`, `orders.pii.read`, `refunds.request`, `support.*`): видит заказы с контактами, создаёт заявку на возврат; `refunds.execute` нет - исполнить возврат не может.
- **AUDITOR**: только чтение, включая финансы; действий нет ни одного.

## 7. Ограничения карты

- Инвентаризация сделана по коду Next-слоя (`apps/web`). Реальная проверка прав должна повторяться на catalog API и finance API: server actions теперь проверяют права до вызова, но backend endpoints должны оставаться самостоятельной границей, в том числе при прямых запросах.
- Идентичность сотрудника для finance host сейчас не передаётся (сервисный токен) - см. finance bridge (срез 4).
- `hero-banners` читает и пишет Prisma напрямую в обход API; Next server page/action теперь проверяют соответственно `content.read` и `content.publish`. Перенос на backend API остаётся желательным для единой audit boundary.
- Чат поддержки читает и пишет Prisma прямо из Next; страницы требуют `support.read`, ответ — `support.write`. Публичные `POST /support/chat/messages` и отправка посетителя через server action не получают admin-права: посетитель предъявляет случайный ключ диалога, ввод ограничен по длине и частоте. Backend enforcement всё ещё требуется, чтобы прямые запросы и любые обходы Next имели ту же политику.
