# SEO / Подборки: ЧПУ city-хабы - анализ и план (без внедрения)

**Дата:** 2026-08-11  
**Статус:** планирование (код URL-миграции **запрещён** до ответов owner)  
**Трек:** отдельный от My Day UX и от SEO category×city listing texts (`seo-listing-texts` / `SEO.LC*` / `UX.6`). Не смешивать PR и deploy-batch.

Owner brief (суть): хаб `/podborki`; city ЧПУ `/podborki/sankt-peterburg` | `/podborki/moskva` вместо `?city=…`; Title/Description/H1 на city-хабе; карточки с SEO-описанием + «N событий • от X руб»; цепочка Блог → Подборка → События.

Жёсткое owner: *если перелинковка - проверить везде; лучше сначала подумать 7 раз.* Этот документ = проход «подумать».

---

## 1. Как устроено сейчас

### 1.1 App и роуты

Канон UI: **`apps/web`** (Next App Router). Legacy `apps/public` ещё держит nav/fallback `href="/podborki"`, но live catalog = web.

| URL | Файл | Поведение |
|-----|------|-----------|
| `/podborki` | `app/podborki/(catalog)/page.tsx` | Хаб каталога подборок (Landing cards). SSR **всегда** `city=all`, ISR/`revalidate=600`, canonical **`/podborki`**. |
| `/podborki?city={slug}` | тот же + client | Soft-filter: `SelectedCityProvider` inject/sync query; `LandingsCatalogView` refetch `/api/public/landings-catalog?city=`. Не отдельный SSR/meta. |
| `/podborki?city=all` | query sentinel | Явное «Все города»; storage очищается (иначе header city возвращается). |
| `/podborki/{intent}` | `app/podborki/[intent]/page.tsx` | Intent-подборка событий (besplatno, na-vyhodnye, …) - это **не** city-хаб каталога. |
| `/podborki/{intent}/{city}` | `app/podborki/[intent]/[city]/page.tsx` | Intent × city ЧПУ уже есть. |
| `/{category}/…` | landings | Тематические посадки (`/rechnye-progulki/moscow`) - **вне** `/podborki`. |
| `/cities/{slug}` | city hub | Городской хаб афиши/мест - **не** подборки. |

Интенты (канон): `besplatno`, `na-vyhodnye`, `segodnya-vecherom`, `do-2000`, `skoro` (+ alias `na-vyhodnyh` → 301).

### 1.2 City filter на хабе

- `CITY_FILTER_PATHS` включает `/podborki`.
- Смена города в шапке на хабе → `/podborki?city={slug|all}` (`city-change-nav`).
- На intent-страницах → path-segment `/podborki/{intent}/{city}` (уже ЧПУ).
- Meta/H1 хаба **не** зависят от `?city=` (SSR city=all + один canonical). City-фильтр почти невидим для роботов.

### 1.3 Карточки сейчас

DTO уже несёт `title`, `subtitle`, `events`, `priceFrom`. UI показывает meta под фото / в bento; ExpandableBlurb SEO-текст есть на хабе (`PODBORKI_SEO_TEXT`). Отдельных city-specific Title/H1 и «карточечных SEO blurbs» под brief owner **нет**.

### 1.4 Slug-канон (конфликт с брифом)

| Источник | Москва | СПб |
|----------|--------|-----|
| Owner brief | `moskva` | `sankt-peterburg` |
| SEO landings / `normalizeKnownCitySlug` | `moscow` | `saint-petersburg` |
| Aliases уже есть | `moskva`→`moscow`, `msk` | `sankt-peterburg`/`spb`→`saint-petersburg` |
| City hubs / destinations | часто DB slug (`moskva`, `sankt-peterburg`) + SEO alias | то же |

Бриф предлагает URL в «TEP/DB» форме; текущие индексируемые category×city и intent-city - в **SEO** форме (`moscow`, `saint-petersburg`). Менять без единого канона = двойной индекс.

---

## 2. Inventory перелинковки

Гrep-паттерны: `podborki`, `/podborki`, `city=all` (в контексте секций), `landings` section nav.

### 2.1 Топ паттернов (где править при миграции)

| Паттерн | Где | Что сейчас |
|---------|-----|------------|
| A. Хаб без города | Header, Footer, HomeBottomNav, home-guide, BlogArticleView CTA, CatalogResults, blog-listing-links «Подборки», IntentCollectionView crumb | `/podborki` |
| B. Хаб + query city | **CityPageView** CTAs (`/podborki?city=`), **catalog-interstitials** (`/podborki${cityQs}`), SelectedCityProvider inject | soft SEO |
| C. Intent ЧПУ | catalog-intent-routes, city-change-nav, catalog-links tags, seo-internal-links, sitemap intent paths, IndexNow sample | `/podborki/{intent}[/city]` |
| D. Blog MD / bodies | мало прямых: `content/blog/*` + `blog-article-bodies.ts` (напр. kazan → `/podborki/na-vyhodnye/kazan`, novosibirsk weekend) | смесь intent + хаб |
| E. Sitemap | `sitemap-data.ts` | `/podborki` + indexable intents; **нет** `/podborki/{city}` |
| F. Legacy public | `apps/public` Header/Footer/Blog/About/… | `/podborki` |
| G. Tests | city-change-nav, catalog-links, seo-internal-links, selected-city, owner-pack | зафиксирован текущий контракт |

**Emails / transactional:** в коде web публичных шаблонов со ссылками на `/podborki` не найдено (не трогать без отдельного inventory messaging).

**Оценка объёма:** ~25–40 «точек правки» в web/lib+components + legacy public nav + единичные blog MD; плюс тесты. Не тысячи MD, но **центральные** хелперы (`city-change-nav`, `SelectedCityProvider`, CityPageView) - single point of failure.

### 2.2 Что уже ЧПУ (не ломать)

- Intent: `/podborki/na-vyhodnye`, `/podborki/besplatno/moscow`, …
- Category landings: `/rechnye-progulki/moscow` и т.п.
- City hubs: `/cities/moscow` / `/cities/sankt-peterburg` (по destination slug)

---

## 3. Риски миграции

### 3.1 Критический: коллизия роута

Сейчас первый сегмент после `/podborki/` = **`[intent]`**.  
Предлагаемый `/podborki/sankt-peterburg` попадёт в тот же dynamic segment → `resolveCatalogIntent` → **404**, если не переписать роутинг.

Варианты (только после решения owner):

1. **Discriminating segment** в одном `[segment]`: если intent → IntentCollectionView; если known city → city catalog hub; иначе 404.  
2. **Перенос intents** (ломка уже индексируемых URL) - **не рекомендовать**.  
3. **Префикс** `/podborki/gorod/{slug}` - безопаснее роутинга, но **не** совпадает с брифом.

Без выбора схемы - код не писать.

### 3.2 Canonical / дубли index

- Сейчас `?city=` **не** в canonical → city-фильтр не плодит URL в индексе (плюс).  
- После ЧПУ `/podborki/{city}` появится **второй** городской индекс рядом с `/cities/{slug}`. Нужны разные Title/H1/intent (подборки vs афиша города), иначе каннибализация.  
- Старые `/podborki?city=X` → обязательный **301** на ЧПУ + единый canonical.  
- Alias slug (`moscow` vs `moskva`) → один канон + 301 с алиасов, иначе дубли.

### 3.3 Конфликт с существующими хабами / landings

- `/cities/{slug}` уже SEO-ядро города.  
- Category×city уже закрывает «куда сходить / речные / стендап».  
- City-хаб подборок должен позиционироваться как **каталог тематических коллекций города**, не как дубль афиши.

### 3.4 Перелинковка (owner warning)

Массовая смена без полного inventory = битые CTA с city hubs, interstitial, blog, тесты soft-nav.  
Правило: **один helper** `podborkiCityHubPath(slug)` + grep gate перед merge; не править URL руками в 20 файлах без хелпера.

### 3.5 Параллельные треки (не конфликтовать)

| Трек | Зона | Правило |
|------|------|---------|
| My Day Lovable / routes | `/my-day`, DayRoutePanel; план ЧПУ `/routes/{city}/{slug}` (отдельный qa) | Не менять query/`city=` контракт my-day; не смешивать PR с podborki city |
| SEO category listing texts | `seo-listing-texts`, `LandingSeoBottom`, ExpandableBlurb на **landings** `/{category}` (напр. standup:kaliningrad) | Не переписывать category meta; blurbs podborki - отдельный контент-слой |
| Region Hub IA | `/cities` region | Не трогать |

Подборки city-ЧПУ = **SEO.PODBORKI-CITY-*** эпик, отдельные PR. Параллельный агент (2026-08-11 Category hub SEO + My Day routes plan) - соседний трек, не блокирует и не пересекает URL `/podborki`.

---

## 4. Поэтапный план

### Phase 0 - Audit / noindex / решения (сейчас)

**Сделать:** этот doc + qa + Tasktracker; зафиксировать inventory; **не** менять URL.  
**Можно катить:** только docs (commit/push, без web deploy).  
**Exit:** ответы owner на вопросы в `docs/qa.md` (секция Подборки ЧПУ).

### Phase 1 - ЧПУ + 301 (после канона slug + схемы роута)

- Роут city-хаба без ломки intents.  
- 301: `/podborki?city={alias}` → `/podborki/{canonical}`; alias city → canonical.  
- `city-change-nav` + SelectedCityProvider: хаб пишет path, не query.  
- Sitemap: добавить indexable `/podborki/{city}` (порог: есть карточки / events).  
- Helper + обновление **всех** B-паттернов (CityPageView, interstitials).  
**Можно катить:** unit tests green; smoke 200 на `/podborki`, `/podborki/{city}`, `/podborki/na-vyhodnye`, `/podborki/na-vyhodnye/{city}`; 301 matrix; intents не 404.

### Phase 2 - Meta / H1 city-хаба

- Title / Description / H1 по формуле owner (пример СПб из брифа - после утверждения текста).  
- Canonical = ЧПУ city; robots по наполнению.  
**Можно катить:** View Source meta≠хаб «все города»; нет дубля с `/cities/{slug}` title.

### Phase 3 - Card blurbs

- Уникальное краткое SEO-описание на карточке + уже существующие `events` / `priceFrom` в формате «N событий • от X руб».  
- Контент: seed/map, не выдумывать пустые blurbs.  
**Можно катить:** карточки без пустого description; цена только real `priceFrom`.

### Phase 4 - Blog → Подборка → События

- Баннеры/CTA в статьях на **city или intent** подборку, затем в события/landing.  
- Не массово переписывать все MD до стабильного URL-канона (Phase 1 locked).  
**Можно катить:** пилот 3–5 гайдов; helper CTA; без city-placeholder.

---

## 5. Что НЕ трогать в этом проходе

- Массовая смена URL / перелинковки.  
- Deploy web ради SEO-эксперимента.  
- Ломать intent ЧПУ и category landings.  
- Менять My Day share URLs (`?city=spb`).  
- «Временные» `/podborki/moskva` без 301-матрицы и канона slug.  
- Параллельный rewrite `seo-listing-texts` под вид «заодно подборки».

Точечные безопасные правки **допустимы** только при явном баге без миграции (в этом аудите такого launch-blocker не найдено: `?city=` - осознанный soft-filter).

---

## 6. Решения, нужные от owner до кода

См. `docs/qa.md` → **2026-08-11 - Подборки /podborki city ЧПУ**. Кратко:

1. Канон city slug в path: SEO (`moscow` / `saint-petersburg`) vs brief (`moskva` / `sankt-peterburg`)?  
2. Схема роута vs intents (discriminating segment vs другой path)?  
3. Нужен ли индексируемый `/podborki/{city}` для всех городов или только TOP (MSK/SPB/…)?  
4. Дифференциация vs `/cities/{slug}` (формулы Title/H1)?  
5. Приоритет: Phase 1 URL сначала или сначала meta на soft `?city=` (temporary, не рекомендовать)?

---

## 7. Связанные docs

- Tasktracker: `SEO.PODBORKI-CITY-CHPU`  
- Diary: 2026-08-11 запись  
- Project.md: pointer в URL/SEO policy  
- qa.md: вопросы owner  
