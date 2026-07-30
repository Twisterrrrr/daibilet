# F5 — Retire dto.js (эпик после PERF.E5 / SEO-хвоста)

**Статус:** 🔄 F5.3a закрыт 2026-07-30 (catalog grouping + city destination helpers); F5.3b (venue pages, server.js) открыт.  
**Дата плана:** 2026-07-30

## Цель

Убрать dual-source `apps/backend/src/dto.js` ↔ `landing-rules.ts` / `public-*.dto.ts`; public/admin read → pure Prisma + TS.

## Карта зависимостей (F5.0)

| Область | Сейчас | Цель |
|---------|--------|------|
| Public catalog list | Prisma SQL + `public-catalog.dto` + `public-catalog.mapper` + `public-catalog-grouping.ts` ✅ | — |
| Landing match | `landing-rules.ts` канон ✅ | — |
| Event page DTO | `public-event.dto.ts` pure Prisma + TS helpers ✅ | — |
| City DTO | Prisma catalog + `public-destination.ts` + `public-city-landings`; venue hub/resolve ещё dto.js (F5.3b) | venue lean Prisma |
| Admin writes | `server.js` | TS routes / F5.3 |
| Sync scripts | TC/TEP → Prisma | без изменения |

## Этапы

| # | Содержание | Exit |
|---|------------|------|
| F5.0 | Эта карта + inventory `import from './dto.js'` | doc ✅ |
| F5.1 | Helpers + catalog datetime/subcategories из TS; event без dto saleable | ✅ `catalog-availability`, `public-datetime`, `public-offers`, `public-catalog.mapper` |
| F5.2 | Landing match single source; aliases в `landing-rules.ts`; dto импортирует rules | ✅ dual-edit снят |
| F5.3a | Catalog grouping + city destination helpers в TS; `public-catalog.dto` / `public-city.dto` без grouping/dto destination imports | ✅ 2026-07-30 |
| F5.3b | Venue pages (`buildPublicVenuePage`), `publicVenueHubRows`, `server.js` admin routes | no prod import dto.js |

## Не делать в F5

- Не включать Phase G money runtime.
- Не шарить finance DB с catalog.
- Не большой rewrite admin UI.

См. [Tasktracker.md](../Tasktracker.md) F5.*, [Project.md](../Project.md) этапы F.
