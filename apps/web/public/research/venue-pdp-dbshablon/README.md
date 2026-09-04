# Venue PDP - exact dbshablon port

Статический слепок Lovable-шаблона из [`Twisterrrrr/dbshablon`](https://github.com/Twisterrrrr/dbshablon) (`src/routes/index.tsx` + токены из `src/styles.css`).

- Брендинг как в исходнике: **Афиша Плюс** (не Дайбилет).
- Ассеты: `assets/` скопированы из `dbshablon/src/assets`.
- Секции как в React: header, breadcrumbs, hero, афиша, о площадке, похожие, footer.
- Дополнение к слайду (наши PDP-блоки, тот же визуальный язык): **карта**, **FAQ**, **отзывы** - между «О площадке» и «Похожие места».

Открыть: `/research/venue-pdp-dbshablon/index.html`

Ранее адаптированный вариант (Дайбилет-брендинг): `/research/venue-pdp-lovable/`.

Работа только в `feat/next-monorepo`. CI run `33856349729` - ветка `codex/stage0-admission-ticket-core`, к этому HTML не относится.
