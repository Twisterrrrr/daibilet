# CODEX handoff — finance contour (2026-08-30)

**Hosts:** finance `.159` (`85.193.80.159`) · catalog MSK `.184`  
**Owner runbook:** [finance-stage0-owner-runbook.md](./finance-stage0-owner-runbook.md)  
**Secrets / `.159` env:** только owner

---

## Owner status (2026-08-30)

- Webhook URL в кабинете ЮKassa: `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook` ✅
- Events enabled: `payment.succeeded`, `payment.canceled` ✅
- `payment.waiting_for_capture` — off (OK для сценария 1)
- Finance API: `daibilet-finance-api` active since 2026-08-09, `:4100` ✅
- Catalog PG backup + drill MSK ✅ (parallel track)

---

## Prompt для Codex (copy-paste)

```
Контекст: Daibilet finance 85.193.80.159, catalog MSK 201.24.125.184.
SSH finance: daibilet_spb_finance. Secrets не трогать без owner.

Docs:
- docs/finance-stage0-owner-runbook.md
- docs/checklists/yookassa-e2e-sandbox.md
- docs/spb-finance-host.md
- docs/qa.md § Roadmap финконтура

Owner уже настроил webhook URL + payment.succeeded/canceled в кабинете ЮKassa.

Сделай:

1) ASSIST SANDBOX E2E СЦЕНАРИЙ 1
   - Pilot: /checkout/admissions/phase-g-test-museum-entry
   - Owner платит sandbox картой; ты смотришь journalctl daibilet-finance-api
   - Verify: payment.succeeded, order CONFIRMED, ticketNumbers, /api/checkout/order?publicCode=
   - Если PENDING: pnpm backend:checkout:yookassa:reconcile -- --apply --grace-minutes=0
   - Отметь checklist yookassa-e2e-sandbox.md §1 + Tasktracker M1.WH/M1.TKT/FIN.W1

2) M2M TOKEN SMOKE (после owner положит token в env)
   - MSK: FINANCE_PROJECTION_TOKEN / DAIBILET_FINANCE_PROJECTION_TOKEN
   - .159: тот же token
   - Smoke purchases-by-email / internal projection с Bearer
   - Verify /account/purchases fan-in после sandbox pay

3) FINANCE PG BACKUP
   - Port postgres-backup.sh pattern для daibilet-finance-postgres
   - One manual dump + verify

4) DEPLOY TRUTH .159
   - git SHA, branch, env flags (no secret values in Diary)
   - Update spb-finance-host.md if drift

5) finance-incident-runbook.md draft (webhook fail, reconcile, publicCode search)

Не делать: live creds, wide CTA, 54-ФЗ, destructive DB.
```

---

## Open finance gaps (reference)

| ID | Gap | Owner/Codex |
|----|-----|-------------|
| M1.WH | E2E webhook sandbox | Owner pay + Codex verify |
| M1.BUY | purchases-by-email m2m | Owner token + Codex |
| FIN.W2 | Supplier LC | Codex |
| M1.OPS | Operator runbook | Codex |
| Live gates | 54-ФЗ, live YooKassa | Owner |
