# Daibilet DB

Local Postgres runs through Docker Compose.

```bash
docker compose up -d postgres
export DATABASE_URL="postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet"
npm --prefix packages/db run db:validate
npm --prefix packages/db run db:migrate
```

The schema intentionally keeps only the MVP contour:

- imported sources and raw records;
- catalog events, sessions, offers;
- categories, subcategories, tags;
- cities, regions, venues;
- SEO landings and content blocks;
- future articles;
- external order/ticket mirrors.

Payments, internal checkout, supplier ledger, documents, support chat, reviews, promo blocks and collections stay out of the first DB contour.
