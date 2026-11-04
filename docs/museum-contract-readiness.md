# Готовность к первому договору: open-date поставщик (Path A)

**Alias / filename:** `museum-contract-readiness.md` (историческое имя; Stage 0 фокус = линейный вход, не «только музеи навсегда»).  
**Дата:** 2026-08-08 (taxonomy) · создан 2026-08-07  
**Ветка:** `feat/next-monorepo` (catalog) · finance runtime Codex на `.159` (`codex/phase2-finance-supplier`)  
**Канон границ:** [catalog-finance-projection.md](./catalog-finance-projection.md) · [spb-finance-host.md](./spb-finance-host.md) · [phase-2-finance-supplier-blueprint.md](./phase-2-finance-supplier-blueprint.md)  
**Product lock:** Path A = thin admission → YooKassa redirect; Path B calc / wide CTA / park admission - **out** для Stage 0 first contract.

---

## Таксономия: поставщик и коммерческие режимы

### Поставщик ≠ только музей

**Supplier** = площадка / организатор **разных типов**: музеи, арт-пространства, театры, фестивали и др. Тип площадки не равен коммерческому режиму продажи.

### Два коммерческих режима

| Режим (RU) | Slug (EN) | Суть | Типичные площадки | Stage |
|------------|-----------|------|-------------------|-------|
| **Линейная / открытая дата** (вход без фиксированного сеанса) | `OPEN_DATE` / open-date / admission | Продажа входных билетов **без** расписания сеансов: категории + цена на «вход» (валидность open-date / период) | В первую очередь музеи и арт-пространства | **Stage 0** (первый договор) |
| **События / сеансы** | `EVENTS` / scheduled-events | Разовые **или** повторяющиеся (регулярно / нерегулярно) события в рамках периода; категории билетов и цены **на сеанс/событие** | Театры, фестивали, лекции, концерты, разовые шоу и т.п. | **Stage 1** |

**Правило формулировок:** Stage 0 = «первый договор с **open-date** поставщиком (музей / арт)», **не** «только музей навсегда» и **не** полный event scheduling.

---

## Цель документа

1. Матрица **всех логичных функций** ticket/commerce-контура по ролям.  
2. Чёткий **brief для Codex**: что собрать и оттестировать **до первого реального договора с open-date поставщиком** (линейные входные билеты; не расписание сеансов).  
3. Явные этапы: **Stage 0** first open-date contract → **Stage 1** events/sessions supplier → **Stage 2** полный ЛК (клиенты / заказы / финотчётность).

---

## Этапы (roadmap)

| Stage | Название | Суть | Когда |
|-------|----------|------|--------|
| **0** | First open-date contract | Path A: `OPEN_DATE` / линейный вход, YooKassa, билет покупателю, reconcile, минимальный supplier+ops. Первый договор - open-date поставщик (музей или арт-пространство) | **Launch-blocker сейчас** |
| **1** | Scheduled-events supplier | События / сеансы (разовые или recurring), capacity, слоты; категории+цены per session/event | После стабильного Stage 0 |
| **2** | Full LK | Клиенты, заказы end-to-end, финотчётность, payouts/documents | После Stage 1 ядра |

**Правило:** не раздувать Stage 0 функциями Stage 1/2. Stage 0 = «купил вход → оплатил → получил билет → поставщик/мы видим заказ → деньги сходятся». Event schedule = Stage 1.

**Исторический ярлык `museum-1`:** в Tasktracker/чеклистах может оставаться как alias первого open-date контракта; в новых формулировках предпочитать **open-date / Stage 0**.

---

## Роли и матрица функций

Легенда критичности для **Stage 0 (first open-date contract):**  
**M1** = обязательно до договора · **Nice** = желательно, не блокер подписания · **S1/S2** = следующий этап · **Out** = вне scope Stage 0.

### 1. Покупатель (Buyer)

| Функция | Описание | Stage 0 | Статус сейчас |
|---------|----------|---------|---------------|
| Найти оффер входа | Venue / city admission при `canSell` | M1 (controlled, не wide CTA) | ✅ UI; CTA только allowlisted / test |
| Thin checkout Path A | Email (+ имя) → create-payment → redirect `confirmationUrl` | M1 | ✅ catalog thin; finance public admission YooKassa ⏳ Codex |
| Оплата ЮKassa | Sandbox→live redirect | M1 | ✅ create-payment sandbox (FIN.LC3); live - после gate |
| Return на thank-you | `daibilet.ru/checkout/result?order={publicCode}` | M1 | ✅ catalog; finance `return_url` ⏳ |
| Страница билета | `/checkout/ticket/{publicCode}`: код заказа, номер билета, QR, print, карта | M1 | ✅ UX; DTO enrichment ⏳ |
| Код заказа ≠ номер билета | Отдельный ticket id (хотя бы issued stub) | M1 (модель+выдача) | ⚠️ UI готов; issuance ⏳ Codex |
| Мои покупки | Список → ссылка на билет (не дубль карточки) | M1 | ✅ list+localStorage; purchases-by-email ⏳ |
| Email со ссылкой на билет | Best-effort SMTP | M1 (или явный fallback UI) | ⚠️ catalog UI fallback; MSK SMTP unset |
| PDF билета | Attach / download | Nice | ⏳ finance/Codex |
| Multi-category basket | Несколько категорий в одном заказе | Nice / Path B later | ⚠️ Path A = 1 offer×qty |
| Возврат self-service | Заявка покупателя | Nice / S2 | Out как self-serve; ops manual OK |
| Path B calc checkout | Сложный pricing | Out | Scaffold only |
| Выбор сеанса / события | Session picker | S1 | Out Stage 0 |

### 2. Open-date поставщик (линейный вход / `OPEN_DATE`)

Тип площадки: музей, арт-пространство и др. с режимом open-date. Не путать с events-supplier (Stage 1).

| Функция | Описание | Stage 0 | Статус |
|---------|----------|---------|--------|
| Карточка поставщика | ACTIVE, INTERNAL_SALES, legal/bank snapshot | M1 | 🔄 seed/test; approve flow ⏳ FIN.W2 |
| AdmissionProduct | OPEN_DATE / entry offers, `canSell` | M1 | ✅ projection + test product |
| Публикация оффера | Admin/ops публикует; supplier не обязан self-service | M1 | Admin/ops OK; supplier self-edit Out |
| Просмотр своих заказов | Supplier LC: заказы / статусы оплаты | M1 | 🔄 PurchaseProjection; LC polish ⏳ |
| Просмотр билетов / номеров | Список ticketNumber по заказу | M1 | ⏳ issuance |
| Сканер / валидация входа | QR площадки / check-in | Nice → S1 | Out для day-1 (номер+код достаточно для ручного контроля) |
| Отчёт по продажам за период | Простая выгрузка | Nice | S2 полный; Stage 0 = list+CSV enough |
| Управление capacity | Лимит билетов open-date | Nice | Soft `ticketsVacant` OK; reaper S1-ish |
| Расписание сеансов / события | Sessions / seats / recurring | S1 | Out |
| Редактирование цен self-service | Без admin | S2 | Out (admin ведёт) |
| Выплаты / ledger UI | Payouts | S2 | Ledger MVP later; real payouts Out |

### 3. Поставщик событий / сеансов (Stage 1)

| Функция | Stage |
|---------|-------|
| Event + EventSession + offers по слотам / категориям | S1 |
| Разовые и recurring (regular / irregular) в периоде | S1 |
| Capacity / hold / release на сеанс | S1 |
| Отмена сеанса + notify | S1 |
| Выбор сеанса в buyer checkout | S1 (может остаться thin, не Path B calc) |
| Seat map / зоны | S1+ / later |
| Hybrid widget + internal | Out Stage 0 |

### 4. Ops / Admin Daibilet

| Функция | Stage 0 | Статус |
|---------|---------|--------|
| Создать supplier + legal/bank approve | M1 | ⏳ FIN.W2 DoD |
| Создать/опубликовать AdmissionProduct (open-date) | M1 | ✅ schema/API; runbook ⏳ |
| Видеть CheckoutOrder в admin (PurchaseProjection) | M1 | ✅ STUB; YooKassa order smoke 🔄 |
| Manual reconcile платежа | M1 | ⏳ FIN.W1 |
| Manual refund / cancel + audit | M1 (ops) | ⏳ минимальный path |
| Support: найти заказ по publicCode / email / ticketNumber | M1 | ⏳ |
| Wide catalog CTA | Out | 🔒 off |
| TC/TEP import admin | Не для open-date Path A | Existing, не трогать |

### 5. Finance / payments (система + ops)

| Функция | Stage 0 | Статус |
|---------|---------|--------|
| create-payment YooKassa (admission) | M1 | ✅ sandbox FIN.LC3; public admission path ⏳ UX.BUY-5 |
| Webhook `payment.succeeded` / canceled | M1 | Cabinet URL ✅; e2e PENDING→SUCCEEDED ⏳ |
| Webhook verify (S2S fetch) | M1 | Flag VERIFY=1; e2e ⏳ |
| Reconcile job / manual script | M1 **критично** (webhooks historically unreliable) | ⏳ |
| Idempotent webhook + ProcessedWebhookEvent | M1 | 🔄 expect harden |
| Immutable order snapshot + сумма | M1 | ✅ invariant blueprint |
| return_url = catalog result `?order=` | M1 | ⏳ handoff (не supplier SPA) |
| Fiscal receipt 54-ФЗ | Nice / legal gate | Уточнить у owner до live money |
| Split / agent payout | Out / S2 | SINGLE_MERCHANT start |

### 6. Support

| Функция | Stage 0 | Статус |
|---------|---------|--------|
| Телефон / контакты на билете | M1 (или явный «через форму») | ⚠️ support phone нет в public DTO |
| Поиск заказа | M1 | Ops/admin |
| Переотправка письма / ссылки | M1 | Catalog notify + finance ⏳ |
| Возврат по заявке | M1 ops manual | Self-serve Out |

### 7. System / platform

| Функция | Stage 0 |
|---------|---------|
| Host split `.184` catalog / `.159` finance | Locked |
| m2m Bearer catalog↔finance | M1 для стабильного order lookup |
| Secrets не в git / не трогать `.159` env из catalog agents | Locked |
| SMTP на MSK web **или** documented fallback | M1 |

---

## Stage 0 - чеклист для Codex (DONE / TODO / TEST)

Фокус Codex = **finance `.159` + handoff contracts**. Catalog buyer UX Path A в основном закрыт Cursor (не переписывать).

### A. Платежи и статусы

| ID | Item | Status | Notes |
|----|------|--------|-------|
| S0.PAY.1 | Public/admission create-payment → `confirmationUrl` (не только supplier SPA path) | TODO | UX.BUY-5; `/api/checkout/yookassa` admission |
| S0.PAY.2 | YooKassa `return_url` = `https://daibilet.ru/checkout/result?order={publicCode}` | TODO | Не `supplier.daibilet.ru` |
| S0.PAY.3 | Webhook e2e sandbox: PENDING → SUCCEEDED / CONFIRMED | TODO / TEST | FIN.W1; cabinet URL already canon |
| S0.PAY.4 | Webhook idempotency + verify (S2S by payment id) | TODO / TEST | VERIFY=1 |
| S0.PAY.5 | **Reconcile path** (manual CLI + timer draft): подтянуть статус если webhook lost | TODO / TEST | Launch-blocker |
| S0.PAY.6 | STUB остаётся admin/dev dual-run | DONE | FIN.LC2/3 |
| S0.PAY.7 | Canceled / failed payment → order readable, no false ticket | TODO / TEST | |

### B. Заказ и билет (order ≠ ticket)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| S0.TKT.1 | Модель: `CheckoutOrder.publicCode` ≠ `ticketNumber` (issued) | TODO | qa LOCKED draft; UI already split. **Format lock:** internal = `DB…` + seq / `TKT-…` (без ФИО в коде); external/widget = код партнёра as-is (TC `KXM-…`, order `#…`) |
| S0.TKT.2 | Issuance при SUCCEEDED: создать ticket row(s) с уникальным номером | TODO | Path A: 1+ tickets per qty |
| S0.TKT.3 | Public order-by-code DTO: buyer, venue, address, validTo, items[], totals, paidAt, ticketNumber(s), supportPhone | TODO | Gaps в qa.md |
| S0.TKT.4 | QR payload: URL страницы билета **или** venue scan payload - зафиксировать в DTO | TODO | Catalog QR = page URL сейчас |
| S0.TKT.5 | PDF generation (optional attach) | Nice | Не блокер если HTML+print OK |
| S0.TKT.6 | Email buyer: link + optional PDF (finance or catalog SMTP) | TODO | MSK SMTP may stay unset → finance mail preferred |

### C. Open-date supplier Path A

| ID | Item | Status | Notes |
|----|------|--------|-------|
| S0.SUP.1 | Supplier + AdmissionProduct seed template для реального open-date поставщика (музей/арт) | TODO | Не wide publish |
| S0.SUP.2 | Supplier LC: список своих CheckoutOrder / tickets | TODO / TEST | FIN.W2 |
| S0.SUP.3 | Admin legal/bank approve + immutable snapshot | TODO | DoD FIN.W2 |
| S0.SUP.4 | `supplierSupportPhone` в public supplier/product DTO | TODO | Иначе билет без телефона |
| S0.SUP.5 | Scanner app | Out | Stage 0 manual |

### D. Admin / support / reconcile ops

| ID | Item | Status | Notes |
|----|------|--------|-------|
| S0.OPS.1 | Admin видит YooKassa order в PurchaseProjection | TEST | После e2e pay |
| S0.OPS.2 | Runbook: reconcile one payment by id/publicCode | TODO | Docs + script |
| S0.OPS.3 | Manual refund/cancel procedure (sandbox) | TODO / TEST | Без self-serve UI |
| S0.OPS.4 | Support search by publicCode / email / ticketNumber | TODO | |

### E. Catalog integration (Cursor + Codex contract)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| S0.CAT.1 | Thin Path A UI + ticket page + purchases list | DONE | Cursor 2026-08-07 |
| S0.CAT.2 | Demo ticket `/checkout/ticket/demo` | DONE | Visual QA |
| S0.CAT.3 | purchases-by-email public/m2m | TODO | UX.BUY-6 |
| S0.CAT.4 | m2m Bearer catalog→finance | TODO | CF.P1c |
| S0.CAT.5 | Wide catalog CTA | Out | Locked off |
| S0.CAT.6 | Path B `/checkout/calc` | Out for Stage 0 | |
| S0.CAT.7 | Session/event picker | Out | Stage 1 |

### F. Legal / contract readiness (owner + Codex docs)

| ID | Item | Status |
|----|------|--------|
| S0.LEG.1 | Оферта / правила возврата open-date Path A (текст) | Owner |
| S0.LEG.2 | Чек 54-ФЗ: кто fiscal agent (Daibilet SINGLE_MERCHANT?) | Owner + Codex confirm |
| S0.LEG.3 | Договор с open-date поставщиком: комиссия, выплата, SLA webhook/reconcile | Owner |
| S0.LEG.4 | ПДн / согласие на email | Owner / thin form copy |

---

## Задача для Codex (copy-paste)

```text
Задача: Stage 0 / first open-date supplier readiness (Path A admissions)
Канон: docs/museum-contract-readiness.md + docs/catalog-finance-projection.md
Таксономия (owner lock):
  - Supplier ≠ только музей: площадка/организатор (музей, арт, театр, фестиваль, …).
  - Stage 0 = режим OPEN_DATE / линейная открытая дата (вход без сеансов).
  - Stage 1 = события/сеансы (разовые или recurring) + категории/цены per session - НЕ строить сейчас.
Host: finance .159 only. НЕ трогать catalog wide CTA, TC/TEP secrets, finance secrets в git/chat.
НЕ строить Path B calc и НЕ строить session/schedule / events supplier (это Stage 1).

Сделать и оттестировать до первого договора с open-date поставщиком (музей или арт-пространство):

1) Payments
   - Public admission create-payment → confirmationUrl
   - return_url = https://daibilet.ru/checkout/result?order={publicCode}
   - Webhook e2e sandbox: PENDING → SUCCEEDED (canon URL finance-api…/yookassa/webhook)
   - Verify webhook (S2S); idempotent handler
   - Reconcile path (manual + draft timer): восстановить статус без webhook
   - Failed/canceled: заказ без «ложного» билета

2) Order ≠ ticket
   - Выдавать отдельный ticketNumber при успешной оплате (не коллапс в publicCode)
   - Public order-by-code DTO: buyer, venueTitle, venueAddress, validTo/validityMode,
     items[], totals, paidAt, ticketNumbers[], supplierSupportPhone
   - Покупки по email (m2m/public) для catalog «Мои покупки»

3) Open-date supplier Path A (linear / OPEN_DATE)
   - Шаблон supplier + AdmissionProduct для одного реального open-date поставщика
     (музей или арт; не wide publish; не events/sessions)
   - Supplier LC: видит свои заказы/билеты
   - Admin legal/bank approve + immutable snapshot
   - supportPhone в public DTO

4) Ops
   - Runbook reconcile + manual refund/cancel (sandbox)
   - Admin PurchaseProjection видит YooKassa order
   - Support search: publicCode / email / ticketNumber

Acceptance (sandbox, один test open-date supplier):
[ ] Create-payment → pay sandbox → webhook OR reconcile → order CONFIRMED
[ ] return_url открывает catalog result с ?order= и полный ticket (не sparse)
[ ] publicCode ≠ ticketNumber на билете
[ ] Email или документированный fallback со ссылкой на /checkout/ticket/{code}
[ ] Supplier LC видит заказ; admin PP видит заказ
[ ] Повторный webhook не дублирует ticket/fulfillment
[ ] Reconcile поднимает «зависший» PENDING без webhook
[ ] Wide CTA выключен; TC/TEP не затронуты; secrets не в git

Out of scope Stage 0: session/event schedule, recurring events, seat maps,
self-serve supplier catalog edit, buyer self-refund UI, Path B calc, real payouts,
park admission, wide internal sales CTA.
```

---

## План тестов до первого договора (e2e)

### T1. Happy path Path A (sandbox)

1. Admin: open-date supplier ACTIVE + published AdmissionProduct `canSell=true`.  
2. Buyer: `/checkout/admissions/{slug}` → email → redirect YooKassa.  
3. Оплатить sandbox.  
4. Webhook **или** reconcile → CONFIRMED.  
5. Return → `/checkout/result?order=…` → ticket card полная.  
6. `/checkout/ticket/{code}`: код заказа, **другой** номер билета, QR, print.  
7. `/account/purchases` показывает заказ → открыть билет.  
8. Supplier LC + admin PP видят тот же `publicCode`.

### T2. Webhook lost → reconcile

1. Создать payment; **не** доставлять webhook (или drop).  
2. Заказ PENDING.  
3. Запустить reconcile.  
4. Статус SUCCEEDED; ticket issued; без дублей при позднем webhook.

### T3. Cancel / fail

1. Отмена на стороне YooKassa.  
2. Заказ не CONFIRMED; ticket page не выдаёт «валидный вход»; UI честный статус.

### T4. Idempotency

1. Повтор webhook succeeded ×3.  
2. Один fulfillment / один набор ticketNumbers.

### T5. Return URL / sparse recovery

1. Return с `?order=` работает без localStorage.  
2. Return без query: recovery из cache не ломает; reopen by code после S0.TKT.3.

### T6. Email / SMTP

1. Если SMTP/finance mail есть - письмо со ссылкой.  
2. Если нет - UI fallback «сохраните код» (не silent fail).

### T7. Support phone

1. При наличии в DTO - на билете.  
2. При отсутствии - секция скрыта (как сейчас), но для Stage 0 DTO должен появиться.

### T8. Regression

1. TC/TEP widget event buy path не сломан.  
2. Wide admission CTA на city hubs **не** включён.  
3. Demo `/checkout/ticket/demo` 200 (visual baseline).

---

## Stage 1 - поставщик событий / сеансов (outline)

**Цель:** не линейный «вход на дату», а продажа **событий и сеансов** - разовых или повторяющихся (регулярно / нерегулярно) в периоде; категории билетов и цены на сеанс/событие.

| Блок | Содержание |
|------|------------|
| Модель | `Event` DAIBILET_MANAGED + `EventSession` (startsAt, capacity, isActive) + offers per session/category |
| Recurring | Regular и irregular серии в рамках периода (не open-date admission) |
| Buyer | Выбор сеанса → thin pay (всё ещё Path A-like; Path B только если сложный calc) |
| Capacity | Hold on create-payment / release on cancel / reaper TTL |
| Supplier LC | Календарь сеансов, отмена сеанса, просмотр занятости |
| Admin | Publish schedule; `scheduleLocked` rules из blueprint |
| Fulfillment | ticketNumber привязан к sessionId; QR может нести session+ticket |
| Out for S1 start | Full seat map, split payouts, self-service SEO publish |

**Зависимость:** Stage 0 платежи + order≠ticket + reconcile стабильны. **Не** расширять Stage 0 в полный event scheduling.

---

## Stage 2 - полный ЛК (outline)

**Цель:** операционная работа с клиентами, заказами, финотчётностью.

| Модуль | Содержание |
|--------|------------|
| Clients | Карточка покупателя, история заказов (Checkout + later External fan-in), контакты, support notes |
| Orders | Единый inbox: фильтры статус/поставщик/период; detail; manual actions (refund, resend, annotate) |
| Finance reporting | Ledger MVP (sale/commission/refund adj); отчёты период; CSV/PDF; **real payouts** отдельным gate |
| Documents | Договоры, акты, реквизиты snapshots |
| Supplier LC full | Dashboard, balance, reports, team, requisites (read-first → limited write) |
| Reviews / disputes | Только internal/owned; после продаж |
| Admin | Legal/bank, payment settings, disputes block payouts |
| Buyer voucher→slots (future) | После модели **единого ваучера**: разбиение на слоты; частичная отмена слота; замена слота с доплатой. Отдельное обсуждение - [qa.md](./qa.md) § Buyer LK / refunds / Stage 2+ |

**Не путать:** Stage 0 supplier LC «вижу свои заказы» ≠ Stage 2 «полный кабинет + финчётность». Stage 0 buyer = mailto support only, без self-refund.

---

## Out of scope для Stage 0 (first open-date contract)

- Wide catalog CTA / mass internal sales  
- Path B `/checkout/calc` для open-date  
- Session / event schedule / seats / capacity reaper как продукт  
- Recurring events product (Stage 1)  
- Park admission  
- TC/TEP → YooKassa  
- Real supplier payouts / ЭДО  
- Buyer self-service refund UI  
- Unified voucher → slot partial cancel / replace-with-surcharge (future Stage 2+; нужен единый ваучер сначала)  
- Scanner mobile app площадки  
- Force-merge Codex `pay.daibilet.ru` experiment поверх catalog Path A  
- Secrets / правка `.159` env из посторонних агентов без owner  

---

## Открытые вопросы для owner (коротко)

1. **Fiscal / 54-ФЗ:** чек от Daibilet (SINGLE_MERCHANT) на Stage 0 - OK?  
2. **Issuance:** LOCKED owner 2026-08-08 - internal Daibilet = `DB…`/`TKT-…` seq без ФИО; external/widget = код партнёра as-is при sync.  
3. **Scanner day-1:** достаточно печатного номера + код заказа, или нужен scan API до договора?  
4. **Email:** SMTP на MSK web vs mail с finance `.159` - что канон для production писем?  
5. **Support phone:** единый Дайбилет vs телефон поставщика в DTO?  
6. **Первый open-date договор:** музей или арт-пространство? какой venue/slug и город (для seed template, не wide)?  
7. **Возвраты:** только ops manual до Stage 2? (Stage 0 buyer = mailto only; voucher→slot partial cancel/replace = future Stage 2+)  

Детали/статус - в [qa.md](./qa.md) § Museum-1 / Stage 0 и § Buyer LK / refunds / Stage 2+.

---

## Ссылки

- Buyer UX tasks: Tasktracker `UX.BUY-*`  
- Finance smoke: `FIN.LC*`, `FIN.W1-4`, `MIG.9.5`  
- Epic: Tasktracker `M1.*`  
- Projection: [catalog-finance-projection.md](./catalog-finance-projection.md)  
- Blueprint LC: [phase-2-finance-supplier-blueprint.md](./phase-2-finance-supplier-blueprint.md)  
- Demo ticket: https://daibilet.ru/checkout/ticket/demo  
