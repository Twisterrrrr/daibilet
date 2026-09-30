# Deploy MSK web

Deploy now requires a full 40-character `sha` and `expected_ref`. CI checks
branch ancestry before build, checks out that SHA, and records DEPLOY_SHA and
BUILD_ID in the run name/logs/summary (GitHub's own head_sha still identifies
the workflow revision). The build runs once in CI. The uploaded server script
checks artifact SHA and BUILD_ID before switching the checkout or .next.
Public home must return HTTP 200; home failure restores the previous build
and checkout when a previous build exists. A missing optional literal HTML
marker fails verification without automatic rollback.

Step 4 (Cursor): done — workflow step `Verify deploy` calls
`bash .deploy-control/infra/deploy-verify.sh "$DEPLOY_SHA" "$DEPLOY_MARKER"` with
`DEPLOY_MARKER` from `inputs.marker` via step env (no shell interpolation of the
input), plus `MSK_SSH_HOST` / `MSK_SSH_USER` / `MSK_SSH_KEY_FILE`. Skipped when
`inputs.skip_swap` is true. `BUILD_ID` from the job env enables exact build
comparison.

Use full SHA `13916c0f1ac4ce16a6c9fd0523a5734397140802` for the referenced
Wave 1 revision. Short examples are intentionally rejected. Forty zeroes
are valid hex syntax but rejected as a nonexistent commit.
## Приоритеты на 30.09 — единый список

Единственный источник правды по порядку работ. Ниже — журнал наблюдений, он не
определяет приоритеты.

| # | Пункт | Статус |
|---|---|---|
| 1 | Ревью `fc8a20407` (sitemap lastmod) | час работы, вернуть в ближайший деплой |
| 2 | Транслитерация слага → редирект | **НЕ ДЕФЕКТ — см. ниже, не начинать** |
| 3 | 19 228 `READY`-мёртвых → 410 для `SINGLE` | `SINGLE` 9 203, `RECURRING` 19 735 разбирать отдельно |
| 4 | Канон площадок — указывает на редирект | подтверждено 4 из 4 |
| 5 | Канон событий — отсутствует | подтверждено, отдельный дефект |
| 6 | 190 битых URL | узкое, разбирать точечно |
| 7 | `isVenuePublic` — один источник правды | list / sitemap / detail должны решать одинаково |
| 8 | Синк TC — 134 события | пустые описания |
| 9 | Слаги с датой | канонический слаг без даты |

**Пункты 4 и 5 — разные дефекты, не смешивать.** Площадки отдают неверный канон;
события не выводят канон вовсе. Правятся в разных файлах, ведутся параллельно.

### Пункт 2 закрыт: редирект транслитерации уже работает

Проверено на живом событии 30.09:

```
/events/02-10-химера-illidiance-концерт-в-москве-6a9763…   → 308
  location: /events/02-10-himera-illidiance-koncert-v-moskve-6a9763…
/events/02-10-himera-illidiance-koncert-v-moskve-6a9763…  → 200
```

База хранит кириллицу, сайт штатно отдаёт 308 на латинскую форму, и **латинская
форма — обслуживаемая каноническая, отдаёт 200**. Строить здесь нечего.

404 у событий из топа GSC объясняются не написанием слага, а тем, что эти события
`HIDDEN` / `isIndexable = false` — их последний сеанс прошёл, и сайт корректно
отдаёт 404. **Причина потери трафика — пункт 3, не пункт 2.**

Ошибочный вывод «Google индексирует латиницу, база ждёт кириллицу» возник из-за
собственной ошибки в разборе: URL были обрезаны до 60 символов, после чего слага
«не нашлись в базе». На полных слагах события находятся, и цепочка редиректов
работает.

### Что подтверждено по канонам

```
/venues/klub-alekseya-kozlova          → 200, canonical → хешированный URL
/venues/…-590854a3515e350016705a52     → 308 → обратно на чистый
```

Канон указывает на редирект. Правило: **canonical обязан указывать на URL,
отдающий 200, и он же должен быть целью редиректов.**

События: `<link rel="canonical">` отсутствует полностью, при 21 163 мёртвых.
Google выбирает главный адрес сам — отсюда 228 кликов GSC на URL, которые он
выбрал, а не которые мы назначили.



## Local validation (2026-09-25)

- Bash syntax and YAML parse: passed.
- Actual repository ancestry: full 57d899ae… rejected; full 13916c0f… accepted.
- Short SHA rejected before server access; all-zero SHA is nonexistent.
- Mock server with real tar/move operations: wrong BUILD_ID and artifact SHA
  fail without changing the checkout, live build, or services; successful swap
  passes; HTTP 500 restores old build and checkout; missing marker fails while
  retaining the new build, as requested.
- Mock SSH/HTTP verification: matching SHA/build/literal marker passes;
  wrong HEAD, wrong BUILD_ID, HTTP 500 and missing marker fail.
- Production workflow dispatch and live Wave 1 acceptance were not run.
- Step 4 integrated on `feat/next-monorepo` @ `8052d742` (CI green:
  https://github.com/Twisterrrrr/daibilet/actions/runs/36167511215).
- **STOP before Wave 1 deploy:** no baseline commit in branch
  (`git log --grep=baseline` empty; `docs/drafts/pdp-wave1-baseline-urls.md`
  untracked, no Metrika numbers). Await owner baseline commit, then:
  `gh workflow run deploy-msk-web.yml -f sha=13916c0f1ac4ce16a6c9fd0523a5734397140802 -f expected_ref=feat/next-monorepo`
  (marker optional — `deploy-verify.sh` greps home HTML; venue-only
  `data-venue-cta-kind` would false-fail without auto-rollback).

---

## 2026-09-29 — SEO-аудит, ветки и зоны

### `deepseek/sitemap-lastmod` — ждёт ревью Codex, не мержить

Ветка содержит смешанный по зонам коммит:

| Файл | Зона | Статус |
|------|------|--------|
| `apps/web/src/lib/sitemap-data.ts` | Cline | готово |
| `apps/web/src/lib/sitemap-lastmod.test.ts` | Cline | готово |
| `apps/backend/src/public-event-freshness.ts` | **Codex** | **ждёт ревью 30.09** |
| `apps/backend/src/public-read.ts` | **Codex** | **ждёт ревью 30.09** |

Backend-часть сделана до 29.09, когда зона была общей. По текущему протоколу
`apps/backend` не зона Cline. Работа закончена и проверена (982 теста, 8 новых
зелёные; backend typecheck 0; web typecheck 192 — базовый уровень), поэтому
не откатывалась: `sitemap-data.ts` импортирует `buildPublicEventFreshnessMap`,
и без него не собирается.

**Не мержить в `feat/next-monorepo` до ревью Codex 30.09.**

Зависимость: ветка построена поверх `fix/seo-audit-titles-sitemap` — функция
`entry()` с параметром `lastModified` и `resolveSitemapLastModified` оттуда.

Последний подтверждённый полный прогон сборки (`BUILD=OK`) был **до** этого
коммита. Сборку перезапустить и получить зелёный результат — обязательное
условие перед любым merge.

### Причина и починка `deploy-verify.sh` (закрыто 29.09)

Дело **не** в отсутствии метаданных — все три значения на сервере верные:

```
apps/web/.next/BUILD_ID     nuhrSXN_O6Q7GUs1us9lM   (21 байт, БЕЗ перевода строки)
git rev-parse HEAD          0db363aa03ee560ded8009a096d6f18ac577a326
apps/web/.next/DEPLOY_SHA   0db363aa03ee560ded8009a096d6f18ac577a326   (41 байт, с переводом)
```

**Next.js пишет `BUILD_ID` без завершающего перевода строки.** Скрипт склеивал выводы
подряд, и `BUILD_ID` с `git rev-parse HEAD` слипались в одну строку — `mapfile`
давал 2 элемента вместо 3, и проверка `[[ ${#INFO[@]} -eq 3 ]]` падала.

Воспроизведено на сервере: без фикса первая строка выглядит как
`nuhrSXN_O6Q7GUs1us9lM0db363aa03ee560ded8009a096d6f18ac577a326`, с фиксом — три
отдельные строки.

Правка: `cat apps/web/.next/BUILD_ID; echo;` — явный перевод строки после чтения
BUILD_ID. Синтаксис проверен, разбор даёт 3 элемента.

Guard не сломан был — он был слеп к формату входа. Но опасен именно тем, что
маскировал реальные метаданные под «опять не прочиталось».

### Ответ про 404: регрессии нет, механизм найден (29.09)

Проверено на проде. **404 были до деплоя** — это не регрессия Wave 1.

События из топа GSC существуют в базе, но с **кириллическими слагами**, тогда как
Google проиндексировал **транслитерированные**:

| В индексе Google | В базе | status |
|---|---|---|
| `tc-6a442d9564111c7fb5266957-andergraund-saund-klab-…` | `tc-6a442d9564111c7fb5266957-андерграунд-саунд-клаб-…` | `HIDDEN` |
| `tc-6a3cf57a385892e5a1ed2530-vecherinka-v-chest-vyhoda-…` | `tc-6a3cf57a385892e5a1ed2530-вечеринка-в-честь-выхода-…` | `HIDDEN` |
| `shou-kaskaderov-v-g-cherepovec-6a5117b2eaee351b9d359d08` | `шоу-каскадеров-в-г-череповец-6a5117b2eaee351b9d359d08` | `HIDDEN` |

Хеш в обоих случаях совпадает — это один и тот же URL, просто в разном написании.
**Механизм потери трафика:** страница была жива и индексируема, Google взял
транслитерацию, затем событие скрыли (`isIndexable = false`, `status = HIDDEN`) —
и адрес в индексе стал отдавать 404. Топ-1 страница GSC — 159 кликов, 32 % CTR.

**Состояние базы на 29.09:**

| Метрика | Значение |
|---|---|
| Всего событий | 95 973 |
| `RECURRING` / `SINGLE` / `OPEN_DATE` | 86 761 / 9 203 / 9 |
| `READY` / `HIDDEN` / `REVIEW` | 52 038 / 39 350 / 4 585 |
| Мёртвые: есть сессии, нет будущих | **21 163** |
| … из них `RECURRING` / `SINGLE` | 19 735 / 1 428 |
| **`isIndexable` + `READY`, но без будущих сессий** | **19 228** |

Последняя строка — настоящая проблема: почти 19 тысяч событий продолжают быть
индексируемыми и `READY`, хотя последний сеанс прошёл. Именно они держат в индексе
страницы, которые поисковик обновляет вхолостую.

**Выводы для Codex:** транслитерация слага → нужен детерминированный редирект
латиница→кириллица; 19 228 живых-по-статусу-но-мёртвых → 410 для `SINGLE`,
разбор рассинхрона для `RECURRING`.


### Найдено 29.09 на проде: канон площадок указывает на редирект

**Новое, в списке приоритетов Codex не было.** Проверено на 4 из 4 выборке
живых площадок.

```
https://daibilet.ru/venues/klub-alekseya-kozlova                      → 200
  rel=canonical → .../venues/klub-alekseya-kozlova-590854a3515e350016705a52
https://daibilet.ru/venues/klub-alekseya-kozlova-590854a3515e350016705a52 → 308
  location      → /venues/klub-alekseya-kozlova
```

Страница отдаётся по чистому слагу, её `rel=canonical` указывает на хешированный
вариант, а хешированный вариант **308-редиректит обратно** на чистый. Канон
указывает на редирект — Google такие страницы не индексирует, они выпадают из
выдачи целиком.

Похоже на тот же механизм, что даёт −85% показов в GSC, и на то, почему в индексе
сидят `tc-`-адреса: канон сам диктует Google нечеловеческий URL.

Тот же дефект: `gamma-more`, `art-prostranstvo-lyumer-holl-g-moskva`,
`kozlov-club-unplugged`.

### Найдено 29.09 на проде: у событий нет rel=canonical вовсе

```
/events/zooteatr-koshek-g-petropavlovsk-kamchatski   → 200, тега <link rel="canonical"> нет
/                                                   → 200, canonical есть
```

На страницах событий канонический URL не выводится совсем, тогда как на главной и
на площадках (пусть и неверный) — выводится. Без канона Google склеивает
дубли по своему усмотрению.

Оба дефекта — в той же зоне, что Wave 1 (venue-PDP и события), и оба **не закрыты**
текущим списком Codex. Требуется решение: канон должен указывать на URL, который
отдаёт 200, и он же должен быть целью редиректов.

### Гейт 29.09: 231, а не 994

`pnpm web:test:ci` гоняет **только** веб-пакет — 231 тест. Число 994 из ранних
заметок было суммой по всем пакетам монорепо, а не результатом этой команды.
Корневой `test`-скрипта в `package.json` нет.

Фактический гейт 29.09:

| Проверка | Результат |
|---|---|
| `backend:typecheck` | 0 ошибок |
| `web:test:ci` | 231 / 231 |
| `backend:test:ts` | 219 / 219 |
| `web:build` | 202 статические страницы |


### Выкачено 29.09: Wave 1 на прод

| | |
|---|---|
| SHA | `0db363aa03ee560ded8009a096d6f18ac577a326` |
| Ветка | `feat/next-monorepo` (46 коммитов над `e4e772c3f`) |
| BUILD_ID | `nuhrSXN_O6Q7GUs1us9lM` |
| Прогон | [36635363426](https://github.com/Twisterrrrr/daibilet/actions/runs/36635363426) |
| Итог | своп выполнен, смоук пройден, **шаг Verify упал** |

**Wave 1 на проде подтверждено независимо:** тайтлы живых событий идут без даты,
например «Зоотеатр кошек г. Петропавловск-Камчатский (…): билеты и расписание |
Дайбилет» — вместо прежнего варианта с датой сеанса. Это коммит
`6cc6476d3 fix(seo): drop the session date from event page titles`.

### ЗАКРЫТО 29.09: `deploy-verify.sh` — причина найдена и починена

Шаг 16 падал с `FAIL: missing build metadata` при полностью успешном свопе.
Разбор и правка — в секции «Причина и починка `deploy-verify.sh`» выше.
Гипотеза «`/opt/daibilet` не git-репозиторий» **не подтвердилась**: репозиторий на
месте, HEAD корректный. Настоящая причина — `BUILD_ID` пишется Next.js без
перевода строки.



### Открыто 29.09, вечер: два клона одного репозитория

**Риск потери коммитов. Не срочно, но закрыть до следующего параллельного проекта.**

После переноса на новый компьютер в `D:\coding\` лежат **два независимых клона**
одного и того же `Twisterrrrr/daibilet.git`:

| Путь | Тип | Ветка |
|---|---|---|
| `D:\coding\daibilet` | самостоятельный клон | `docs/gsc-analysis-404-root-cause` |
| `D:\coding\tours` | самостоятельный клон | `codex/city-hub-editorial-alt` |

Восемь worktree'ов зарегистрированы на `tours`:
`tours-feat-next-monorepo`, `tours-seo-monitoring`, `tours-event-rewrite`,
`tours-crawler-infra`, `daibilet-phase2-finance`, плюс два в
`tours/.task-tmp/` (`seo-ssr-fix`, `tep-editorial-prod`).

**Почему это опасно:** коммиты, сделанные в `daibilet`, не видны в `tours`, и
наоборот. `git worktree list` из `daibilet` показывает только сам `daibilet` —
про остальные девять копий он не знает. Незакоммиченное в чужом worktree при merge
теряется молча.

Проверено 29.09: во всех девяти рабочих копиях дерево чистое.

**Решение:** выбрать один клон основным (кандидат — `tours`, где живут worktree'и),
`daibilet` перевести в его worktree либо заархивировать после проверки, что всё
запушено.

Отдельно: `D:\coding\daibilet-push` — осиротевший worktree на диске `F:`, диска
нет, git в нём не работает. Хранит только файлы. Удалить.

`D:\coding\SPBBOATS` — другой репозиторий (`Twisterrrrr/daibilet_tickets`),
legacy-донор контрактов. К основному проекту не относится.

### Открыто 29.09: `middleware-manifest.json` пуст при Next 16

Известное ограничение сборки в режиме `--webpack` на Next 16: манифест пустой,
хотя `.next/server/middleware.js` produced. Проверено — **читателей в проекте
нет** (`grep` по `deploy/`, `scripts/`, `apps/web/scripts/`, `.github/` даёт
0 совпадений), самодеплой за nginx, поэтому последствий нет.

**Если появится Vercel-деплой, всплывёт** — проверить первым делом.


### Прозрачность: правила записаны 29.09, нарушения были раньше

- `fix/seo-audit-titles-sitemap` содержит **5 смешанных коммитов** (title,
  description, lastmod, noindex, 301). На тот момент правила «один коммит =
  одна задача» ещё не существовало.
- Сообщение коммита `4c97b033e` было переписано через `git commit --amend`,
  затем запушено с `--force-with-lease`. Переписано потому, что исходное
  сообщение содержало ложное обоснование (см. ниже). По текущим правилам так
  нельзя.
- **Ложное обоснование, исправленное в b344d1bfc:** коммит утверждал, что
  закрывает `/venues/base`. На деле это BASE — концертный зал в «Гигант
  Конти» (Кондратьевский пр. 44), ~2850 отзывов в Google. Первое чтение API
  вернуло `type: meeting_point`, и я назвал запись мусорной по имени, не
  сверив карточку. Полный скан 1391 строки `venues.xml` дал **0 записей,
  которые правило снимает с индексации** — на момент коммита оно было no-op.

Коммиты остаются как есть, для истории. Новые правила применяются с 29.09.

