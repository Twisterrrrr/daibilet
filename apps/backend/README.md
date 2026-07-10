# Backend

TypeScript API Дайбилета. Основная точка входа - `src/server-entry.ts`; `src/server.js` временно сохраняется как legacy-слой на время поэтапного переноса обработчиков.

```bash
pnpm dev:backend
pnpm backend:typecheck
pnpm backend:test:ts
```

Production build и запуск:

```bash
pnpm --filter @daibilet/backend build
pnpm --filter @daibilet/backend start
```

Production использует `dist/server-entry.js`; `tsx` нужен только для разработки и тестов.

Typed public read routes включаются флагами:

```bash
DAIBILET_TS_PUBLIC_HOME=1
DAIBILET_TS_PUBLIC_CATALOG=1
DAIBILET_TS_PUBLIC_EVENT=1
DAIBILET_TS_PUBLIC_CITY=1
DAIBILET_TS_PUBLIC_VENUE=1
```

`DAIBILET_TS_PUBLIC_HOME=1` переводит `/api/public/stats`, `/api/public/home` и `/api/public/home/preview` на Prisma/TS read-model. Счетчик событий в stats должен совпадать с `total` в `/api/public/events`.

Правила границ:

- Prisma импортируется из `@daibilet/db`;
- DTO и request validation импортируются из `@daibilet/contracts`;
- provider-specific логика не должна попадать в public DTO напрямую;
- новый HTTP-код пишется на TypeScript.
