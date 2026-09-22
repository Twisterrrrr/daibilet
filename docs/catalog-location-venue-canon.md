# Канон: Локация vs Площадка (антидубли)

**Дата:** 2026-08-02 (дополнено 2026-09-22: ticket-critical / review / family-flip)  
**Owner lock:** одна физическая точка = одна публичная карточка. Договор с объектом **не** определяет тип сущности.

Агенты и контент-ops: перед create Location/Venue / must-see seed / Hot Picks link - сверяться с этим документом.

---

## Сущности

| Термин | Смысл | Типичный URL |
|--------|--------|--------------|
| **Локация** | Точка для прогулки / «Мой день» / must-see без institution-роли. Афиша **не** обязательна. | `/locations/{slug}` |
| **Площадка (Venue)** | Institution / место афиши (и museum/gallery даже только-инфо). События не обязательны для institution kinds ниже. | `/venues/{slug}` |

- **Договор / коммерция ≠ тип справочника.** Есть договор или нет - отдельный контур (finance, supplier LC, admission). Тип «локация vs площадка» решает продуктовая роль места в каталоге и хабе, не наличие контракта.
- **Нет билетов / нет афиши ≠ смена URL-семейства.** (LOCKED 2026-08-07, owner option A.) Family берётся из **kind/role**, не из ticket availability. Музей/театр/зал без offers → всё равно `/venues`; buy-chrome скрыт до появления offers/sessions. Парки / достопримечательности / причалы / гастро-как-day-point → `/locations`. **Запрещено** временно класть institution «пока нет билетов» в `/locations`. Три оси: `kind`→URL, `offers`→UI chrome, `pageStatus`→модерация.
- В Prisma обе роли живут в модели `Venue` (+ `VenueKind` / public kind / pageStatus). Разделение для пользователя и SEO - через публичные семейства каталога (`/locations` vs `/venues`) и family-фильтры API, не через две независимые таблицы «на каждое имя».
- **Источник family:** `apps/web/src/lib/venue-kind-mapping.ts` (`VENUE_KIND_MAP`). Institution kinds: `MUSEUM_ART_SPACE`, `THEATER`, `CONCERT_HALL`, `CLUB_BAR_RESTAURANT`. Всё остальное → location.

### Family один раз (LOCKED 2026-09-22)

**Смысл:** не flip'ать без причины и **никогда** не менять family «тихо» (без 301 / без записи в docs).

**Явное исключение:** flip **разрешён**, если есть причина и соблюдены все четыре условия ниже. Читать «family один раз» как «никогда не flip'ать» **запрещено**: иначе через полгода получим либо застывшую ошибку kind/path, либо тихое перетекание без 301.

| Разрешено (исключение) | Запрещено |
|------------------------|-----------|
| Явный flip при смене роли (билеты, афиша, бренд, ошибочный kind) | «Пока нет билетов → `/locations`, потом переедем» |
| HTTP **301** old path → new path на каждый flip | Две `PUBLISHED` карточки одного места в разных префиксах |
| Обоснование в этом файле и/или Diary (+ строка в Tasktracker) | Массовый flip «на всякий случай» (GASTRO / SPORT / дворцы пачкой) |
| **Отдельный коммит** (и отдельный apply-batch), не смешивать с enum/mapping/шагом N | Тихое переписывание `canonicalPath` / kind без redirect |

Причина flip должна быть явной: **билеты / афиша / бренд / path-bug**. Через год кластер может вести себя иначе - тогда осознанный flip с 301, не «тихое перетекание».

---

## Ticket-critical vs location-always (LOCKED 2026-09-22)

Критерий «сейчас или скоро билеты» **запрещён** как основание family. Стартовое решение - по роли/kind один раз при create/seed; смена только через явный flip (см. выше).

### Institution всегда (сажать в `/venues` при create/seed)

Музеи, арт-галереи, театры, цирки, концертные залы, филармонии, консерватории, ДК / культурные центры, бары / клубы с афишной ролью, гастрокомплексы **с собственной афишей** (`CLUB_BAR_RESTAURANT`, не `GASTRO`).

Эталон дворца-музея с платным входом: **Юсуповский дворец** → institution (`MUSEUM_ART_SPACE`), даже если offers ещё нет.

**Цирк:** в enum нет `CIRCUS`. До появления отдельного kind цирк = `THEATER` (билетная институция, афиша, зал, ticket layout). Не оставлять цирк в location - теряется ticket layout. При следующем расширении enum - вынести в `CIRCUS`.

**Дворец → museum:** дворец становится `MUSEUM_ART_SPACE` / `/venues`, если у него есть **входной билет как продукт** (эталон: Юсуповский, Петровский путевой). Если только экскурсии от сторонних гидов без нашего входного продукта - оставить location (`ATTRACTION`). Не flip'ать дворцы пачкой (~25) - отдельный palace-batch.

### Location всегда (живут в `/locations`)

Приходские храмы / церкви / мечети / синагоги **без** входного продукта у нас (`TEMPLE`), парки, набережные, памятники, улицы / площади / мосты (`OUTDOOR_LOCATION`), точки сбора (`MEETING_POINT`), посадочные / автобусные остановки (`BUS`), причалы (`PIER`), туристическое гастро без афиши (`GASTRO`), фасады / прогулочные здания (`ATTRACTION`).

### Review при появлении билетов (не flip'ать «на всякий случай»)

Отдельный список; family **не** менять из-за гипотезы «когда-нибудь продадим». Когда появляется реальная афиша / входной билет / LC - **явный** flip: новый kind или institution + HTTP 301 + запись в docs. Не тихое перетекание.

| Запись / кластер | Сейчас (2026-09-22) | Решение до появления билетов |
|------------------|---------------------|------------------------------|
| **Храм Христа Спасителя** (Москва, канон `moscow-hram-hrista-spasitelya`) | `ATTRACTION` / `/locations` (review шага 3) | **оставить location**; chip `temple` (после kind=`TEMPLE` или chip-resolve). Не смешивать с аудитом 100. |
| **Исаакиевский собор** (канон `saint-petersburg-isaakievskiy-sobor` / twin review) | `ATTRACTION` / `/locations` | **оставить location** + chip `temple`, пока нет наших билетов/афиши. |
| **Собор Василия Блаженного** (`moscow-sobor-vasiliya-blazhennogo`) | `ATTRACTION` / `/locations` | **оставить location** + chip `temple`, пока нет наших билетов/афиши. |
| Музеи-храмы / иные ticketable cathedral-museums из `TICKETABLE_MUSEUM_TEMPLE_RE` | review, не `TEMPLE`-migrate | case-by-case; при билетах → institution + 301 |
| Планетарии, океанариумы | часто `ATTRACTION`/`MUSEUM` смешанно | review; при стабильной афише → `MUSEUM_ART_SPACE` + `/venues` (не пачкой) |
| NN `CLUB_BAR_RESTAURANT` без READY (~10 gastro на `/venues`) | institution без афиши | **review 2–3 мес.**: появились READY → оставить; нет → точечный `GASTRO` `/locations` + 301. Не «на вырост» бессрочно |
| Особняк / дворец с концертной афишей (READY + buy) | часто `ATTRACTION` | flip → `CONCERT_HALL` (не `THEATER`: концертный layout, не драма) |
| Органный зал в бывшей кирхе (Кирха Св. Семейства, Калининград) | `CONCERT_HALL` `/venues` | ок; не `TEMPLE` |

Правило: если запись уже в location и начинает продавать билеты - это **новый kind или явный flip с 301** (отдельный коммит + запись здесь / в Diary), не «тихое перетекание» и не «временно оставим».

### Chip ≠ family

Чип и family независимы. Один chip на двух family допустим **только** если layout различает роль:

- `temple` + **location** = приход / must-see: карта, «как добраться» (`LocationVenueLayout`).
- `temple` + **institution** = музей-храм с афишей/билетами: афиша, «купить» (`InstitutionVenueLayout`).

Пока institution chip-set не включает `temple` (`INSTITUTION_PUBLIC_CHIPS`) - ХХС при upgrade идёт через `MUSEUM_ART_SPACE` (chip museum/art) **или** отдельный допуск chip `temple` в institution + проверка layout. Не публиковать chip temple на `/venues` без различия layout.

---

## Kind defaults (owner lock 2026-08-02)

| Тип места | Куда по умолчанию | Kind / family |
|-----------|-------------------|---------------|
| **Музеи** | всегда **Площадки** | institution, `MUSEUM_ART_SPACE` (или аналог) |
| **Арт-галереи** | всегда **Площадки** | institution, тот же принцип что музеи |
| Театры / цирки / концертные залы / филармонии / консерватории / ДК / культурные центры | **Площадки** | institution (`THEATER` / `CONCERT_HALL`) |
| Парки / набережные / памятники / улицы / площади | **Локации** | location kinds (`PARK` / `MONUMENT` / outdoor / …) |
| **Кластер** (Новая Голландия, Севкабель Порт) | всегда **Локация**-родитель | `OUTDOOR_LOCATION` (или park); дети - отдельные карточки, см. [place-cluster-canon.md](./place-cluster-canon.md) |
| **Здания-достопримечательности** (фасад, прогулка вокруг: особняк, адмиралтейство, кремль, кирха) | **Локации** | `ATTRACTION` |
| **Дворец/собор с билетом на вход** (дворец-музей, колоннада, интерьер) | **Площадки** | institution, обычно `MUSEUM_ART_SPACE`. Эталон: Юсуповский дворец |
| **Кафе / ресторан / бар** (туристические точки без institution-афиши) | **Локации** | `GASTRO` («Гастро»), **не** `CLUB_BAR_RESTAURANT` и **не** `OUTDOOR_LOCATION` |

**Открытая локация (`OUTDOOR_LOCATION`)** - только улица / мост / площадь / набережная / иное место с открытым уличным доступом. Здания и гастро в этот чип не кладём (owner 2026-08-05).

**Гастро (`GASTRO`)** - кафе/ресторан/бар/рынок-фуд в каталоге `/locations`. Institution с событиями остаётся `CLUB_BAR_RESTAURANT` → `/venues`.

**Музеи и арт-галереи по умолчанию всегда в Площадки (institution kind), независимо от договора** - даже если только информируем о наличии места без своих билетов/событий. На этом строится блок музеев/галерей хаба города (секция из venue family institution).

**После хаба «Места» (2026-08-13):** вход «С афишей» = `/venues`. Потенциальные площадки (музей, театр, цирк, концертный зал, филармония, консерватория, ДК, культурный центр, клуб с событиями) **сажать в venues при create/seed**, не ждать первой афиши и не класть «пока нет билетов» в `/locations`.

**Дворец / собор / крепость:** смотри роль, не слово «дворец».
- Дворец-музей с платным входом (эталон **Юсуповский**; также Екатерининский / Павловский / Петергофский при входном продукте) → **Площадка** `MUSEUM_ART_SPACE`.
- Соборы из списка Review (ХХС, Исаакий, Василий, Спас на Крови до явного flip) → **Локация**, пока нет наших билетов; flip только осознанно + 301.
- Точка на маршруте с улицы, без нашего входного продукта (Адмиралтейство, кремль как ансамбль, приходская кирха) → **Локация** (`ATTRACTION` / `TEMPLE`).
- Теплоход «мимо Юсуповского» не делает набережную площадкой. Option A не отменяется: family от роли, chrome от offers.

Пример: Эрмитаж / Русский музей / арт-галерея без договора и без наших сеансов → сразу **Venue** (`MUSEUM_ART_SPACE` / institution), **не** Локация. Не ждать появления афиши и не создавать twin.

Антидубль по-прежнему жёсткий: одна физическая точка = одна публичная карточка.

---

## Когда что создавать

| Ситуация | Куда |
|----------|------|
| Музей или арт-галерея (даже только-инфо, без договора/билетов) | **Venue / institution сразу** |
| Театр / цирк / концертный зал / филармония / ДК / клуб | **Venue сразу** (не ждать первой афиши) |
| Дворец-музей с платным входом (эталон Юсуповский) | **Venue сразу** (`MUSEUM_ART_SPACE`) |
| ХХС / Исаакий / Василий / Спас на Крови (пока без наших билетов) | **Локация** (review); flip в Venue только явно + 301 |
| Здание как фасад / прогулка без входного билета | **Локация** (`ATTRACTION`) |
| Иное место: есть или скоро будут события/сеансы / продажа билета | **Venue сразу** |
| Иное место: только must-see / маршрут, событий нет | **Локация** |
| Сначала локация, потом institution/афиша (не museum/gallery - те сразу Venue) | **Upgrade** той же сущности **или** hide location + publish venue с alias / 301. **Не** вторая `PUBLISHED` карточка |

### Upgrade (канон перевода локация → площадка)

1. Предпочтительно: сменить публичную роль / kind / маршрутизацию **той же** записи (тот же id/slug или controlled slug rename + redirect).
2. Допустимо: `pageStatus` старой карточки → скрыть (`HIDDEN` / unpublish), новая venue-карточка с **alias + HTTP 301** со старого URL.
3. **Запрещено:** две одновременно `PUBLISHED` карточки (Location + Venue) на одну физическую точку / одно каноническое имя.
4. Если музей/галерея ошибочно созданы как Локация - **upgrade в institution Venue**, не twin.

Must-see / Hot Picks / city hub `mustSee` обязаны ссылаться на **каноническую** сущность (`venueSlug` **или** `locationSlug` - один живой target, не оба на twin). Хаб города: секция музеев/галерей берёт из **venue family institution**.

---

## Антидубли (жёстко)

1. **Одна физическая точка = одна публичная карточка** в каталогах (`/locations`, `/venues`, city hub places).
2. **Не плодить** Location + Venue с одним (или почти одним) названием в одном городе.
3. **Перед create** обязательно искать:
   - slug (точное и близкие варианты);
   - название (кириллица / латинь / ё-е / мягкий знак / дефисы / пробелы);
   - coords (рядом уже есть точка с тем же смыслом).
4. **Не плодить twin-пары:**
   - soft-sign twins (`vosstaniya` / `vosstaniya` vs `vosstaniâ`-подобные);
   - latin ↔ cyrillic twins (`ermitage` / `ermitazh` / `эрмитаж` как разные PUBLISHED);
   - «локация + площадка» twin с одним title.
5. Перевод локация → площадка = **upgrade или hide+redirect**, не twin `PUBLISHED`.
6. Import / seed / editorial JSON не должны создавать вторую сущность «на всякий случай», если канон уже есть.
7. Музей/галерея не создавать как `/locations/` «на время» - сразу institution Venue.

---

## Мой день

На `/my-day` поиск разделён на семейства:

- **Локации**
- **Площадки**
- **События**

Дубли одной точки в двух семействах путают пользователя (одна и та же точка дважды в dropdown / Hot Picks / must-see chips). Поэтому антидубль-канон выше - не только SEO, но и UX планировщика. Музеи/галереи ожидаются в **Площадках**.

Коммерческий checklist / chips / Soft-cap: [myday-commercial-canon.md](./myday-commercial-canon.md).

---

## Чеклист агента (перед create / seed / publish)

- [ ] Поиск по slug + title + coords выполнен; дубль не найден.
- [ ] Музей / арт-галерея → Venue institution (`MUSEUM_ART_SPACE` или аналог), не Локация.
- [ ] Театр / цирк / зал / филармония / ДК / клуб → Venue (`THEATER` / `CONCERT_HALL` / `CLUB_BAR_RESTAURANT`), не Локация и не «сначала ATTRACTION».
- [ ] Парк / набережная / памятник / улица / фасад без входного билета → Локация. Дворец-музей с билетом на вход (Юсуповский) → Venue.
- [ ] Выбран один тип по таблице «Когда что создавать» / Kind defaults.
- [ ] Если афиша/institution появилась у существующей локации - план upgrade / hide+301, не второй PUBLISHED.
- [ ] Must-see / Hot Picks / hub ссылки ведут на канон, не на twin.
- [ ] Договор с объектом не использован как критерий «делать Venue» (для музеев/галерей Venue и без договора).
- [ ] Отсутствие tickets/sessions не использовано как повод перенести institution в `/locations`.
- [ ] Зонтик (НГ / Севкабель / арт-квартал) → одна родительская **локация**, не `/venues`-близнец; дети не в `places[]` хаба.

---

## Шаг 4: аудит family (метод)

1. Стратифицированная выборка ~100 `PUBLISHED` Venue (≥5 на kind, где есть).
2. Подтвердить правило mapping; выписать **exceptions**, где family/path явно неверны.
3. Flip только обоснованный; пороги: `<10` apply, `10–20` apply + хвост review, `>20` - пересмотр правила целиком.
4. Не flip'ать GASTRO / SPORT пачкой. Не трогать шаг 5 (hub_only PDP). Не начинать редизайн PDP до стабилизации family (**≥24 ч** после family-flips - Вебмастер/301).
5. Каждый family flip = 301 old→new + обоснование в docs + **отдельный коммит** (см. «Family один раз»); CI-инварианты 1–4 зелёные; slug не в двух префиксах sitemap.
6. Аудит не ищет «истину навсегда» - подтверждает гипотезу и чинит явные exceptions.
7. **Сигналы выборки (отдельно помечать, не «может быть»):**
   - `kind` location + READY/афиша/buy → кандидат flip в institution;
   - `kind` institution + 0 READY + 0 buy → кандидат обратного flip (редко; Option A: museum/theater без offers **не** flip);
   - `TEMPLE` / temple-like + title «музей»/«собор-музей»/«монастырь-музей» → потенциальный institution (case-by-case, не в пачке 100).
8. **Классы apply не смешивать в одном коммите** (порядок): path-fixes → family-flips → twin hide+301 → kind-only. Path-fixes первыми, чтобы smoke flip'ов не ловил path-баги.

### Batch A apply (2026-09-22, owner OK)

| Класс | Коммит | Строки |
|-------|--------|--------|
| Path-fixes | 1 | `rostov-na-donu-teatral-naya-ploschad` → `OUTDOOR_LOCATION` `/locations`; ЯКарелия null path → `/venues/…`. (`naprotiv-…` переклассифицирован в twin-hide → `moscow-sovremennik`) |
| Family-flips + 301 | 2 | Современник → `THEATER`; Юсуповский → `MUSEUM_ART_SPACE`; Чинизелли → `THEATER` (circus); Петровский → `MUSEUM_ART_SPACE`; особняки Половцова/Мясникова → `CONCERT_HALL` |
| Twin hide + 301 | 3 | `naprotiv-…` → HIDDEN → `moscow-sovremennik`; `yusupovskiy-dvorec-63986bf7a7df` → HIDDEN → канон Юсуповский; `petrovskii-putevoi-dvorec-…` → HIDDEN → канон Петровский |
| Kind-only | 4 | `moscow-depo-lesnaya` ATTRACTION → `GASTRO` (URL `/locations` не едет) |

Отчёт: [drafts/family-audit-step4-2026-09-22.md](./drafts/family-audit-step4-2026-09-22.md). Скрипт: `scripts/family-audit-batch-a.mjs`.

---

## Связанное

- [Project.md](./Project.md) - краткий pointer + VenueKind / Location↔Excursion
- [myday-commercial-canon.md](./myday-commercial-canon.md) - planner UX
- [ux-locations-mobile-catalog-brief.md](./ux-locations-mobile-catalog-brief.md) - UX `/locations`
- [place-cluster-canon.md](./place-cluster-canon.md) - зонтик Новая Голландия / Севкабель: родитель-локация, дети, афиша, Мой день
- [qa.md](./qa.md) - LOCKED 2026-08-07 option A; 2026-08-13 Places hub + plant ticket venues + place cluster
- Mapping: `apps/web/src/lib/venue-kind-mapping.ts`
