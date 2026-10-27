# Twin: Новодевичий монастырь — 2026-09-25

**Статус:** задокументировано. **Apply (HIDDEN + 301) — не делать** до Codex (≥2026-09-28).  
Возможен family-flip / kind-review; зона kind/family/mapping заморожена до 1391/1391.

## Канон (SEO)

| Поле | Значение |
|------|----------|
| id | `ven_ms_95a0c6095c73ebf5` |
| slug | `moscow-novodevichiy-monastyr` |
| kind | **TEMPLE** |
| pageStatus | PUBLISHED |
| canonicalPath | `/locations/moscow-novodevichiy-monastyr` |
| Family | location (TEMPLE → `/locations`) |

## Три «лишних» записи

| id | slug (db) | kind | pageStatus | canonicalPath | Роль |
|----|-----------|------|------------|---------------|------|
| `venue_62931a512b3d98181e4f888c` | `новодевичии-монастырь-…` | MUSEUM_ART_SPACE | PUBLISHED | `/venues/новодевичии-монастырь-…` | **в broken set** — museum twin в sitemap |
| `venue_6407178af4d48cfebd200f18` | `novodevichii-monastyr-…` | SPORT_ACTIVITY_SPACE | NONE | `/locations/novodevichii-monastyr-…` | meeting/sport twin (list NONE) |
| `venue_5c20f59092b29e000c6282a3` | cemetery / кладбище | MEETING_POINT | CANDIDATE | null | кладбище / точка сбора — не монастырь |

## Live-симптом

- Sitemap URL `/venues/novodevichii-monastyr` → **308** `/locations/novodevichii-monastyr`.
- Detail по публичному slug может попасть в sport/meeting twin, не в TEMPLE-канон.

## План apply (Codex, не Cursor)

1. Канон = TEMPLE `moscow-novodevichiy-monastyr`.
2. Три лишних → `HIDDEN` + **301** на канон (отдельный коммит класса twin-hide, не смешивать с Group A/B).
3. Sitemap только канон.
4. Не flip'ать TEMPLE → museum без owner + 301 (см. «Family один раз» в `catalog-location-venue-canon.md`).

Источник SQL: `docs/drafts/broken-venues-sql-2026-09-25.md` §6–7.
