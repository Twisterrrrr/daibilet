# Venue PDP - точная копия dbshablon

Исходник: [`Twisterrrrr/dbshablon`](https://github.com/Twisterrrrr/dbshablon) (`src/routes/index.tsx` + токены `src/styles.css`).
Live Lovable: https://dbshablon.lovable.app

## Файлы

| Файл | Что внутри |
|------|------------|
| [`exact.html`](./exact.html) | **Точная копия слайда** - те же секции, сетки, копирайт, ассеты. Tailwind CDN + те же utility-классы, что в React. Без карты / FAQ / отзывов. |
| [`with-extras.html`](./with-extras.html) | Та же копия + наши блоки: **карта**, **FAQ**, **отзывы** (между «О площадке» и «Похожие места»). |
| [`index.html`](./index.html) | Старый ручной CSS-порт (legacy). Для ревью используй `exact.html`. |
| `assets/` | JPG из `dbshablon/src/assets`. |

## Открыть локально

После `pnpm --filter @daibilet/web dev` (или любой static serve из `apps/web/public`):

- `/research/venue-pdp-dbshablon/exact.html`
- `/research/venue-pdp-dbshablon/with-extras.html`

На live после web-deploy: `https://daibilet.ru/research/venue-pdp-dbshablon/exact.html`

## Ветка

Только `feat/next-monorepo`. К CI на `codex/*` этот research не относится.
