# Codex MVP vs SPBBOATS: architecture decision

Дата: 2026-06-24.

## Короткий ответ

Я взял Vite/JS не потому, что это лучше Next.js для Дайбилета. Это было решение для быстрого локального MVP: проверить импорт TC/Teplohod, схему каталога, группировку слотов, админские процессы, виджеты покупки и деплой без того, чтобы снова утонуть в тяжелом legacy.

Для долгосрочного public с SEO-ставкой Next.js/SSR сильнее. Это уже зафиксировано в `docs/seo-public-mvp.md`: текущий Vite public годится как прототип интерфейса и быстрый sales-pilot, но SEO-страницы лучше переносить в Next до индексации и масштабного органического трафика.

## Почему старт был на Vite/JS

1. Не было репозитория и нужно было быстро собрать рабочий контур локально.
2. Главный риск на старте был не SSR, а доменная логика: импорт, категории, города, площадки, слоты как расписание, external orders, source health.
3. Виджетная покупка позволяла отложить checkout, YooKassa, supplier finance и документы.
4. Vite static проще поднять на Timeweb: nginx отдает `dist`, backend живет отдельным systemd-сервисом.
5. JS backend был быстрым способом проверить DTO/API без каркаса Nest/Fastify.

Это сознательный prototype-first ход. Минус такого хода тоже понятен: если продолжать расти на этом коде как на основной production-платформе, появятся больные точки.

## Где Codex-версия сильна

- Четкие границы MVP: нет платежей, возвратов, PDF/QR, корзины, supplier finance.
- Хороший операционный контур: Source Health, readiness codes, ExternalOrder как зеркало, ручные override, pin/exclude/review для лендингов.
- Быстрые UX-проверки: admin, catalog filters, public grouping, performance/landing snapshots.
- Деплой проще тяжелого SPBBOATS: systemd + nginx + git-pull script.

## Где SPBBOATS сильнее

- Next.js public и SSR/SEO.
- Более зрелый backend: сервисы, sync-пайплайны, richer domain model.
- TC sync/retag/materializer сильнее текущего скриптового sync.
- Admin V4 богаче по структуре лендингов, SEO, diagnostics.
- Есть контуры для supplier, finance, checkout и будущего маркетплейса.

## Что не надо переносить из Codex в SPBBOATS

- Монолитный `apps/backend/src/dto.js`.
- `scripts/tc-full-sync.js` как основной TC sync.
- Vite CSR public как SEO-основу.
- Basic auth как финальную модель доступа.
- Жесткие `LANDING_RULES` как единственный источник истины.

## Что стоит cherry-pick из Codex

### P0: процесс и QA

- `docs/mentor-review.md` как формат коротких вердиктов перед релизом.
- `docs/launch-qa-and-deploy.md` как smoke-чеклист.
- `scripts/landing-snapshot.mjs` идея: snapshot выдачи лендингов после sync.
- `scripts/public-performance-snapshot.mjs` идея: cold/warm budgets.

### P1: лендинги

- Ручная курация событий на лендинге: `PINNED`, `EXCLUDED`, `REVIEW`.
- `matchReasons` и `matchBlockers` в admin.
- Метрики `Effective / Auto / Pinned / Excluded / Review`.
- Pin/exclude должен действовать на всю группу слотов одного события.

### P2: точность auto-match

- `excludeKeywords`, `requiredAnyKeywords`, `keywordScope`.
- Сравнение snapshot до/после retag.
- Ручной review для спорных событий вместо молчаливого попадания в SEO-лендинг.

## Рекомендуемая стратегия

Если цель - первые продажи на следующей неделе:

1. Не переписывать все обратно в SPBBOATS до запуска.
2. Довести легкий контур до staging/prod smoke.
3. Проверить реальные виджеты TC/Teplohod и ExternalOrder.
4. Не давать поисковикам массово индексировать слабые CSR SEO-страницы как финальную структуру.

Если цель - долгосрочная SEO-платформа:

1. Public переносить на Next.js/SSR.
2. SPBBOATS использовать как основную production-базу или как источник public шаблонов.
3. Из Codex переносить не стек, а операционные находки: source health, readiness, landing curation, snapshots, mentor-review.

## Итоговое решение

Codex-версия остается launch-prototype и sales-pilot контуром. Она не должна притворяться полной заменой SPBBOATS.

Для production vision Дайбилета правильная траектория такая:

- коротко: запустить продажи через widget-only на легком контуре;
- средне: перенести public SEO в Next.js или cherry-pick операционные блоки Codex в SPBBOATS;
- долго: возвращаться к supplier/finance/checkout только после подтверждения продаж и спроса.

