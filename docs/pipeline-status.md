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

### Открыто 29.09: `deploy-verify.sh` падает на «missing build metadata»

Шаг 16 прогонов 29.09 падает с `FAIL: missing build metadata`. Причина **не в
выкатанном коде**: своп прошёл (`Artifact swap complete → BUILD_ID=nuhrSXN… HEAD=0db363aa`),
публичный смоук прошёл целиком — Googlebot и YandexBot, все разделы HTTP 200.

Скрипт `infra/deploy-verify.sh` читает по SSH три строки и требует ровно три:

```
apps/web/.next/BUILD_ID
git rev-parse HEAD
apps/web/.next/DEPLOY_SHA
[[ ${#INFO[@]} -eq 3 && -n "${INFO[0]}" ]] || { echo 'FAIL: missing build metadata'; exit 1; }
```

Сервер вернул меньше трёх непустых строк. Вход `marker` тут ни при чём — он
опциональный (`required: false`), и пустое значение скрипт обрабатывает корректно.

**Почему это важно.** Это тот самый guard, который должен ловить неудачный деплой.
Сейчас он падает на ровном месте и не различает «выкатилось криво» и «не смог
прочитать метаданные». До разбора не полагаться на зелёный статус прогона как на
доказательство, что на проде нужный SHA.

**Разбор:** почему SSH-чтение возвращает неполный набор — сравнить вывод
`cat apps/web/.next/BUILD_ID; git rev-parse HEAD; cat apps/web/.next/DEPLOY_SHA`
на сервере с ожидаемым. Вероятные причины: путь `/opt/daibilet` не является git-репозиторием
для `git rev-parse`, либо `DEPLOY_SHA` не пишется при свопе.



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

