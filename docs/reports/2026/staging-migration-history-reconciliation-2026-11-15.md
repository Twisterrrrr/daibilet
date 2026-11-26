# Staging migration history reconciliation (2026-11-15)

The isolated staging database had two migrations recorded as applied that were
missing from this branch's migration directory:

- `20261110180000_venue_public_slug`
- `20261111130000_pdp_document_revisions`

Their SQL files are restored from the original commits (`e5fc78e2f` and
`890d412c9`). SHA-256 checksums match the values in staging's
`_prisma_migrations` table, so these files document already-applied changes;
they are not applied again by `prisma migrate deploy`.

The staging database also had these pending migrations at inspection time:

- `20261113120000_my_day_routes_and_plans`
- `20261115100000_destination_pdp_documents`

Before applying pending migrations, take and verify a staging database dump.
This note records the observed staging drift; it does not authorize applying
these migrations to production.
