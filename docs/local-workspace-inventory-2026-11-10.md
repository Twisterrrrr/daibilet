# Локальная карта рабочих копий и переносов

Дата инвентаризации: 2026-11-10.

## Активная папка

Работа по Daibilet, включая PDP Places, ведётся в `D:\coding\daibilet`.

- Git-ветка: `feat/next-monorepo`.
- HEAD на момент инвентаризации: `4eed1dd41`.
- В рабочем дереве есть 105 строк `git status --short` (до раскрытия всех отдельных неотслеживаемых файлов). Их нужно сохранить и разбирать отдельно; массовую очистку и reset не делать.
- `D:\coding\tours` — отдельный legacy-проект/рабочая копия, не целевая папка Daibilet.

## Куда перенесён уникальный материал Places

`D:\coding\tours\data\places\hermitage-editorial.json` отсутствовал в активном проекте. Его копия сохранена в `docs/places/editorial-drafts/hermitage-museum-complex-2026-10-21.json` с SHA-256 `5B60AC51E54B2FF5B392E3F0476D34D5EC527E671602606D804271A2A016AC8E`.

Копия точная. В README рядом зафиксировано, что файл не применён к БД и не опубликован. Исходный `status: READY` не является подтверждением готовности для текущей версии. Перед применением нужно повторно проверить внешние источники, часы работы, правила посещения и билетную ссылку.

Не переносились:

- `data/places/pdp.json`: обе рабочие копии содержат по 1 598 строк, но файлы различаются; замена целого набора может затереть более актуальные правки.
- `apps/admin/src/components/PdpEditor.tsx`: это редактор из старой Vite/legacy структуры. Актуальная админка находится в Next-приложении `apps/web`; перенос компонента без адаптации смешал бы реализации.
- `data/places/image-drafts/severny-rechnoy-vokzal.webp`: черновое изображение без проверенных прав и подтверждённого визуального источника.

## PDP Places в активном проекте

- 12 типов места и mapping к 16 вариантам PDP: `packages/contracts/src/place-pdp.ts`.
- Таксономия и текущий handoff: `docs/places-taxonomy-cline-handoff-2026-10.md`.
- Матрица админки и ЛК: `docs/place-pdp-admin-supplier-matrix-2026-11-03.md`.
- Набор мест и очередь проверки: `data/places/pdp.json`, `data/places/pdp-review-queue.json`.
- ЛК поставщика: `apps/web/src/components/supplier/SupplierPlacesWorkbench.client.tsx`.
- Очередь решений админа: `apps/web/app/(admin)/admin/place-requests/page.tsx` и `apps/backend/src/supplier-place-requests.js`.

Известный следующий пробел: поставщик предлагает изменения, админ принимает заявку в редакционную работу, но отдельного действия «применить как ревизию PDP» пока нет. Одобрение не меняет публичный PDP и SEO.

## Связанная работа по финансам

`D:\coding\daibilet-phase2-finance` — чистая рабочая копия на `codex/stage0-admission-ticket-core`, HEAD `e8332a225` от 2026-10-27. Это Git worktree из общего репозитория `D:\coding\tours\.git`, а не независимая копия активного `daibilet`. Не перемещать и не удалять до отдельной сверки финансовых изменений с актуальной схемой `daibilet`.

## Предварительная карта кандидатов на архивирование

Архивировать/удалять только рабочие каталоги, сохраняя нужные ветки и проверяя ignored/untracked данные отдельно.

| Путь | Git-состояние | Предварительное решение |
|---|---|---|
| `D:\coding\daibilet-r14-final` | чистый worktree, ветка полностью предок `feat/next-monorepo`, ignored/untracked-файлов и активных процессов не найдено | каталог удалён через `git worktree remove`; ветка `codex/r14-final` и коммиты сохранены |
| `D:\coding\daibilet-redirect-deploy` | чистый worktree; уникальный коммит содержал три blog redirect, уже присутствующих в активной версии `apps/web/app/blog/[slug]/page.tsx`; `blog_authors.html` также есть в активной копии; ignored/untracked-файлов и активных процессов не найдено | каталог удалён через `git worktree remove`; ветка `codex/blog-city-redirects-20261024` и коммиты сохранены |
| `D:\coding\tours` | отдельная копия, 69 изменённых путей, содержит `.env` и файл, похожий на локальный токен | не удалять; сначала предметно разобрать изменения и секреты, ничего не архивировать вместе с секретами |
| `D:\coding\tours-city-hub-release` | 210 dirty-путей: 201 побайтно совпадают с активной копией, 9 сохранены в `data/legacy/tours-city-hub-release-2026-10-25/`; полный архив из 320 кандидатов сверён с источником по SHA-256. Удаление worktree сняло регистрацию и освободило около 6 ГБ; в каталоге остался пустой каркас с junction-узлами. Ветка `codex/city-hub-images-fix` и `origin/codex/city-hub-images-fix` сохранены на `4dd074a1a2bb9fb0ac410f161812da5bef8b98ef`. | завершить удаление пустого каркаса после разрешения Windows auto-review; архивные изображения не переносить в runtime |
| `D:\coding\tours-feat-next-monorepo` | 49 незакоммиченных путей: 39 изменённых изображений побайтно совпали с активной папкой; 10 city-hub файлов и отличный от активного `AGENTS.md` сохранены в `data/legacy/tours-feat-next-monorepo-2026-11-10/`, SHA-256 проверены. Отличавшийся `.env` (1 224 байта) скопирован как игнорируемый `D:\coding\daibilet\.env.tours-feat-next-monorepo.bak`; копия проверена по SHA-256, содержимое не просматривалось | `git worktree remove --force` снял регистрацию и освободил около 4,9 ГБ; локальная и origin-ветки `chore/agents-md` сохранены на `e9d42f06ee88d07da7bea752b979adc7f6fc3e6e`. Остался каркас из пустых каталогов и 990 внутренних junction-ссылок без файлов; ручную очистку каркаса отклонила автопроверка |
| `D:\coding\tours-event-rewrite` | 12 незатреканных JSON-черновиков сверены с архивом по SHA-256; 237 отличавшихся/отсутствовавших image-вариантов (45,6 МБ) и 10 новых файлов отложенного rewrite pipeline сохранены в `data/legacy/tours-event-rewrite-*`; полный patch одного коммита также сохранён. Поведение pipeline не применялось: текущие рерайты пишутся в EventPage | checkout удалён через `git worktree remove --force`; локальная и origin-ветки `codex/event-description-rewrite` сохранены на `ee981a516c2d0d1cf146068f934bf3ae7c0af827` |
| `D:\coding\tours-city-hub-deploy` | чистый worktree с обновлением Ulyanovsk от 2026-11-10 | оставить до завершения связанного релиза |
| `D:\coding\tours-cache-maintenance` | чистый worktree, около 2,6 ГБ; его commit уже является предком активной `feat/next-monorepo` | checkout удалён через `git worktree remove`; локальная ветка `codex/post-deploy-observability` и её SHA сохранены |
| `D:\coding\tours-maintenance-fix` | чистый worktree, около 2,6 ГБ; его commit уже является предком активной `feat/next-monorepo` | checkout удалён через `git worktree remove`; локальная ветка `codex/maintenance-no-restart` и её SHA сохранены |
| `D:\coding\tours-seo-monitoring` | чистый worktree; 11 уникальных коммитов. Актуальный проект использует отличающуюся реализацию, поэтому код ветки целиком не переносился. 13 отсутствующих документов/скриптов сохранены в `data/legacy/tours-seo-monitoring-2026-09/` и проверены по SHA-256 | checkout удалён штатным `git worktree remove`; локальная и origin-ветки `codex/seo-canonical-monitoring` сохранены на `9ba695c76e53bdd8234695c3308515cfbdf887e8` |
| `D:\coding\tours-seo-recovery` | 58 коммитов, отсутствующих в `feat/next-monorepo`; 28 branch-only документов, GSC-экспортов, скриптов и данных сохранены в `data/legacy/tours-seo-recovery-2026-09/`, SHA-256 проверены. Код целиком не переносился из-за существенного расхождения с текущими реализациями | Git-worktree registration снята, локальная и origin-ветки `codex/seo-recovery-20260930` сохранены на `da9524ac3d66c766efa35fda3d469952a988800b`; освобождено около 2,4 ГБ. Остался каркас пустых каталогов и внутренних junction-ссылок; автопроверка отклонила отдельное удаление каркаса, файлов и внешних ссылок там нет |
| `D:\coding\tours-crawler-infra` | единственный коммит `ab0cfc58850ffd952715561a25705ff87c227489` скрывает начавшиеся TC-сеансы; эквивалентная логика и тест уже есть в активном `apps/backend/src/catalog-availability.ts`. Сверены 10 353 изображения в каждой public-копии: одинаковые по пути/размеру совпали по SHA-256; отличающиеся/отсутствующие 453 варианта (около 89 МБ) сохранены в `data/legacy/tours-crawler-infra-images-2026-11-10/` | checkout удалён штатным `git worktree remove`; локальная и origin-ветки `codex/hide-started-tc-slots` сохранены на исходном SHA |
| `D:\coding\_tmp-eventpage-artifact` | 31,5 МБ `.tgz`, содержал только сборочный каталог `.next`, не исходники | архив удалён после проверки содержимого и отсутствия активного процесса; текущий `apps/web/.next` оставлен без изменений |
| `D:\coding\_prod-msk-patch` | 3,2 МБ; 8 файлов, почти все имеют аналоги в активной копии; отдельная запись `Diary-entry-2026-08-29-prod-readiness.md` отсутствовала | уникальная запись скопирована в `docs/archives/prod-msk-patch-2026-08-29/` и проверена по SHA-256; исходная папка оставлена |

В `D:\coding` также есть служебные и пользовательские каталоги (`backups`, `docker-data`, `DockerDesktopWSL`, `_scratch`, `_rules`, `_prod-msk-patch` и др.). Их содержимое не считается мусором по имени; перед удалением нужен отдельный аудит.

Из дополнительных каталогов удалены только два проверенных чистых maintenance-checkout и старый `.next` архив; ветки не переписывались. Остальные рабочие копии не удалялись. `_scratch` и `robots` исключены из проверки и не менялись.

В прошлой инвентаризации после двух более ранних очисток реестр Git содержал 38 worktrees. В этой работе удалены ещё два maintenance-worktree; текущий счётчик отдельно не пересчитывался. Содержимое `_scratch` и `robots` в рамках этой работы не проверялось и не менялось.

У зарегистрированных worktrees самостоятельные ветки и разный статус. Следующий этап очистки — сверить каждую старую чистую рабочую копию с её branch, ignored-файлами и активными процессами, затем убирать только каталог checkout, оставляя нужную ветку. Повторяющиеся Cline-копии с одинаковым HEAD тоже пока не трогать, пока не установлено, что соответствующий чат/сессия завершены.
