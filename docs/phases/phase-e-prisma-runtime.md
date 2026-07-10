# Фаза E — Prisma runtime rollout (staging → prod)

**Дата старта:** 2026-07-10  
**Ветка:** `integrate/mvp-launch`  
**Статус:** 🔄 E5 — staging DB split + admin prod flags

**Codex `codex/phase2-foundation`:** отложен до внедрения финконтура (YooKassa) и ЛК поставщика; точечный перенос schema/contracts после стабильного MVP.

---

## Цель

Перевести **public read path** с legacy `dto.js` + raw `pg` на **Prisma Client** (`public-*.dto.ts`) без big-bang: флаги `DAIBILET_TS_*`, parity, затем prod.

**Не в scope этой фазы:** YooKassa, marketplace migrations, admin full CRUD rewrite, merge ветки Codex.

---

## Текущее состояние

| Слой | Legacy (`dto.js`) | Prisma typed (`server-entry.ts` + flags) |
|------|-------------------|------------------------------------------|
| Schema / migrations | ✅ Prisma | ✅ Prisma |
| `GET /api/public/events` | fallback | `public-catalog.dto.ts` |
| `GET /api/public/events/:slug` | fallback | `public-event.dto.ts` |
| City / venue pages | fallback | `public-city.dto.ts`, `public-venue.dto.ts` |
| Admin CRUD | `dto.js` raw SQL | TS handlers → still `dto.js` writes |
| Staging | legacy fallback | **`start:ts` + all public flags** ✅ |
| Prod | legacy fallback | **`start:ts` + all public flags** ✅ |

> Флаги `DAIBILET_TS_*` читаются только в `server-entry.ts` (`start:ts`), не в `server.js`.

---

## Шаги фазы E

### E1 — Parity rules sync ✅
- `catalog-availability.ts` — общие правила saleability (schedule + widget + price)
- Prisma DTO синхронизированы с legacy fix (без TEPLOHOD blanket, active sessions)

### E2 — Staging typed stack ✅
```bash
# /opt/daibilet-staging/.env
DAIBILET_TS_PUBLIC_CATALOG=1
DAIBILET_TS_PUBLIC_EVENT=1
DAIBILET_TS_PUBLIC_CITY=1
DAIBILET_TS_PUBLIC_VENUE=1
DAIBILET_PUBLIC_PREWARM_BEFORE_LISTEN=1
```
- systemd: `start:ts` (см. `deploy/systemd/daibilet-api-staging-ts.service.example`)
- **2026-07-10:** `npm run check:parity` — **4/4 green** (catalog 2542, event, city 41, venue 1024)

### E3 — Prod flags ✅
**2026-07-10:** prod на `start:ts`, все `DAIBILET_TS_PUBLIC_*=1`, parity 4/4 + widgets 4/4.

### E4 — Admin read ✅
- `admin-events.dto.ts`, `admin-orders.dto.ts` + parity scripts
- Staging: `DAIBILET_TS_ADMIN_EVENTS=1`, `DAIBILET_TS_ADMIN_ORDERS=1`

### E5 — Отдельная staging DB 🔄
```bash
# на сервере, из /opt/daibilet-staging
STAGING_POSTGRES_PASSWORD=... bash deploy/scripts/restore-staging-db.sh
systemctl restart daibilet-api-staging
npm run check:parity
```
- Prod DB: `127.0.0.1:5437/daibilet`
- Staging DB: `127.0.0.1:5438/daibilet_staging` (`deploy/docker-compose.staging-db.yml`)
- Скрипт: `deploy/scripts/restore-staging-db.sh`

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

- [x] Staging: все `DAIBILET_TS_PUBLIC_*=1`, parity 4/4 green
- [x] Prod: все public flags on, parity 4/4
- [x] Документирован rollback: flags=0 → instant legacy path
- [x] Admin read slice в репо + parity green
- [ ] Staging на отдельной БД (5438), restore script
- [ ] Prod admin flags on

---

## Rollback

```bash
# .env — закомментировать DAIBILET_TS_*
systemctl restart daibilet-api   # или daibilet-api-staging
```
Legacy `dto.js` остаётся fallback пока flags выключены.
