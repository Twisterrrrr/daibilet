# Diary

## 2026-07-22

Built an alternative phase 1 approach for blog-aware city hubs.

The important product decision is to make articles support the city page without pulling the user away too early. Each teaser keeps two actions: first scroll back to the local affiche, then optionally open the full material. This keeps `/cities/[slug]` as the working page for purchase intent while still adding editorial depth.

The matching layer intentionally does not trust `citySlug` alone. It uses explicit city matches first, then aliases in slug/title, and admits broad `multi/region` articles only when they carry that marker and do not look tied to another known city.

The implementation stays light: no full article HTML, no new client dependency, no extra API call for mini event rows.
