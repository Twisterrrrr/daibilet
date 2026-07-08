# Handoff для нового агента — 2026-07-08

Документ для передачи контекста в **новый чат Cursor**. Читать первым делом после [Project.md](./Project.md).

---

## 1. Почему «всё стало медленно» (чат / агент)

Это **не обязательно** замедление сайта или API. Чаще всего тормозит **сам агент в длинной сессии**:

| Причина | Что происходит |
|--------|----------------|
| **Большое контекстное окно** | В истории накопились: длинные diff, вывод SSH/curl, JSON-аудиты, summary прошлых turn'ов, содержимое `dto.js` и т.д. Каждый новый запрос обрабатывает весь этот объём. |
| **Summarization** | Cursor сжимает старую переписку в summary — детали теряются, но объём всё равно большой; агент иногда «перечитывает» то же с нуля. |
| **Много tool calls** | SSH на prod, build, scp, grep по монолиту — каждый шаг добавляет тысячи токенов в контекст. |
| **Два workspace** | Открыт `f:\coding\DAIBILET`, рабочий код чаще в `f:\coding\daibilet-repo`. Путаница → лишние поиски. |

**Сайт на prod** после последних правок: API venues ~3 ms warm, public static. Если «медленно» в браузере — смотреть Network (не путать с медленным агентом).

**Рекомендация:** новый чат + этот handoff + узкие задачи по одной. Не тащить весь transcript.

---

## 2. Послание для нового чата (скопировать)

```
Проект: Дайбилет (агрегатор билетов на экскурсии/музеи).
Репозиторий: f:\coding\daibilet-repo (GitHub Twisterrrrr/daibilet).
Prod: 213.171.7.16, код /opt/daibilet, public /var/www/daibilet/public/, API systemd daibilet-api :4000.
SSH key: C:/Users/user/.ssh/daibilet_staging_key

Прочитай docs/agent-handoff-2026-07-08.md и docs/Project.md.

Контекст последней сессии:
- Institution-площадки: зоопарк, Новая Третьяковка, Кремль, ВДНХ созданы; Лаврушинский промоутнут в «Третьяковская галерея».
- scripts/create-institution-venues.js — relink 1229 квестов с meeting point (не все ~4700 из аудита).
- Страница события: адрес vs площадка, institution из заголовка (event-venue-context.js).
- Каталог /venues: в списке добавлен город + группировка по городам (InstitutionListRow.tsx).
- 219 venues без описания на проде (было 342 до batch8).
- Коммиты только по явной просьбе пользователя.

Не начинай с нуля — опирайся на handoff.
```

---

## 3. Инфраструктура

| Параметр | Значение |
|----------|----------|
| Prod IP | `213.171.7.16` |
| Код на сервере | `/opt/daibilet` |
| Public static | `/var/www/daibilet/public/` |
| Admin static | `/var/www/daibilet/admin/` |
| API | `systemctl restart daibilet-api`, порт `127.0.0.1:4000` |
| БД | `DATABASE_URL` в `/opt/daibilet/.env` |
| Деплой public | `cd apps/public && npm run build` → `scp/rsync dist/` на сервер |
| Деплой backend | `scp apps/backend/src/*.js` → restart `daibilet-api` |

Подробнее: [deploy-timeweb.md](./deploy-timeweb.md), [public-urls-and-landings.md](./public-urls-and-landings.md).

**Важно:** при `source .env` на сервере бывает warning `admin: command not found` (строка 7) — на скрипты не влияет.

---

## 4. Что сделано в сессии 2026-07-08

### 4.1. Institution-площадки и relink квестов

**Скрипт:** `scripts/create-institution-venues.js`

```bash
cd /opt/daibilet
set -a && source .env && set +a
export NODE_PATH=/opt/daibilet/packages/db/node_modules
node scripts/create-institution-venues.js --dry-run   # проверка
node scripts/create-institution-venues.js             # apply
node scripts/create-institution-venues.js --relink-only
```

**Созданные / использованные venue ID:**

| Учреждение | ID |
|------------|-----|
| Московский зоопарк | `venue_inst_91f213c54f1a3013563d956d` |
| Новая Третьяковская | `venue_inst_8528bec7a5fcff57ae659039` |
| Третьяковская (Лаврушинский) | `venue_6a1fd5158bd71b8ae77e127c` (promote) |
| ГМИИ Пушкина | `venue_672f34b6ebf4808956f1474a` |
| Эрмитаж | `venue_5c9b99e362f03f000c48bd3d` |
| Московский Кремль | `venue_inst_aacfc02ecfbdb00bf2af4b37` |
| ВДНХ | `venue_inst_716732e78bcd8af81f3a0643` |

**Скрытые meeting points:** `venue_6a3d42e95fefd934e2f247b7` (зоопарк), `venue_6a1fd40343c52b894c9c5d53` (Новая Третьяковка).

**Relink:** 1229 событий (зоопарк 441, Новая Третьяковка 315, ГМИИ 315, Эрмитаж 158).

**Баг исправлен:** `findExistingInstitution` — `promoteVenueIds` проверять **до** regex, иначе «Новая Третьяковка» перехватывала promote Лаврушинского.

**Аудит:** `scripts/audit-event-institution-context.mjs` — ~9710 meeting point/адрес; ~4768 с учреждением в заголовке; ~3263 без карточки в БД (до расширения INSTITUTIONS).

### 4.2. Institution из заголовка события (runtime, без relink)

| Файл | Назначение |
|------|------------|
| `apps/backend/src/event-venue-context.js` | Парсинг «квест по …», INSTITUTION_HINTS |
| `apps/backend/src/dto.js` | Поля API: `institutionVenue`, `institutionVenueId`, `institutionVenueSlug` |
| `apps/public/src/lib/event-venue-context.ts` | Frontend fallback |
| `apps/public/src/lib/event-location.ts` | `resolveEventAddressLabel`, `resolveEventVenueDisplayLabel` |

**Regex:** не использовать `\b` с кириллицей; `\w` заменён на `[^\s]*`.

### 4.3. UI страницы события

`apps/public/src/components/EventPage.tsx`:

- QuickInfo: «Адрес» (улица) + «Площадка» (если отличается) + возраст
- Убран блок «Смотрите также»
- Не показывать адрес как название площадки

### 4.4. Описания venues (batch8)

- `scripts/apply-venue-manual-content.js --user-batch8`
- Данные: `scripts/data/venue-content-user-batch8.json`
- Было 342 без описания → **219** без описания
- Список без описания: `scripts/data/venues-without-description-prod.json`

### 4.5. Каталог площадок `/venues`

`apps/public/src/components/InstitutionListRow.tsx`, `VenuesCatalogPage.tsx`:

- **Причина скрытого города в списке:** показывалась только улица (`formatStreetAddress` убирает город из адреса).
- **Исправлено:** `Город · улица` в плоском списке; при «Все города» — **группировка по секциям** (город в заголовке, в строке только адрес).
- Задеплоено на prod 2026-07-08.

---

## 5. Ключевые файлы

```
apps/backend/src/dto.js              # ~8000 строк, catalog + venues + landings
apps/backend/src/event-venue-context.js
apps/backend/src/server.js
apps/public/src/components/EventPage.tsx
apps/public/src/components/VenuesCatalogPage.tsx
apps/public/src/components/InstitutionListRow.tsx
apps/public/src/components/InstitutionCard.tsx
apps/public/src/lib/event-location.ts
scripts/create-institution-venues.js
scripts/audit-event-institution-context.mjs
scripts/apply-venue-manual-content.js
scripts/data/venue-content-user-batch8.json
```

---

## 6. Открытые задачи (приоритет)

| Приоритет | Задача |
|-----------|--------|
| Высокий | Расширить `INSTITUTIONS` в create-institution-venues.js по топу аудита (Исаакий, Петергоф, дворцы СПб…) + `--relink-only` |
| Высокий | Опубликовать новые institution: `pageStatus` CANDIDATE → PUBLISHED |
| Средний | Следующий batch описаний для **219** venues без текста |
| Средний | Исправить kind Эрмитажа (`CONCERT_HALL` → `MUSEUM_ART_SPACE`) |
| Средний | Техдолг: разрезать `dto.js`, catalog snapshot / MV (cold ~8s) |
| Низкий | `/api/public/stats` ~600ms |

Полный трекер: [Tasktracker.md](./Tasktracker.md).

---

## 7. Правила работы с пользователем

- Общение на **русском**
- **Git commit / push** — только по явной просьбе
- Документация в `docs/` — обновлять при архитектурных изменениях
- Workspace может быть `DAIBILET`, код — в **`daibilet-repo`**
- `.cursorrules` в корне DAIBILET может отсутствовать — ориентир `docs/Project.md`

---

## 8. Проверки после деплоя

```bash
# API venue
curl -sS "http://127.0.0.1:4000/api/public/venues/venue_inst_91f213c54f1a3013563d956d" | head -c 500

# Каталог institution
curl -sS "http://127.0.0.1:4000/api/public/venues?limit=5&family=institution"

# Restart API после backend
systemctl restart daibilet-api && systemctl is-active daibilet-api
```

Страницы для smoke: `/venues` (список + город), `/venues/московский-зоопарк-3013563d956d`, событие с квестом по зоопарку/Третьяковке.

---

## 9. Ссылки

- Transcript прошлого чата (детали): `agent-transcripts/1ad6222c-c76d-4a96-9d4a-2245403ed55a/`
- [Diary.md](./Diary.md) — технический дневник
- [qa.md](./qa.md) — открытые вопросы по архитектуре

---

*Создано: 2026-07-08. При следующих крупных сессиях — обновлять этот файл или добавлять `agent-handoff-YYYY-MM-DD.md`.*
