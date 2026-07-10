# Журнал решений Daibilet

Этот файл фиксирует решения, которые влияют на архитектуру, запуск и дальнейшие фазы. Новые решения добавляем сверху или в конец с датой.

## 2026-07-10: Event change requests get an admin read/review API before supplier UI

Решение:

- добавить `GET /api/admin/event-change-requests` для управляемого списка заявок;
- показывать админке безопасный DTO: событие, поставщик, автор, ревьюер, статус, тип, доступные действия и `payloadKeys`, но не сырой payload;
- добавить `POST /api/admin/event-change-requests/:id/approve` и `/reject` как review-слой с audit log;
- оставить `POST /api/admin/event-change-requests/:id/apply` отдельным шагом после approve;
- добавить страницу админки `/change-requests` с таблицей, фильтрами и действиями;
- описать DTO в `packages/contracts/src/admin.ts`, чтобы admin UI и backend не разъехались.

Причина:

- до полноценного ЛК поставщика оператору нужен контроль заявок из админки;
- approve/reject и apply нельзя смешивать: review принимает человек, apply пишет данные и сбрасывает public cache;
- UI не должен получать сырой payload без отдельного detail/diff экрана.

Следствие:

- следующий шаг в admin UI: detail drawer с diff/payload preview;
- финконтур/YooKassa по-прежнему не включается этим решением;
- supplier self-service остается будущим слоем поверх уже проверенного backend workflow.

## 2026-07-10: Approved event changes apply through one transactional backend layer

Решение:

- approved `EventChangeRequest` для существующих событий применяются через `event-change-request-applier`;
- apply всегда идет через Prisma transaction;
- request status, domain writes и `EventChangeLog` пишутся вместе;
- content/media/SEO сохраняются через `EventOverride`, чтобы не затирать imported source fields;
- admin endpoint для применения: `POST /api/admin/event-change-requests/:id/apply`;
- `CREATE`, contentBlocks, gallery и recurrence expansion пока не включены в apply.

Причина:

- перед ЛК поставщика нужен безопасный backend path от заявки до фактической карточки;
- нельзя давать UI кнопку approve/apply, пока запись в событие, аудит и cache invalidation разнесены по разным местам;
- текущий MVP должен сохранить widget-first продажи, поэтому apply не включает финконтур.

Следствие:

- следующий шаг: admin read/API для списка заявок и approve/reject/apply действий;
- затем supplier draft routes и controlled `CREATE` apply.

## 2026-07-10: Event change payload has draft/apply validation boundary

Решение:

- `EventChangeRequest.payload` валидируется по конкретному типу заявки, а не как произвольный JSON.
- `UPDATE` не может менять расписание или цены; для этого есть `SCHEDULE_UPDATE` и `OFFER_UPDATE`.
- Черновик может быть неполным, но `apply` требует данные, нужные для безопасной записи в БД.
- Все заявки на изменение существующего события при `apply` требуют `baseSnapshot.eventUpdatedAt`.
- `CREATE.event` не принимает `supplierId`, `purchaseFlow` и `managementMode` из payload; эти поля выводятся из auth/DB/applier context.
- Офферы обновляются только с явной семантикой `UPSERT_LIST` или `REPLACE_ALL`.
- Recurring schedule нельзя применить без готовых generated sessions, пока нет отдельного recurrence expansion сервиса.

Причина:

- ЛК поставщика и admin-assisted режим не должны обходить read-only правила импортных событий.
- Применение изменений должно быть транзакционным и защищенным от silent overwrite.
- Supplier HTTP routes не должны доверять JSON для серверных ownership/payment полей.
- Эта граница нужна до HTTP routes и до будущего typed payload applier.

Следствие:

- Transactional applier реализован отдельным следующим решением; следующий backend шаг теперь admin moderation/read API для заявок.
- Internal checkout/YooKassa runtime по-прежнему не включается этим решением.

## 2026-07-09: Phase 2 начинается с contracts/state, а не с немедленного YooKassa runtime

Решение:

- исследовать SPBBOATS admin/supplier/backend/docs;
- перенести полезные инварианты в Daibilet, но не копировать legacy-монолит;
- начать Phase 2 с БД-контрактов: fulfillment, refunds, idempotency, supplier legal/report/document, reviews;
- отдельно отложить включение YooKassa runtime до state machines, STUB checkout и smoke.

Причина:

- полный финконтур требует надежных статусов, idempotency и audit;
- параллельная модель widget + internal checkout невозможна без `PurchaseFlow`;
- ЛК поставщика должен видеть заказы/баланс/отзывы, но не управлять налоговой моделью;
- SPBBOATS показал полезные инварианты, но его объем нельзя переносить целиком.

Следствие:

- создан [Phase 2 blueprint](phase-2-finance-supplier-blueprint.md);
- добавляется migration `20260709223000_phase2_commerce_supplier_contracts`;
- `ExternalOrder` остается widget-зеркалом;
- `CheckoutOrder` + `FulfillmentItem` + `Payment` становятся основой внутреннего checkout;
- отзывы включаем только для internal/owned событий, а не для импортных TC/Teplohod.

## 2026-07-09: Заложить фазы 2-4 в Prisma, но не включать в MVP runtime

Решение:

- добавить БД-модели для поставщиков, комиссий, выплат, внутреннего checkout, платежей, чеков, trip planner и единого ваучера;
- оставить текущий пользовательский и операторский флоу widget-first;
- не проводить платежи и чеки через Daibilet до отдельной фазы YooKassa.

Причина:

- проект должен быстро стартовать с продажами через TC/Teplohod;
- при этом фаза 2 уже понятна: музеи и поставщики с доступом в ЛК и чеками через Daibilet;
- лучше заложить правильные таблицы сейчас, чем потом пришивать финконтур рядом с каталогом.

Следствие:

- `ExternalOrder` остается зеркалом виджетной покупки;
- `CheckoutOrder` используется только для будущего внутреннего checkout;
- суммы финансового контура хранятся в копейках;
- короткий номер для человека хранится в `publicCode`, технический `id` не выводится пользователю.

## 2026-07-09: Не накатывать Cursor-ветку поверх Codex-ветки автоматически

Решение:

- не мержить Cursor UI/JS-изменения поверх текущего backend-ts-foundation без аудита;
- использовать Cursor-ветку как источник UI/UX и deploy-наработок;
- интегрировать через четкий промпт или отдельную ветку.

Причина:

- Cursor-ветка содержит полезный public/admin визуал;
- Codex-ветка содержит TS/Prisma foundation и backend hardening;
- прямой overwrite может потерять новые Prisma DTO, ProviderLink, source health и тесты.

Следствие:

- live daibilet.ru не затираем;
- staging нужен до production switch;
- перед интеграцией сравниваем public/admin/backend отдельно.

## 2026-06-30: Слот поставщика не является отдельным событием

Решение:

- доменная карточка события одна;
- временные варианты покупки живут как `EventSession`;
- provider identity для слотов хранится через `ProviderLink` с `entityKind=SESSION`.

Причина:

- Ticketscloud может отдавать каждый слот как отдельный event;
- для пользователя это одна экскурсия с разными датами/временем;
- для SEO и UX нельзя плодить сотни дублей карточек.

Следствие:

- public catalog группирует слоты;
- event detail показывает ближайшие слоты, а не полотно всех рейсов;
- покупка конкретного слота должна вести в корректный provider event/session.

## 2026-06-25: Идти через Prisma bridge, а не переписывать backend сразу

Решение:

- добавить `packages/db` и Prisma client;
- переносить DTO/read-models постепенно;
- сохранять совместимость с существующими SQL-миграциями и runtime.

Причина:

- `dto.js` слишком большой и рискованный для одномоментного переписывания;
- проекту нужен запуск продаж, а не долгий enterprise rewrite;
- постепенный перенос дает тестируемые срезы.

Следствие:

- каждый новый Prisma-backed read-model покрывается тестами;
- `dto.js` сокращается по мере переноса;
- маршруты переводятся на TS entrypoint по одному.

## 2026-06-20: MVP запускается через виджеты билетных систем

Решение:

- не проводить через Daibilet оплату и чеки в первой версии;
- открывать Ticketscloud/Teplohod widget или provider purchase flow;
- хранить факт покупки, покупателя, статус заказа и билета.

Причина:

- меньше юридических, фискальных и операционных рисков;
- быстрее выйти к первым продажам;
- можно проверить спрос и SEO без собственного checkout.

Следствие:

- финконтур и supplier cabinet не блокируют первую продажу;
- admin должен быть сильным в source health, readiness и external orders;
- public должен быстро вести к покупке у provider.

## 2026-06-19: Public pages должны быть SEO-хабами, а не сухой выдачей

Решение:

- город, площадка и лендинг должны иметь содержательные блоки;
- каталог событий остается быстрым и фильтруемым;
- страницы не должны выглядеть как техническая выгрузка.

Причина:

- проект делает ставку на SEO и органику;
- старый Daibilet/SPBBOATS дал хорошие шаблоны city/landing pages;
- пользователю нужен контекст, советы и подборки, а не только карточки.

Следствие:

- развиваем landing/content block систему;
- переносим полезные UX-паттерны из legacy;
- избегаем тяжелых изображений, кроме hero и нужных карточек.

## 2026-06-18: Монорепо остается правильной формой проекта

Решение:

- public, admin, backend, db, contracts и config держим в одном workspace;
- supplier app появится позже как отдельное приложение внутри монорепо.

Причина:

- общие DTO и Prisma-схема должны быть синхронны;
- deploy и миграции проще контролировать из одного репозитория;
- SPBBOATS был слишком тяжелым, но сама идея монорепо верная.

Следствие:

- развиваем pnpm workspace;
- типы API уносим в `packages/contracts`;
- DB-клиент и миграции живут в `packages/db`.

## 2026-07-10: Admin-assisted supplier mode является штатным режимом

Контекст:

- часть площадок и поставщиков коммерчески важна, но не будет вести ЛК самостоятельно;
- Daibilet должен уметь создавать и сопровождать события, расписание, цены и контент от имени поставщика;
- при этом нельзя терять аудит и смешивать, кто именно сделал изменение.

Решение:

- вводим `EventManagementMode`;
- `DAIBILET_MANAGED` означает, что админ ведет событие от имени поставщика;
- `SUPPLIER_DRAFTS` означает, что поставщик создает черновики и заявки, но публикация остается за админом;
- `SUPPLIER_SELF_SERVICE` оставляем как будущий режим для доверенных поставщиков;
- все заявки поставщика идут через `EventChangeRequest`;
- все действия пишутся в `EventChangeLog`;
- imported TC/Teplohod остаются `SOURCE_MANAGED`, расписание read-only.

Следствия:

- поставщик может существовать без активного пользователя ЛК;
- админ не притворяется поставщиком, а действует с явным audit trail;
- buyer account усиливается отдельно: `ExternalOrder` привязывается к `SiteUser`, чтобы "Мои покупки" видели widget-покупки.
