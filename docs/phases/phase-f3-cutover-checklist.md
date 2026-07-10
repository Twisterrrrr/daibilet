# F3 — Cutover public на Next.js

**Предусловие:** F2 exit ✅ (SSR каталог, event/city/venue, landings ISR, parity scripts).

---

## Staging

1. **Deploy** `apps/web` на staging (`pnpm web:build`, `deploy/scripts/start-web.sh`).
2. **nginx** — public routes на Next `:3000`, legacy API `:4000` для sync/admin.
3. **Env:** `DATABASE_URL`, `NEXT_PUBLIC_TC_WIDGET_TOKEN`, `NEXT_PUBLIC_TEP_WIDGET_ID`.
4. **Smoke:**
   - `pnpm backend:next:parity` (DTO + optional `WEB_BASE_URL`/`LEGACY_BASE_URL`)
   - `pnpm launch:staging-smoke` / `pnpm check:post-deploy`
   - View Source: `/events`, `/events/[slug]`, `/rechnye-progulki/moscow/`, `/podborki`
   - Widget click: TC + Teplohod на event page
5. **301:** `/landings/*` → canonical landing URLs (middleware).

---

## Prod cutover

1. Snapshot prod nginx + rollback plan (Vite `apps/public` на прежнем порту).
2. Переключить public routes на Next; оставить legacy backend для writes/sync.
3. `pnpm check:parity` + post-deploy checks.
4. Мониторинг 24–48ч: 404, widget errors, crawl errors.

---

## Deprecate

- Archive `apps/public` (Vite) после стабильного cutover.
- Документировать в `docs/decision-log.md`.

---

## Не входит в F3

- Admin Next (`F4`)
- Retire `dto.js` (`F5`)
- Codex Phase 2 finance runtime
