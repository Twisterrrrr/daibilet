# Daibilet DB

Local Postgres runs through Docker Compose.

```bash
docker compose up -d postgres
export DATABASE_URL="postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet"
npm --prefix packages/db run db:validate
npm --prefix packages/db run db:migrate
npm --prefix packages/db run db:smoke
```

The schema intentionally keeps only the MVP contour:

- imported sources and raw records;
- provider links for source-owned event, session, offer and venue identities;
- catalog events, sessions, offers;
- categories, subcategories, tags;
- cities, regions, venues;
- SEO landings and content blocks;
- future articles;
- external order/ticket mirrors.

Payments, internal checkout, supplier ledger, documents, support chat, reviews, promo blocks and collections stay out of the first DB contour.

## Runtime client

Application code should import the shared Prisma bridge from `packages/db/src/client.ts`.

The bridge creates a Prisma 7 client with `@prisma/adapter-pg` and uses `DATABASE_URL`, falling back to local Docker Postgres:

```ts
import { prisma } from './src/client.ts';

const events = await prisma.event.count();
```

`db:smoke` verifies the client against the live database by reading counts for events, sessions, offers, venues, cities, landings, external orders and tickets.

`ProviderLink` is the additive source identity layer. `EventSourceLink` remains during the migration, but new import/read-model work should prefer `ProviderLink` when it needs to resolve a provider-owned event, session, offer or venue id.
