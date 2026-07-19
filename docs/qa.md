# qa.md — открытые вопросы

## 2026-07-19 — Teplohod orders API (блокер импорта)

Спросить у Теплохода / аккаунт-менеджера:

1. **Endpoint:** подтверждаете ли `GET https://account.teplohod.info/api/orders` как список продаж агента? Есть ли другой URL (в т.ч. на `api.teplohod.info/v1` под IP allowlist)?
2. **Auth:** схема (Bearer / `access-token` query / Basic / кастомный header). Как выпустить токен для виджета `14208` / нашего агентского аккаунта?
3. **Поля ответа:** id заказа, статус, даты создания/оплаты, email/телефон покупателя, билеты (id/status), `event_id` / `event_time_id`.
4. **Фильтры инкрементального sync:** `dateFrom`/`dateTo` / `updatedSince` / pagination (`page`, `per-page`).
5. **Webhooks:** есть ли callback после оплаты как альтернатива polling?
6. **Scope:** отдаются ли только продажи через наш `widget_id`, или весь кабинет?

До ответа: `npm run tep:orders` → `BLOCKED`; cron `*/15` логирует BLOCKED, заказы не пишет.

## 2026-07-19 — после аудита админки

1. **Admin catalog read-model:** когда переходим с in-memory `groupAdminEventRows` на SQL keyset pagination (Events 0.5.8)? Cold cache ~25s всё ещё риск на 3.8Gi.
2. **Роли / ACL:** Basic Auth + один `ADMIN_EMAIL` достаточно до F4, или нужен второй операторский аккаунт раньше?
3. **ECR:** включать `VITE_DAIBILET_EVENT_CHANGE_REQUESTS` после первого реального change-request, или держать до Phase 2 supplier flow?
4. **Архив заказов:** оставляем auto-archive cancelled ≥30d, или нужен отдельный sync «живых» confirmed из TC/TEP чтобы active-список не выглядел пустым?
5. **Lean description 4000:** хватает для ContentTab Source, или редакторам нужен полный текст только из `:id` (уже есть)?

## Ранее

См. историю в `f:\coding\DAIBILET\docs\qa.md` (архитектурные вопросы Next vs Vite, 11.07.2026).
