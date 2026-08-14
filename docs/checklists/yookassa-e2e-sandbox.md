# YooKassa e2e sandbox: PENDING → SUCCEEDED

Чек-лист финальной верификации webhook / order lifecycle на **тестовом** контуре ЮKassa с эмулируемыми статусами.

**Статус Tasktracker:** чек-лист готов; прогон трёх сценариев - ⏳ (FIN.W1 / MIG.9.5 / M1.WH).

**Жёстко:** не трогать live secrets; не apply nginx на finance `.159` без явного запроса owner. Webhook canon: `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook`. Path A result: `?order={publicCode}` (см. [qa.md](../qa.md)).

---

## Сценарий 1: Успешная оплата (сквозной трек Path A)

- [ ] **Init:** `daibilet.ru/checkout/admissions/{slug}` → форма оплаты
- [ ] **Session:** платёж ЮKassa с `return_url` = `daibilet.ru/checkout/result?order={publicCode}`
- [ ] **Emulate:** тестовая карта success
- [ ] **Redirect:** Path A success с валидным `publicCode`
- [ ] **Webhook:** logs finance-api → `payment.succeeded`
- [ ] **Result:** DB `PAID`; билеты в `daibilet.ru/account/purchases`

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
