# Project

## City Hub Blog Integration, Phase 1

City hub pages should act as editorial entry points, not only catalog filters. The target composition is:

Hero -> sticky tabs -> About -> Affiche -> Sights -> Practice -> More

The first blog integration keeps canonical article pages at `/blog/[slug]` and renders only lightweight teasers inside `/cities/[slug]`.

Implemented boundaries:

- one article list in the city payload, limited to about 20-24 published indexable articles;
- `pickCityHubArticles(citySlug, cityName, articles)` assigns articles to `about`, `affiche`, `sights`, `practice`, and `more`;
- per-section limits are fixed at 2/1/2/1/1 and one article can appear in one section only;
- city matching prefers explicit `citySlug`, then slug/title/city aliases; broad fallback is allowed only for explicit `multi/region/russia` style markers without a foreign city signal;
- article cards use cover, title, excerpt, fit badges, an excerpt-only accordion, local `#affiche` CTA, and a secondary `/blog/[slug]` link;
- article cards may show up to three already-loaded city sessions using keyword match, then nearest recommended sessions as fallback;
- old anchors `#directions`, `#venues`, `#travel`, `#faq`, and `#seo` stay addressable inside the new parent sections.

Do not render full article HTML on city hubs. Canonical, full text, and Article JSON-LD remain owned by `/blog/[slug]`.
