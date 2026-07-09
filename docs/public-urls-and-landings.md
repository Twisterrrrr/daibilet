# Public URL: города, лендинги, редиректы

**Версия:** 2026-07-05  
**Статус:** зафиксировано в коде и на prod (`feat/lovable-landings`)

Документ описывает канонические URL публичного сайта, правила редиректов, SEO (`canonical`) и соответствие frontend/backend.

---

## 1. Принцип «гибридного канона»

Для двух флагманских городов используются **короткие устоявшиеся коды**:

| Город | Канон в URL | Не использовать как канон |
|-------|-------------|---------------------------|
| Санкт-Петербург | **`spb`** | `saint-peterburg`, `sankt-peterburg`, `peterburg` |
| Москва | **`moscow`** | `msk`, `moskva` |

Для всех остальных городов — **полный slug** в нижнем регистре через дефис:

- `kazan`, `sochi`, `nizhny-novgorod`, `volgograd`, `ekaterinburg` …
- без сокращений (`nnov`, `krd` и т.п.)

**Почему так:** `spb` однозначен и привычен в RU-сегменте; `moscow` лучше для SEO, чем `msk`; длинные транслиты СПб создают путаницу без выигрыша в ранжировании.

---

## 2. Типы страниц и URL

### 2.1. Страница города

```
/cities/spb/
/cities/moscow/
/cities/kazan/
```

| Компонент | Файл |
|-----------|------|
| href | `apps/public/src/routes.ts` → `cityHref()` |
| канон slug | `apps/public/src/lib/city-path.ts` |
| API | `GET /api/public/cities/:slug` |
| backend href | `publicCityHref()` в `apps/backend/src/dto.js` |

### 2.2. Мультилендинги (несколько городов)

Формат: **`/{категория}/{город}/`**

| Slug (internal) | SEO path | Пример |
|-----------------|----------|--------|
| `river-cruises` | `rechnye-progulki` | `/rechnye-progulki/spb/` |
| `bus-tours` | `avtobusnye-ekskursii` | `/avtobusnye-ekskursii/moscow/` |
| `river-party` | `vecherinki-na-teplohode` | `/vecherinki-na-teplohode/spb/` |
| `salute-9-may` | `salut-9-maya` | `/salut-9-maya/moscow/` |
| `new-year` | `novyj-god` | `/novyj-god/spb/` |

Без города (национальный хаб): `/rechnye-progulki/`

### 2.3. Городские лендинги (один город)

Формат: **`/{город}/{тема}/`**

| Slug (internal) | SEO topic | Город | Пример |
|-----------------|-----------|-------|--------|
| `bridges-night` | `night-bridges` | spb | `/spb/night-bridges/` |
| `spb-yards` | `spb-yards` | spb | `/spb/spb-yards/` |
| `moscow-dinner-boat` | `dinner-boat` | moscow | `/moscow/dinner-boat/` |
| `moscow-museums` | `moscow-museums` | moscow | `/moscow/moscow-museums/` |
| `planetarium` | `planetarium` | spb | `/spb/planetarium/` |

### 2.4. Прочие маршруты (без изменений)

| URL | Назначение |
|-----|------------|
| `/events`, `/events/:slug` | Каталог и карточка события |
| `/venues/:slug`, `/locations/:slug` | Площадка / локация (причал) |
| `/podborki` | Каталог подборок |
| `/cities` | Список городов |

Legacy (301 → канон):

- `/landings/:slug` → новый path-based URL
- `/landings/:slug/:city` → канон
- `*.daibilet.ru/...` (поддомены) → path-based

---

## 3. Редиректы (301)

Клиентские редиректы через `window.location.replace` в `App.tsx`.  
Логика: `apps/public/src/lib/city-path.ts`, `apps/public/src/lib/landing-routes.ts`.

### 3.1. Города

| Старый URL | Канон |
|------------|-------|
| `/cities/saint-peterburg/` | `/cities/spb/` |
| `/cities/sankt-peterburg/` | `/cities/spb/` |
| `/cities/msk/` | `/cities/moscow/` |
| `/cities/moskva/` | `/cities/moscow/` |

### 3.2. Лендинги

| Старый URL | Канон |
|------------|-------|
| `/nochnye-mosty/` | `/spb/night-bridges/` |
| `/dvory-i-paradnye/` | `/spb/spb-yards/` |
| `/uzhin-na-teplohode/` | `/moscow/dinner-boat/` |
| `/landings/bridges-night` | `/spb/night-bridges/` |
| `/spb/rechnye-progulki/` | `/rechnye-progulki/spb/` |

### 3.3. Политика

- В **sitemap**, **меню**, **футере**, **API href** — только канонические URL.
- Алиасы принимаются только для входящих ссылок и отдают **301**.
- Trailing slash: канон с `/` на конце.

---

## 4. SEO: canonical и meta

Public SPA **без SSR**. Title/description/canonical выставляются на клиенте после загрузки данных.

| Страница | Функция | Файл |
|----------|---------|------|
| Город | `applyCityMeta()` + `upsertCanonicalLink(cityPageHref(...))` | `CityPage.tsx` |
| Лендинг | `applyLandingSeoMeta()` + canonical через `landingCategoryHref()` | `landing-seo.ts` |

Утилиты: `apps/public/src/lib/seo-meta.ts`, `apps/public/src/lib/city-path.ts` (`upsertCanonicalLink`).

H1 лендингов с динамической датой: `apps/public/src/lib/landing-seo.ts` («сегодня, 5 июля»).

**TODO:** генерация `sitemap.xml` с каноническими URL (ещё не реализована).

---

## 5. Карта файлов в коде

| Задача | Frontend | Backend |
|--------|----------|---------|
| Канон slug города | `lib/city-path.ts` | `canonicalCitySlug()`, `publicCityPathSegment()` в `dto.js` |
| href города | `routes.ts` → `cityHref()` | `publicCityHref()` |
| href лендинга | `lib/landing-routes.ts` → `landingCategoryHref()` | `publicLandingHref()` |
| Роутинг SPA | `App.tsx` + `resolveLandingRouteFromLocation()` | — |
| Промо/поиск href | Footer, Header, CitiesCatalogPage | `buildPublicSearch`, `buildPublicPromoBlocks` |
| Картинки городов | `cityContentSlug()` → `saint-petersburg` для `spb` | `CITY_CARD_IMAGE_ALIASES` |

---

## 6. Full sync и деплoy

### 6.1. Full sync (каталог)

Полный цикл импорта данных:

```bash
npm run sync:full
```

Шаги (`scripts/run-full-sync.js`):

1. Ticketscloud gRPC full sync → JSON
2. Build TC SQL seed
3. Apply seed в Postgres
4. Teplohod import

На prod:

```bash
cd /opt/daibilet
git pull origin feat/lovable-landings   # или main после merge
npm run sync:full
systemctl restart daibilet-api
```

После sync API прогревает in-memory кэш каталога (~10 с).

### 6.2. Деплой frontend/backend

```bash
cd /opt/daibilet
git pull origin feat/lovable-landings
npm --prefix apps/public ci
VITE_DAIBILET_API_URL=https://api.daibilet.ru VITE_TEP_WIDGET_ID=14208 npm --prefix apps/public run build
rsync -a --delete apps/public/dist/ /var/www/daibilet/public/
systemctl restart daibilet-api
curl -fsS http://127.0.0.1:4000/api/health
```

Подробнее: [deploy-timeweb.md](./deploy-timeweb.md).

### 6.3. Smoke после деплоя URL

- `https://daibilet.ru/cities/spb/` — 200, canonical = `/cities/spb/`
- `https://daibilet.ru/cities/saint-peterburg/` → 301 → `/cities/spb/`
- `https://daibilet.ru/spb/night-bridges/` — лендинг мостов
- `https://daibilet.ru/rechnye-progulki/moscow/` — речные прогулки Москва
- `https://daibilet.ru/landings/bridges-night` → 301 → `/spb/night-bridges/`

---

## 7. История решений

| Дата | Решение |
|------|---------|
| 2026-07 | Отказ от поддоменов `moscow.daibilet.ru` → path-based URL |
| 2026-07 | Разделение: мультилендинги `/category/city/`, городские `/city/topic/` |
| 2026-07 | Гибридный канон `spb` + `moscow` для всех типов страниц |
| 2026-07 | `<link rel="canonical">` на city + landing pages |

См. также [Diary.md](./Diary.md), [seo-public-mvp.md](./seo-public-mvp.md).
