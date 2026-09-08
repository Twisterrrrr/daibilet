# UX Catalog 2.0 - brief для Cursor (не Lovable)

**Дата:** 2026-09-08  
**Статус:** planned / ready to implement  
**Канон стека:** `apps/web` Next 15 App Router. Vite/`apps/public` - legacy mirror, не целевой UI.

## Вердикт по аудиту live

Для **витрины-MVP** текущий UX нормален: каталог saleable, редирект на TC/виджеты, страницы не «висят».  
Для **High-End product** (возврат, эмоция, премиум-агрегатор) - **не нормально**: ровная лента одинаковых карточек + pop-in картинок + «прайс-лист» meta = сухая техника вместо витрины досуга.

Часть претензий аудита уже частично закрыта кодом, часть - нет. Ниже - карта «симптом → реальная точка правки».

## Что уже есть (не делать заново)

| Симптом аудита | Факт в коде |
|----------------|-------------|
| «Подключи Inter/Manrope» | Уже `next/font/google`: Manrope + Inter + Source Serif (`apps/web/src/lib/fonts.ts`, `tailwind` `font-sans`/`font-display`) |
| «Нет aspect-ratio» | `EventCard` media: `aspect-[16/10]` + `bg-surface-muted` |
| «Нет lazy» | `CardSafeImage` / `next/image`: `loading="lazy"` кроме `imagePriority` LCP |
| «Тяжёлые превью» | Budget: `CATALOG_IMAGE_QUALITY=65`, `CATALOG_EVENT_CARD_SIZES`, sidecar `-card`/`-thumb` |
| «isFeatured в блоге» | Blog Hero `isFeatured` уже есть; не путать с каталогом |
| «Выбор редакции» | Есть `editorsPickBadge` / `ShowcaseEventCard` - точечно, не ритм всей сетки `/events` |

## Корневые проблемы (делать)

1. **CLS / pop-in картинок** - контейнер есть, но нет skeleton→fade; remote TC covers часто `unoptimized` (bypass) → полный вес файла.
2. **Монотонная сетка** - все плитки одного ранга; нет стабильного ритма featured / badge / span.
3. **Иерархия карточки** - title/meta/price слишком равны по весу; мало «воздуха».
4. **Фильтры/поиск** - утилитарные chips/кнопки без suggest UX (ожидание агрегатора).
5. **Блог listing** - цепочка fallback есть, но LCP/скролл страдает, если нет sidecar или грузится тяжёлый оригинал.

## Scope UX 2.0 (locked)

### IN
- `/events` catalog grid + list
- City hub affiche rail / regional mini-grids (те же `EventCard` пути)
- Shared media fade/skeleton в `SafeImage` / `CardSafeImage` (эффект на листинги)
- Blog **listing** covers (`/blog` cards) - размеры/sidecar/quality, не redesign magazine
- Card typography rhythm (title vs meta vs price) без смены бренд-шрифта

### OUT
- Полный redesign PDP / checkout / My Day / admin
- Новые Google Fonts через CDN-link (нарушит `next/font` + WEB.LIGHT)
- Wide catalog CTA
- Ломание TC / Teplohod purchase paths
- Force-push / секреты

## Приоритет волн

| Wave | ID prefix | Фокус | Цель |
|------|-----------|--------|------|
| **W1** | `UX2.PERF` | Skeleton + fade-in + CLS=0 на media | Картинки «проявляются», сетка не дёргается |
| **W2** | `UX2.GRID` | Featured rhythm в каталоге | Глазу есть якоря при скролле |
| **W3** | `UX2.TYPE` | Иерархия текста в карточке | Не прайс-лист |
| **W4** | `UX2.FIND` | Search/filter suggest (после W1-W3) | Ощущение «умного» агрегатора |
| **W5** | `UX2.BLOG` | Blog listing image budget | Меньше вязкости скролла |

Не начинать W4/W5 до стабилизации W1-W3 на preview.

---

## Paste-ready prompts для Cursor (адаптированы под репо)

### W1 - media fade / skeleton (вместо «ImageCard»)

```
Контекст: apps/web, Next Image. Нет компонента ImageCard - точки правки SafeImage.client.tsx / CardSafeImage и media-обёртки EventCard (уже aspect-[16/10] + bg-surface-muted).

Задача:
1) В SafeImage (или thin wrapper CardMediaImage) добавь состояние loaded=false до onLoad.
2) Картинка стартует с opacity-0, после onLoad → opacity-100 + transition-opacity duration-300. Не мигать при priority/LCP: для priority можно стартовать opacity-100 или сразу loaded.
3) Пока !loaded - родительский контейнер остаётся серым skeleton (уже bg-surface-muted); не меняй aspect-ratio.
4) Сохрани fill + sizes + quality + lazy/priority контракт EventCard.
5) Unit/smoke: нет регрессии fallback chain (-card → -thumb → original).
Не подключай сырой <img> вместо next/image. Не трогай finance/checkout.
```

### W2 - featured rhythm (вместо голого isFeatured в массиве)

```
Контекст: EventCard уже умеет editorsPickBadge / ShowcaseEventCard. Нужен ритм сетки /events (CatalogResults), не новый блог-флаг.

Задача:
1) Определи правило featured без ручного поля на каждом оффере предпочтительно: существующие editorial/home flags, editors pick, топ popularScore, или 1 pin на N карточек (стабильный по slug hash, не random каждый reload).
2) В CSS grid каталога featured занимает 2 колонки на md+ (col-span-2); на mobile остаётся 1 колонка.
3) Визуал: бейдж «Рекомендуем» (или канон «Выбор редакции» если уже есть в UI) + лёгкий акцент рамки/тени. Без emoji и цветного пилл-зоопарка на фото.
4) Не ломай infinite scroll / interstitials (CatalogInterstitial).
5) Тест на стабильность порядка SSR vs hydrate (без CLS от смены span).
```

### W3 - typography hierarchy (не «подключи Inter»)

```
Контекст: Manrope/Inter уже через next/font. Не добавляй link fonts.googleapis.com.

Задача в EventCard (+ horizontal при необходимости):
1) Title: сильнее (font-semibold/bold + text-graphite / slate-900 эквивалент токенов проекта).
2) Meta (дата, адрес, длительность): text-graphite-muted / slate-500, чуть больше gap, тонкие lucide-иконки где уже есть паттерн.
3) Price: отдельный визуальный якорь (вес выше meta, не выше title).
4) Чуть увеличить вертикальный ритм body карточки (gap), не раздувать padding до «карточного дашборда».
Сохрани design tokens (graphite/primary), не вводи новую палитру purple/cream.
```

### W4 - filters/search (позже)

```
Только после W1-W3. Не no-code combobox с нуля.
Улучши существующий FilterRail / city/category controls: typeahead по уже известным спискам городов/категорий, плавное раскрытие, keyboard a11y. Без нового backend search engine в этой волне.
```

### W5 - blog listing weight

```
/blog cards: BlogCardSafeImage (не сырой cover) + aspect media + BLOG_LISTING_IMAGE_QUALITY.
Fallback chain listing: -card → -thumb → -og → original.
Где cover = полный JPG без sidecar - сгенерировать card через `node scripts/compress-card-images.mjs blog` (коммит в apps/public).
Не менять magazine layout блога целиком; article hero без даунгрейда.
```

Не начинать W4 до preview smoke W1–W3; W5 можно параллельно после W1 (общий fade/SafeImage).

---

## Acceptance (smoke)

- `/events`, `/cities/perm` (афиша): при медленном 3G картинки не «прыгают» сетку; fade виден.
- В выдаче ≥1 визуальный якорь на viewport (featured / badge), не бесконечная одинаковая плитка.
- Title > price > meta по визуальному весу.
- Lighthouse CLS media-блоков карточек не хуже baseline (стремиться к ~0 на card media).
- Purchase paths TC/TEP без регрессии.
- Шрифты только через существующий `fonts.ts`.

## Связь с docs

- Задачи: `UX2.*` в [Tasktracker.md](./Tasktracker.md)
- Дневник: [Diary.md](./Diary.md) 2026-09-08
- Открытые вопросы owner: [qa.md](./qa.md) секция UX 2.0
