# CODEX handoff — finance contour (2026-08-30)

**Hosts:** finance `.159` (`85.193.80.159`) · catalog MSK `.184`  
**Owner runbook:** [finance-stage0-owner-runbook.md](./finance-stage0-owner-runbook.md)  
**Secrets / `.159` env:** только owner

---

## Owner status (2026-08-30 evening)

- Webhook URL в **тестовом** магазине ЮKassa: `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook` ✅
- Events: `payment.succeeded`, `payment.canceled` ✅ (`waiting_for_capture` off — OK для сценария 1)
- Sandbox keys (`test_…`) на `.159` совпадают с тестовым магазином ✅
- Finance API: `daibilet-finance-api` active, `:4100` ✅
- Catalog MSK: Idempotency-Key + no STUB auto-fallback in prod (`f34c8595`, `575e9471`) ✅
- **Sandbox e2e pay → webhook → ticket «Оплачен»** ✅ (example `publicCode=4717674`)
- Lookup path: `GET /api/public/checkout/orders/{publicCode}` (не `/api/checkout/order?publicCode=` — 404)

**Owner gates for scenario 1 closed.** Remaining = Codex polish + docs closeout.

---

## Prompt для Codex (copy-paste) — FIN.RETURN-1 + closeout

```
Контекст: Daibilet finance `.159` (85.193.80.159), catalog MSK `.184`.
SSH finance: daibilet_spb_finance. Secrets не трогать. Live YooKassa creds не включать.

Docs:
- docs/finance-stage0-owner-runbook.md
- docs/checklists/yookassa-e2e-sandbox.md
- docs/spb-finance-host.md
- docs/qa.md § Path A / publicCode
- apps/web/app/checkout/actions/admission/route.ts (catalog — already OK)

Owner DONE (2026-08-30):
- Webhook в ТЕСТОВОМ магазине ЮKassa (не боевом)
- Sandbox pay → payment.succeeded → ticket CONFIRMED/Оплачен (publicCode 4717674)
- Catalog deploy: Idempotency-Key; STUB disabled in production auto mode

---

## 1) FIN.RETURN-1 — YooKassa return_url с ?order={publicCode}  [CRITICAL]

Проблема: после «Вернуться на сайт» buyer может попасть на /checkout/result без ?order=.

Канон (LOCKED):
  confirmation.return_url = https://daibilet.ru/checkout/result?order={publicCode}
  Path A = daibilet.ru (не pay.daibilet.ru)

Catalog contract (live):
  POST /checkout/actions/admission sends returnUrl BASE without code
  (publicCode assigned on finance at create time)
  response includes returnUrlHint / catalogReturnWithOrder with ?order=

Finance MUST after assigning publicCode:
  base = input.returnUrl || "https://daibilet.ru/checkout/result"
  if no order= query → append ?order={encodeURIComponent(publicCode)}
  pass to YooKassa confirmation.return_url
  persist in payment/order snapshot for audit

Verify:
  new sandbox pay → «Вернуться на сайт» → lands on
  https://daibilet.ru/checkout/result?order={publicCode}
  curl -fsS https://finance-api.daibilet.ru/api/public/checkout/orders/{publicCode}

Out of scope: 3s auto-redirect on YooKassa hosted page (merchant cannot configure).

---

## 2) CLOSEOUT CHECKLIST + TASKTRACKER

- Mark yookassa-e2e-sandbox.md §1 items that owner proved (Init/Emulate/Webhook/Result)
- Session + Redirect depend on FIN.RETURN-1
- Update Tasktracker M1.WH / M1.TKT / FIN.W1 notes (scenario 1 pay path done; return_url open)

Note: reconcile-yookassa with grace-minutes=0 only handles EXPIRED pending —
it does NOT poll succeeded payments. Webhook is the path. Manual reconcile
needs `set -a && source .env && set +a` or systemd EnvironmentFile.

---

## 3) M2M TOKEN SMOKE (after owner puts token in env)

- MSK: FINANCE_PROJECTION_TOKEN / DAIBILET_FINANCE_PROJECTION_TOKEN
- .159: same token
- Smoke purchases-by-email / /account/purchases fan-in

## 4) FINANCE PG BACKUP

- Port postgres-backup.sh pattern for daibilet-finance-postgres
- One manual dump + verify

## 5) DEPLOY TRUTH .159 + incident runbook draft

- git SHA, branch, env flags (no secret values)
- finance-incident-runbook.md (webhook fail, wrong shop, reconcile limits, publicCode search)

Не делать: live creds, wide CTA, 54-ФЗ, destructive DB.
```

---

## Open finance gaps (reference)

| ID | Gap | Owner/Codex | Status 2026-08-30 |
|----|-----|-------------|-------------------|
| M1.WH | E2E webhook sandbox pay | Owner ✅ + Codex docs | pay/ticket ✅; return_url open |
| FIN.RETURN-1 | `return_url?order=` | Codex | ⏳ |
| M1.BUY | purchases-by-email m2m | Owner token + Codex | ⏳ |
| FIN.W2 | Supplier LC | Codex | ⏳ |
| M1.OPS | Operator runbook | Codex | ⏳ |
| Live gates | 54-ФЗ, live YooKassa | Owner | later |
