# Venue PDP HTML prototype (Lovable + Daibilet)

Static research mock for redesign of institution venue PDP.

- Source of visual rhythm: Lovable «Афиша Плюс» mock (category nav, hero split, affiche grid, about+gallery, similar).
- Kept from our live PDP: **карта**, **FAQ**, **отзывы** (+ якоря в section tabs).
- Branding: Дайбилет (не Афиша Плюс). Accent orange for commercial CTAs only.
- `noindex` - research only.

Open: `/research/venue-pdp-lovable/index.html` on local web static / Next public / live MSK.

Next step (product): port blocks into `InstitutionVenueLayout.client.tsx` without dropping Yandex map / curated FAQ / reviews.

**Не трогать** Codex finance-ветки (`codex/stage0-admission-ticket-core`) ради этого UI - работа только в `feat/next-monorepo`. CI run `33856349729` упал на Codex (`blocks finance period close…`) - к venue HTML не относится.
