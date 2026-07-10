# Фаза E — Prisma runtime rollout (staging → prod)

**Дата старта:** 2026-07-10  
**Ветка:** `integrate/mvp-launch`  
**Статус:** 🔄 В работе

---

## Цель

Перевести **public read path** с legacy `dto.js` + raw `pg` на **Prisma Client** (`public-*.dto.ts`) без big-bang: флаги `DAIBILET_TS_*`, parity, затем prod.

**Не в scope этой фазы:** YooKassa, marketplace migrations, admin full CRUD rewrite.

---

## Текущее состояние

| Слой | Legacy (`server.js`) | Prisma typed (`server-entry.ts` + flags) |
|------|----------------------|------------------------------------------|
| Schema / migrations | ✅ Prisma | ✅ Prisma |
| `GET /api/public/events` | `dto.js` | `public-catalog.dto.ts` |
| `GET /api/public/events/:slug` | `dto.js` | `public-event.dto.ts` |
| City / venue pages | `dto.js` | `public-city.dto.ts`, `public-venue.dto.ts` |
| Admin CRUD | `dto.js` raw SQL | TS handlers → still `dto.js` writes |
| Prod runtime | **`server.js`** | flags **off** |
| Staging target | `server.js` | **`start:ts` + flags on** |

---

## Шаги фазы E

### E1 — Parity rules sync ✅
- `catalog-availability.ts` — общие правила saleability (schedule + widget + price)
- Prisma DTO синхронизированы с legacy fix (без TEPLOHOD blanket, active sessions)

### E2 — Staging typed stack
```bash
# /opt/daibilet-staging/.env
DAIBILET_TS_PUBLIC_CATALOG=1
DAIBILET_TS_PUBLIC_EVENT=1
DAIBILET_TS_PUBLIC_CITY=1
DAIBILET_TS_PUBLIC_VENUE=1
DAIBILET_PUBLIC_PREWARM_BEFORE_LISTEN=1
```
- systemd: `start:ts` (см. `deploy/systemd/daibilet-api-staging-ts.service.example`)
- `npm run check:parity`
- `POST_DEPLOY_PUBLIC_BASE=https://staging.daibilet.ru npm run check:post-deploy`

### E3 — Prod flags (по одному, после green staging)
1. `DAIBILET_TS_PUBLIC_CATALOG=1` → smoke 24h  
2. `DAIBILET_TS_PUBLIC_EVENT=1`  
3. City + venue  
4. Переключить prod systemd на `start:ts` (опционально; flags работают и с `server.js` если entry переключён)

### E4 — Phase 3 старт: admin read на Prisma
- `admin-events.dto.ts` — list/read slice
- `admin-orders.dto.ts` — orders list
- Parity scripts по образцу `public-catalog-parity.ts`

### E5 — Отдельная staging DB (до активного admin write migration)
- `pg_dump` prod → restore staging
- `pnpm db:deploy` + smoke

---

## Команды

```bash
npm run backend:typecheck
npm run backend:test:ts
npm run check:parity          # DATABASE_URL + TS flags
npm run check:post-deploy
```

---

## Exit criteria фазы E

- [ ] Staging: все `DAIBILET_TS_PUBLIC_*=1`, parity 4/4 green
- [ ] Staging: `check:widgets` 4/4, post-deploy OK
- [ ] Prod: catalog flag on, parity spot-check
- [ ] Документирован rollback: flags=0 → instant legacy path
- [ ] Phase 3 admin-events read slice в репо

---

## Rollback

```bash
# .env — закомментировать DAIBILET_TS_*
systemctl restart daibilet-api   # или daibilet-api-staging
```
Legacy `dto.js` остаётся fallback пока flags выключены.
