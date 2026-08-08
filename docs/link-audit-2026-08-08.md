# Link audit - daibilet.ru (2026-08-08)

Owner trigger: «проверяй все линки по сайту». Samara hub 404 уже закрыт параллельным инцидентом INC.CITY404 (агент 422ce079) - здесь полный site health, без дублирования seed Samara.

## Scope

- Seed pages: home, `/cities`, major hubs (moscow/moskva, sankt-peterburg, samara, kazan, ekaterinburg, nizhny/nizhniy-novgorod, Pack C: ufa, rostov*, novosibirsk, sochi, kaliningrad, krasnoyarsk, yaroslavl), `/venues`, `/locations`, `/events`, `/blog`, Samara article URL, account/purchases, static company pages.
- Extracted internal hrefs from seeds; checked **485** URLs via GET (after HEAD-only noise discarded).
- Plus targeted probes for missing-entity behavior and footer/nav.

## Counts

| Metric | Value |
|--------|------:|
| Unique hrefs extracted from seeds | 985 |
| HTTP-checked (priority + capped venue/location/event samples) | **485** |
| OK (2xx/3xx) in capped run | 427 |
| Bad in capped run | 58 |
| Of which true permanent breaks after slow retry | see below |

**Note:** массовые 500/502 в первом прогоне по `/venues/*` и `/locations/*` при нагрузке - частично false-positive (upstream/nginx при параллельном crawl). Медленный retry показал: живые venue DTO → 200; **отсутствующие** venue/city → стабильный **HTTP 500** (баг, не «нет данных»).

## Top 404 / error patterns

### 1. Systemic (FIXED in this iteration) - missing city/venue/event → API `200 null` → page **500**

- `GET /api/public/cities|venues|events/{missing}` отвечал **200** с телом `null` (вместо 404).
- Web `generateMetadata` + `unstable_cache` miss-throw → необработанный error → **HTTP 500** вместо 404.
- Smoke до фикса: `/venues/bastion-holl`, `/venues/definitely-missing-venue-xyz-999`, `/cities/no-city-here` → **500**.
- Хабы (напр. Калининград) ссылаются на slug вроде `bastion-holl` без DTO → пользователь ловит 500 с карточки хаба.

**Fix:** handlers → 404 `{error:not_found}`; web cache catch → always soft-null on miss/wrap (v5 keys); `fetchPublicApiJson` трактует JSON `null` как miss; footer SPB rooftops; city/venue metadata try/catch.

### 2. Soft / STALE city hub 404 (already mitigated, INC.CITY404)

- `/cities/samara` (и кратковременно moskva/sankt-peterburg) отдавали nginx/Next **STALE 404** при живом API.
- Сейчас live: samara / Pack C hubs / moskva / sankt-peterburg → **200**.
- Не дублировали seed Samara.

### 3. Content / schedule (not republished)

| URL | Classification | Action |
|-----|----------------|--------|
| `/blog/samara-vykhodnye-dva-dnya-bez-gonki` | Owner HIDDEN (`0fd1dd06`); API `cmsStatus:hidden`, `article:null` | **Не публиковать** (constraint) |
| `/blog/rostov-vecher-pyat-sposobov` | `publishedAt` 2026-08-17 (future); API published + `article:null` | Ждать schedule / upsert по очереди |
| `/blog/novosibirsk-vykhodnye-chto-posmotret` | `publishedAt` 2026-08-18 (future) | То же |
| `/checkout` | Нет public route на web (finance/pay host) | OK / expected 404 на daibilet.ru |

### 4. Footer content bug (FIXED)

- «Популярные направления» / СПб: «Смотровые площадки» вели на `/progulki-po-krysham/moscow/` (тест уже ждал saint-petersburg).
- Исправлено на `landingCategoryHref('rooftops', 'saint-petersburg')`.

### 5. Load / infra noise (remaining)

- Под нагрузкой часть venue/location/event GET → 502/500 transient; retry → 200 если DTO есть.
- Нужен отдельный capacity/timeout pass (не link-slug).

## Fixed this iteration

1. Backend: city / venue / event public detail → **404** on miss (не `200 null`).
2. Web: устойчивый miss → `null` → `notFound()` (не 500) для city/venue cache + metadata.
3. Footer: SPB rooftops → `/progulki-po-krysham/saint-petersburg/`.
4. Report: этот файл.

## Samara status

- Hub `https://daibilet.ru/cities/samara` → **200** (INC.CITY404 + warm).
- Article URL → **404** by design (HIDDEN owner). NOTE в MD на `/cities/samara/` корректен для будущей публикации.
- Не трогали unpublished companions.

## Remaining backlog (owner / data / ops)

| Item | Priority | Needs |
|------|----------|-------|
| Dead hub venue cards (напр. `bastion-holl` в афише Калининграда) без DTO | Высокий | data cleanup / hide unlinkable venues in hub cards |
| Transient 502 under crawl load on venues/locations | Средний | MSK capacity / upstream timeouts |
| Future-dated Pack C articles (rostov 17.08, novosibirsk 18.08) | Низкий | schedule; не форс-publish |
| Samara article HIDDEN | Owner | решение owner, не агент |
| Event DTO cache still can store null if API regresses | Средний | optional EventDtoMissError like city/venue |
| Blog listing SSR href extraction empty in audit (cards may be client) | Низкий | sample known published slugs in next audit |

## Deploy

Runtime fix → commit+push `feat/next-monorepo`; MSK web deploy required for live 500→404 + footer. Backend API 404 тоже нужен на MSK API process.
