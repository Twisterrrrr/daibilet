# Шаг 4.1 - Family audit (2026-09-22)

Канон: [catalog-location-venue-canon.md](../catalog-location-venue-canon.md)  
Mapping: `apps/web/src/lib/venue-kind-mapping.ts`  
Скрипт apply: `scripts/family-audit-batch-a.mjs`  
Источник: MSK Postgres, `pageStatus = PUBLISHED`.

**Owner OK 2026-09-22:** apply 1–11 + Депо, **четырьмя коммитами** (path → flips → hides → kind).  
Решения: цирк → `THEATER`, Петровский → museum, особняки → `CONCERT_HALL`, twins → hide+301.  
**Apply status:** path+flips уже в MSK DB; hides×3 + Депо GASTRO applied 2026-09-22; aliases → deploy.

---

## Вердикт

Правило family (4 institution kinds → `/venues`, всё остальное → `/locations`) **на выборке держится**.

| Метрика | Значение |
|---------|----------|
| PUBLISHED всего | 1857 |
| Path vs mapping mismatch (до apply) | **2** |
| Null `canonicalPath` | **1** (ЯКарелия) |
| Стратифицированная выборка | 116 |
| Exceptions с явной сменой | **8–11** (≤15) |
| Кластеры в review | дворцы ~25, NN gastro-as-club ~10, планетарии/океанариумы, ХХС/Исаакий/Василий |

---

## Owner decisions (зафиксировано)

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Apply 1–11 + Депо | **OK**, 4 коммита |
| 2 | Twin hide #7/#8 | **HIDDEN + 301** на канон |
| 3 | Цирк #5 | **THEATER** (+ пометка circus в каноне до `CIRCUS`) |
| 4 | Петровский #6 | **MUSEUM_ART_SPACE сейчас** |
| 5 | Особняки #10–11 | **CONCERT_HALL** |

Классы не смешивать:

| Коммит | Класс | Строки |
|--------|-------|--------|
| 1 | Path-fixes | #1 naprotiv, #2 Ростов-площадь, #9 ЯКарелия |
| 2 | Family-flips + 301 | #3 Современник, #4 Юсуповский, #5 Чинизелли, #6 Петровский, #10 Половцов, #11 Мясников |
| 3 | Twin hide + 301 | #7 Yusupov twin, #8 Petrovsky twin |
| 4 | Kind-only | Депо → GASTRO |

После family-flips: **≥24 ч** до редизайна PDP / следующего SEO-шага (Вебмастер).

---

## Три сигнала

### 1. Location + афиша → flip candidate

| slug | вердикт |
|------|---------|
| `osobnyak-polovcova-…` / `osobnyak-myasnikova-…` | **flip** → `CONCERT_HALL` (batch 2) |
| PIER ×2 | **не flip** (причал = location-always) |

### 2. Institution без READY/buy

Museum/theater/hall без offers → **не flip** (Option A). NN club ×10 → **review 2–3 мес.**

### 3. TEMPLE + «музей» в title

0 строк сейчас. Пометить на будущее. ХХС/Исаакий/Василий - LOCKED location.

---

## Batch A rows

| # | slug | действие |
|---|------|----------|
| 1 | Path → Hide | `naprotiv-…` | **переклассифицирован:** twin title+address с `moscow-sovremennik` → HIDDEN+301 (не MEETING_POINT: hub 404) |
| 2 | Path | `rostov-na-donu-teatral-naya-ploschad` | OUTDOOR_LOCATION `/locations` ✅ applied |
| 3 | Flip | `moscow-sovremennik` | THEATER `/venues` |
| 4 | Flip | `saint-petersburg-yusupovskiy-dvorets` | MUSEUM_ART_SPACE `/venues` |
| 5 | Flip | `saint-petersburg-tsirk-chinizelli` | THEATER `/venues` |
| 6 | Flip | `moscow-petrovskiy-putevoy-dvorets` | MUSEUM_ART_SPACE `/venues` |
| 7 | Hide | `yusupovskiy-dvorec-63986bf7a7df` | HIDDEN + alias → #4 |
| 8 | Hide | `petrovskii-putevoi-dvorec-…` | HIDDEN + alias → #6 |
| 9 | Path | `якарелия-…` | path `/venues/…` ✅ applied |
| 10 | Flip | `osobnyak-polovcova-…` | CONCERT_HALL `/venues` |
| 11 | Flip | `osobnyak-myasnikova-…` | CONCERT_HALL `/venues` |
| - | Kind | `moscow-depo-lesnaya` | GASTRO (URL тот же) |

---

## Review (не в этом apply)

- ХХС / Исаакий / Василий - location + chip temple
- Дворцы ~25 - palace-batch (критерий: входной билет как продукт)
- NN CLUB без READY - review 2–3 мес.
- Планетарии / океанариумы - case-by-case
- Кирха Св. Семейства - `CONCERT_HALL` ок

---

## Smoke после apply

1. Path: curl 3 URL (naprotiv `/locations`, rostov `/locations`, якарелия `/venues`)
2. Flips: curl **-L** off → 301/308 на **всех 6** old→new; sitemap grep - slug не в двух префиксах
3. Hides: alias twin slug → канон 301; twin не в sitemap
4. Kind: Депо chip/kind GASTRO, path `/locations`
5. CI invariants 1–4 зелёные

**Не трогать:** шаг 5, редизайн PDP, apps/api (кроме alias sync), nginx, sitemap code.
