# Finance Stage 0 — owner runbook (sandbox e2e + m2m)

**Дата:** 2026-08-30  
**Контур:** finance `.159` (`85.193.80.159`) + catalog MSK `.184`  
**Не трогать:** live YooKassa creds, wide catalog CTA, destructive finance DB.

Связанные документы:
- [checklists/yookassa-e2e-sandbox.md](./checklists/yookassa-e2e-sandbox.md)
- [spb-finance-host.md](./spb-finance-host.md)
- [qa.md](./qa.md) § Открыто п.1–4
- [codex-finance-handoff.md](./codex-finance-handoff.md)

---

## TL;DR

| Шаг | Кто | Время | Блокирует Stage 0 |
|-----|-----|-------|-------------------|
| Webhook в кабинете ЮKassa | Owner | ~10 мин | ✅ да |
| Sandbox e2e сценарий 1 | Owner + Codex logs | ~30–60 мин | ✅ да |
| m2m token MSK + `.159` | Owner | ~30 мин | fan-in ЛК (не блокер closeout) |

**Pilot product (controlled, не wide CTA):**
- Venue: `phase-g-test-museum` → `/venues/phase-g-test-museum`
- Admission slug: `phase-g-test-museum-entry`
- Checkout: `https://daibilet.ru/checkout/admissions/phase-g-test-museum-entry`

---

## 0. Webhook ЮKassa (owner)

### Канон (LOCKED)

| Поле | Значение |
|------|----------|
| URL | `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook` |
| **Не использовать** | `pay.daibilet.ru` (только return/user surface) |

### События для Stage 0

| Событие | Сценарий | Включить сейчас |
|---------|----------|-----------------|
| `payment.succeeded` | Сценарий 1 — успешная оплата | ✅ **да** |
| `payment.canceled` | Сценарий 3 — отмена/ошибка | ✅ **да** |
| `payment.waiting_for_capture` | Сценарий 2 — двухстадийный | ⏳ позже (сценарий 2) |
| `refund.succeeded` | Refunds light / Stage 2+ | ❌ нет |

После «Сохранить» в кабинете — проверить доставку (см. §4).

### Finance API жив?

На `.159` (логи от 2026-08-09 — норма старта):

```bash
ssh daibilet-finance-159
sudo systemctl status daibilet-finance-api
curl -fsS https://finance-api.daibilet.ru/api/health
```

Ожидаемо: `active (running)`, health **200**, listen `127.0.0.1:4100`.

---

## 1. Предусловия sandbox на `.159`

```bash
cd /opt/daibilet-finance/app   # см. spb-finance-host.md если путь другой

# только флаги, без значений секретов:
grep -E '^(DAIBILET_YOOKASSA|DAIBILET_STUB|YOOKASSA_)' .env | sed 's/=.*/=<set>/'
```

| Переменная | Ожидание sandbox |
|------------|------------------|
| `DAIBILET_YOOKASSA_CHECKOUT` | `1` |
| `DAIBILET_STUB_CHECKOUT` | `1` (dual-run для admin/dev OK) |
| `DAIBILET_YOOKASSA_VERIFY_WEBHOOK` | `1` (если verify включён в коде) |
| `YOOKASSA_SHOP_ID` | sandbox shop id |
| `YOOKASSA_SECRET_KEY` | `test_...` (sandbox key) |

Если `CHECKOUT=0`:

```bash
# правка .env owner вручную, затем:
sudo systemctl restart daibilet-finance-api
curl -fsS https://finance-api.daibilet.ru/api/health
```

### Проверка продукта (finance projection)

```bash
curl -fsS "https://finance-api.daibilet.ru/api/public/admission-products/phase-g-test-museum-entry" \
  | python3 -m json.tool | head -40
```

Ожидаемо: `canSell: true`, есть `checkoutPath` / slug.

---

## 2. Sandbox e2e — сценарий 1 (успешная оплата)

Чеклист: [yookassa-e2e-sandbox.md](./checklists/yookassa-e2e-sandbox.md) § Сценарий 1.

### 2.1 Браузер (owner, VPN off)

1. Открыть:  
   `https://daibilet.ru/checkout/admissions/phase-g-test-museum-entry`
2. Email + имя → «Оплатить».
3. Redirect на **ЮKassa sandbox** (`confirmationUrl`).
4. Тестовая карта **success** — актуальный номер из [доков ЮKassa sandbox](https://yookassa.ru/developers/payment-acceptance/testing-and-going-live/testing)  
   (часто `5555 5555 5555 4444`, срок — любой будущий, CVC `123`).
5. После оплаты — redirect:  
   `https://daibilet.ru/checkout/result?order={publicCode}`  
   **Записать `publicCode`.**

### 2.2 Webhook + статус (Codex / owner на `.159`)

```bash
sudo journalctl -u daibilet-finance-api --since "15 min ago" \
  | grep -iE 'webhook|yookassa|succeeded|payment|publicCode'
```

Ожидаемо: `payment.succeeded` → order → `CONFIRMED` / `PAID`.

Если PENDING > 3 мин без webhook:

```bash
cd /opt/daibilet-finance/app
pnpm backend:checkout:yookassa:reconcile -- --apply --grace-minutes=0
```

*(Точная команда reconcile — сверить с finance deploy branch / package.json на `.159`.)*

### 2.3 Order lookup

```bash
PUBLIC_CODE='<из URL result>'

curl -fsS "https://finance-api.daibilet.ru/api/checkout/order?publicCode=${PUBLIC_CODE}" \
  -H "Accept: application/json" | python3 -m json.tool
```

Catalog-side (server route proxy):

```bash
curl -fsS "https://daibilet.ru/api/checkout/order?publicCode=${PUBLIC_CODE}" \
  -H "Accept: application/json" | head -c 500
```

### 2.4 Acceptance сценария 1

| # | Критерий | ✓ |
|---|----------|---|
| 1 | Redirect `checkout/result?order={publicCode}` | ☐ |
| 2 | journalctl → `payment.succeeded` | ☐ |
| 3 | Order status CONFIRMED/PAID | ☐ |
| 4 | `ticketNumbers` не пустые (`TKT-{publicCode}-NN`) | ☐ |
| 5 | `/checkout/ticket/{publicCode}` открывается | ☐ |
| 6 | `/account/purchases` — заказ виден | ☐ |

После всех ✓ — отметить checklist + Tasktracker `M1.WH`, `M1.TKT`, `FIN.W1`.

---

## 3. m2m token — MSK + `.159`

**Зачем:** catalog → finance с Bearer для projection + будущий `purchases-by-email` fan-in (UX.BUY-6).  
**Не блокирует** Stage 0 closeout по оплате, но нужен для стабильного «Мои покупки» без только localStorage.

### 3.1 Сгенерировать token

```bash
openssl rand -hex 32
```

Сохранить в password manager. **Не** коммитить, **не** paste в chat.

### 3.2 MSK catalog `/opt/daibilet/.env`

```bash
FINANCE_API_BASE_URL=https://finance-api.daibilet.ru
FINANCE_CHECKOUT_BASE_URL=https://pay.daibilet.ru
NEXT_PUBLIC_FINANCE_CHECKOUT_BASE_URL=https://pay.daibilet.ru

# один из двух (код читает оба):
FINANCE_PROJECTION_TOKEN=<64hex>
# DAIBILET_FINANCE_PROJECTION_TOKEN=<64hex>
```

```bash
sudo systemctl restart daibilet-web daibilet-api
```

### 3.3 Finance `.159` `/opt/daibilet-finance/app/.env`

**Тот же token** (имя переменной — сверить с finance auth middleware на deployed branch; канон в catalog):

```bash
FINANCE_PROJECTION_TOKEN=<тот_же_64hex>
```

```bash
sudo systemctl restart daibilet-finance-api
```

### 3.4 Smoke

```bash
TOKEN='<64hex>'

# public (может работать без token)
curl -fsS "https://finance-api.daibilet.ru/api/public/admission-products?city=moskva" \
  -H "Accept: application/json" | head -c 200

# m2m — exact path уточнить у Codex после deploy; ожидание 200, не 401:
curl -fsS "https://finance-api.daibilet.ru/api/.../purchases-by-email?email=you@example.com" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json"
```

После sandbox pay с вашим email — проверить `https://daibilet.ru/account/purchases` в браузере.

---

## 4. Troubleshooting

| Симптом | Действие |
|---------|----------|
| `YOOKASSA_PAYMENT_FAILED` | shop_id / `test_` secret mismatch в `.env` |
| Завис на PENDING | webhook не дошёл → reconcile; проверить URL в кабинете |
| Webhook 401 в кабинете | nginx/TLS на `finance-api`; Codex проверить endpoint |
| 404 checkout | redeploy web MSK; проверить slug `phase-g-test-museum-entry` |
| Result без билетов | логи issuance на `.159`; order status |
| `pg DeprecationWarning` в логах | не блокер; tech debt pg client |

---

## 5. Что дальше (не Stage 0)

- Сценарии 2–3 checklist (`waiting_for_capture`, cancel)
- Operator contour (publicCode search, manual reconcile)
- Supplier LK MVP (FIN.W2)
- Live gates: 54-ФЗ, live creds, оферта → wide CTA

Handoff Codex: [codex-finance-handoff.md](./codex-finance-handoff.md)
