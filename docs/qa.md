# qa.md — открытые вопросы

## 2026-08-09 - Stage 0 admission ticket core (в PR / code done)

**PR-ветка:** `codex/stage0-admission-ticket-core` @ `d53cb1d`
**Base:** `codex/phase2-finance-supplier`
**Статус:** код и тесты готовы; **ждёт smoke на finance `.159`** (create-payment sandbox -> confirmationUrl -> webhook/reconcile -> `CONFIRMED` + `ticketNumbers`). Деплой `.159` - только по явному go owner («выкатывай на finance»).

### Закрывается этим PR (gaps -> code done)

| Gap | Статус |
|-----|--------|
| Issuance `ticketNumbers` (`TKT-{publicCode}-NN`, != `publicCode`; только после successful webhook/reconcile) | в PR / code done, ждёт smoke `.159` |
| Buyer enrichment public order DTO (buyer, venue title/address/coords, validity, items, totals, paidAt/confirmedAt, ticketNumbers, supplierSupportPhone) | в PR / code done, ждёт smoke `.159` |
| Path A YooKassa `return_url` -> `https://daibilet.ru/checkout/result?order={publicCode}` | в PR / code done, ждёт smoke `.159` |
| no-store buyer lookup: order-by-`publicCode` + purchases-by-email (`/api/public/checkout/orders|purchases`, `/api/checkout/orders`, `/api/public/purchases`) | в PR / code done, ждёт smoke `.159` |
| Public `/api/checkout/yookassa` принимает `VENUE_ADMISSION` + `admissionProductSlug`/`admissionProductId` + `admissionOfferId` | в PR / code done, ждёт smoke `.159` |

### Не закрыто этим PR

- Live sandbox smoke на `.159` (нужен явный go owner).
- Product Q Museum-1 (54-FZ схема, ownership внешнего scanner code до договора) - см. catalog `docs/qa.md` на `feat/next-monorepo`.
- Wide CTA, Path B calc, session/schedule supplier, TC/TEP secrets - out of Stage 0.


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
