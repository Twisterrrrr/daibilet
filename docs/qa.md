# qa.md — открытые вопросы

## 2026-07-23 - SEO-листинги, решения владельца

1. **Стартовое ядро:** утверждён TOP-15 URL. Приоритет редакторских текстов - эти 15 страниц.
2. **Крыши:** отдельная tag-посадка `/progulki-po-krysham/saint-petersburg`. Москва не создаётся и не добавляется в sitemap.
3. **Телефон:** пока не публикуем. Слот для 8-800 или городского номера pending у владельца, launch не блокирует. На контактах остаются email, ИНН и ОГРНИП.
4. **Порог индекса:** `MIN_LISTING_OFFERS_FOR_INDEX = 6`; повышать до 10-12 не нужно. Значение 10 остаётся мягким контентным ориентиром.
5. **SEO-тексты:** seed принят как MVP для launch set. Нужна последующая редакторская вычитка без изменения URL и правил.

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
