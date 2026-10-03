# YooKassa e2e sandbox: PENDING → SUCCEEDED

Чек-лист финальной верификации webhook / order lifecycle на **тестовом** контуре ЮKassa с эмулируемыми статусами.

**Статус Tasktracker:** сценарий 1 pay/webhook/ticket ✅ owner 2026-08-30 (`4717674`); `return_url?order=` ⏳ Codex (FIN.RETURN-1); сценарии 2–3 ⏳ (FIN.W1 / MIG.9.5 / M1.WH).

**Жёстко:** не трогать live secrets; не apply nginx на finance `.159` без явного запроса owner. Webhook canon: `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook` (**тестовый** магазин). Path A result: `?order={publicCode}` (см. [qa.md](../qa.md)). **Пошаговый owner runbook:** [finance-stage0-owner-runbook.md](../finance-stage0-owner-runbook.md). Lookup: `/api/public/checkout/orders/{publicCode}`.

---

## Сценарий 1: Успешная оплата (сквозной трек Path A)

- [x] **Init:** `daibilet.ru/checkout/admissions/{slug}` → форма оплаты
- [ ] **Session:** платёж ЮKassa с `return_url` = `daibilet.ru/checkout/result?order={publicCode}` — ⏳ FIN.RETURN-1 (Codex)
- [x] **Emulate:** тестовая карта success (тестовый магазин)
- [ ] **Redirect:** Path A success с валидным `publicCode` в URL — ⏳ зависит от FIN.RETURN-1 (билет уже открывался через UI/storage)
- [x] **Webhook:** `payment.succeeded` после настройки HTTP-уведомлений в **тестовом** магазине
- [x] **Result:** order CONFIRMED / билет «Оплачен» (example `publicCode=4717674`); `/account/purchases` fan-in ещё m2m ⏳

---

## Сценарий 2: Waiting for Capture

- [ ] **Init:** заказ двухстадийный
- [ ] **Emulate:** карта холдирования
- [ ] **Webhook:** `payment.waiting_for_capture` на `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook`
- [ ] **Result:** DB `AUTHORIZED` / `HOLD`; деньги заблокированы

---

## Сценарий 3: Cancel / insufficient_funds

- [ ] **Emulate:** `insufficient_funds` или cancel в ЮKassa
- [ ] **Redirect:** `pay.daibilet.ru` или Path A с ошибкой
- [ ] **Webhook:** `payment.canceled` на finance-api
- [ ] **Result:** DB `CANCELED`; слоты освобождены

---

## Acceptance

Все три сценария отмечены. Только после этого закрывать e2e в Tasktracker (FIN.W1 / M1.WH).
