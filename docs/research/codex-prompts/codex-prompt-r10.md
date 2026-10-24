# Codex — Stage 0: путь к первому реальному договору (open-date поставщик)

**Первый поставщик: арт-галерея.** Вторым пойдёт музей Матрёшки. Оба — open-date,
разница только в масштабе. Постановка не новая: она уже расписана в
`docs/museum-contract-readiness.md` § «Stage 0 — чеклист для Codex» с ID вида
`S0.PAY.5`. **Работай по этому чеклисту, не изобретай заново.**

Прочитай до начала работы:
- `docs/museum-contract-readiness.md` — целиком, особенно §Stage 0
- `docs/codex-finance-handoff.md` — что уже закрыто owner и что ждёт тебя
- `docs/checklists/yookassa-e2e-sandbox.md` — сценарии 1–3
- `docs/phase-2-finance-supplier-blueprint.md` — почему уходит widget-first
- `docs/finance-stage0-owner-runbook.md`, `docs/spb-finance-host.md`
- `docs/qa.md` — LOCKED-контракты, формат кодов

## Контекст

- Finance `.159` (85.193.80.159), каталог MSK `.184`
- YooKassa — **наш магазин**, билеты наши
- Каталог buyer UX Path A закрыт Cursor — **не переписывать**
- Secrets не трогать, live-ключи не включать, nginx на `.159` без запроса owner

## Уже сделано, не переделывать

- ✅ sandbox e2e pay → `payment.succeeded` → билет «Оплачен» (`publicCode 4717674`)
- ✅ Cabinet URL, Idempotency-Key, STUB выключен в проде
- ✅ AdmissionProduct + `canSell`, thin checkout, страница билета, список покупок

## Шесть блокеров до подписания

Порядок не произвольный: без reconcile не сойдутся деньги, без issuance
поставщик не пустит на площадку.

### 1. `S0.PAY.5` — reconcile path · Launch-blocker
Ручной CLI + черновик таймера: подтянуть статус платежа, если вебхук потерялся.
В чеклисте помечено критичным — «webhooks historically unreliable».
Deliverable: скрипт + runbook, проверка на sandbox- order.

### 2. `S0.TKT.2` — issuance ticket
При SUCCEEDED создавать ticket row(s) с уникальным номером. Path A = 1+ tickets per qty.
**Формат залочен:** internal `DB…`+seq / `TKT-…`, без ФИО; external — код партнёра as-is.

### 3. `S0.PAY.2` — return_url
`confirmation.return_url = https://daibilet.ru/checkout/result?order={publicCode}`
Path A = `daibilet.ru`, не `pay.daibilet.ru`. Дописать `?order=`, если его нет;
сохранить в snapshot для аудита.

### 4. `S0.SUP.3` — admin approve поставщика
Legal/bank approve + immutable snapshot. **Без approve нет легального договора.**
Сейчас в админке 14 разделов и среди них **нет ни поставщиков, ни финансов** —
раздел нужно сделать.

### 5. `S0.OPS.3` — manual refund / cancel
Без self-serve UI, процедура + аудит. Проверить: отмена освобождает слот и не
оставляет ложный билет (`S0.PAY.7`).

### 6. `S0.SUP.4` — `supplierSupportPhone`
Пробросить в public supplier/product DTO. Без него билет уходит без телефона.

## Финал: арт-галерея как первый поставщик

`S0.SUP.1` — seed-шаблон Supplier + AdmissionProduct под реального open-date
поставщика. **Не wide publish:** широкий CTA по каталогу выключен
(`Wide catalog CTA | Out | 🔒 off`). Опубликовать точечно.

Проверка приёмки — сценарии 1–3 из `yookassa-e2e-sandbox.md` плюс пилотная
оплата реального билета галереи.

## Не входит

- Stage 1: сеансы, capacity, слоты, recurring
- Stage 2: полный ЛК, payouts UI, self-service правка цен
- Воронка/аналитика — вне Stage 0
- Sitemap, контент площадок, SEO — параллельные треки

## Отчёт

Прогресс по пунктам с ID из чеклиста. Что сделано, что проверено, что осталось.
Проверки запускать — да, это код с тестами.