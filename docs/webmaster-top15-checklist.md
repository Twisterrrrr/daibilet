# Webmaster TOP-15 - чеклист переобхода (SEO.IN2 / SEO.IN3 / SEO.16)

**Обновлено:** 2026-08-30  
**Аудитория:** владелец / маркетолог (ручные клики в кабинетах)  
**Источник URL:** утверждённый launch set SEO.8 + `INDEXNOW_DEPLOY_PATHS` в коде

---

## 0. Prod smoke (агент / ops)

```bash
curl -sS https://daibilet.ru/robots.txt | grep -i sitemap
# Ожидание: Sitemap: https://daibilet.ru/sitemap.xml
```

**Проверено 2026-07-27:** `robots.txt` содержит `Sitemap: https://daibilet.ru/sitemap.xml`.

---

## 1. Добавить sitemap (SEO.IN2)

### Яндекс.Вебмастер

1. Открыть [webmaster.yandex.ru](https://webmaster.yandex.ru/) → сайт `daibilet.ru`.
2. **Индексирование** → **Файлы Sitemap**.
3. Добавить URL: `https://daibilet.ru/sitemap.xml`
4. Дождаться статуса «Обработан» (обычно до 24 ч).

### Google Search Console

1. [search.google.com/search-console](https://search.google.com/search-console) → свойство `daibilet.ru`.
2. **Файлы Sitemap** → ввести `sitemap.xml` → **Отправить**.

---

## 2. TOP-15 URL для переобхода (SEO.IN3)

Приоритет после deploy / крупных SEO-правок. Часть URL может быть `noindex` при &lt; 6 офферов - переобход всё равно полезен после sync.

| # | URL | Тип |
|---|-----|-----|
| 1 | https://daibilet.ru/ | Главная |
| 2 | https://daibilet.ru/events | Хаб афиши |
| 3 | https://daibilet.ru/rechnye-progulki/moscow | Лендинг TOP |
| 4 | https://daibilet.ru/rechnye-progulki/saint-petersburg | Лендинг TOP |
| 5 | https://daibilet.ru/stendap-i-yumor/moscow | Лендинг TOP |
| 6 | https://daibilet.ru/stendap-i-yumor/saint-petersburg | Лендинг TOP |
| 7 | https://daibilet.ru/peshie-ekskursii/moscow | Лендинг TOP |
| 8 | https://daibilet.ru/zagorodnye-ekskursii/saint-petersburg | Лендинг TOP (СПб only) |
| 9 | https://daibilet.ru/vystavki-i-muzei/moscow | Лендинг TOP |
| 10 | https://daibilet.ru/neobychnye-teatry/saint-petersburg | Лендинг TOP |
| 11 | https://daibilet.ru/ekskursii/kazan | Лендинг TOP |
| 12 | https://daibilet.ru/progulki-po-krysham | Лендинг TOP (national) |
| 13 | https://daibilet.ru/podborki/na-vyhodnye/moscow | Intent TOP |
| 14 | https://daibilet.ru/podborki/na-vyhodnye/saint-petersburg | Intent TOP |
| 15 | https://daibilet.ru/cities/moscow | City hub |

Дополнительно (вне TOP-15, но в IndexNow warm): `/cities/kazan`, `/cities/ekaterinburg`, `/blog`, `/contacts`.

---

## 3. Переобход страниц в Яндекс.Вебмастер

Пошагово для каждого URL из таблицы (или пакетом по 10-15 в день):

1. **Индексирование** → **Переобход страниц**.
2. Вставить абсолютный URL (например `https://daibilet.ru/rechnye-progulki/moscow`).
3. Нажать **Добавить**.
4. Повторить для всех 15 URL.
5. Статус смотреть в том же разделе (очередь / обработано).

**Когда запускать:** после `deploy-prod-next`, крупных правок meta/H1/листингов, или раз в 2-4 недели для ядра.

### Google Search Console (опционально)

1. **Проверка URL** (верхняя строка поиска).
2. Вставить URL → **Запросить индексирование**.
3. Лимит ~10-12 URL/день - приоритет TOP-5: главная, `/events`, речные МСК/СПб, стендап МСК.

---

## 4. Статус задач

| Задача | Кто | Статус |
|--------|-----|--------|
| SEO.IN2 sitemap в Вебмастер + GSC | владелец | ✅ 2026-08-07 owner: сделано ранее; нет трафика |
| SEO.IN3 / SEO.16 переобход TOP-15 | владелец | ✅ 2026-08-07 owner: сделано ранее; нет трафика |
| robots.txt → sitemap | код | ✅ |
| IndexNow notify on deploy | код | ✅ SEO.IN1 |

---

## 5. Batch 2 - podborki pilot + city hubs (2026-08-30)

**Контекст:** batch 1 (14 URL, intents Group E) отправлен **2026-08-14** → прошло **~16 дней**. Пилот KGD+SPB locked **2026-08-11** → **~19 дней** (окно 1-2 недели вышло). Перед `SEO.PODBORKI-PILOT-2` (NN+Perm) - проверить индекс пилота-1 (см. §6).

**Не дублировать** из batch 1 (уже «Заявка обработана» 14.08): intents `skoro`, `do-2000`, `segodnya-vecherom`, `na-vyhodnye` × KGD/SPB; `/rechnye-progulki/saint-petersburg`; `/stendap-i-yumor/kaliningrad`; `/saint-petersburg/night-bridges`.

### 5.1 Group C meta (пилот - приоритет)

```
https://daibilet.ru/podborki?city=kaliningrad
https://daibilet.ru/podborki?city=saint-petersburg
```

### 5.2 City hubs - пилот + свежий контент (Aug batch)

Канон СПб: **`/cities/sankt-peterburg`** (не `saint-petersburg` - 308).

```
https://daibilet.ru/cities/kaliningrad
https://daibilet.ru/cities/sankt-peterburg
https://daibilet.ru/cities/moscow
https://daibilet.ru/cities/kazan
https://daibilet.ru/cities/samara
https://daibilet.ru/cities/ekaterinburg
https://daibilet.ru/cities/perm
https://daibilet.ru/cities/nizhny-novgorod
https://daibilet.ru/cities/krasnodar
https://daibilet.ru/cities/krasnoyarsk
https://daibilet.ru/cities/omsk
https://daibilet.ru/cities/ufa
https://daibilet.ru/cities/novosibirsk
https://daibilet.ru/cities/chelyabinsk
https://daibilet.ru/cities/smolensk
https://daibilet.ru/cities/rostov-na-donu
https://daibilet.ru/cities/penza
https://daibilet.ru/cities/tver
```

### 5.3 SeoOverride landings (Stage-1 пилот)

```
https://daibilet.ru/saint-petersburg/night-bridges
https://daibilet.ru/saint-petersburg/spb-yards
https://daibilet.ru/rechnye-progulki/saint-petersburg
https://daibilet.ru/stendap-i-yumor/kaliningrad
https://daibilet.ru/ekskursii/kaliningrad
```

### 5.4 Intent доп. (не в batch 1)

```
https://daibilet.ru/podborki/na-vyhodnye/kaliningrad
https://daibilet.ru/podborki/na-vyhodnye/saint-petersburg
```

### 5.5 Контент после deploy (опционально)

```
https://daibilet.ru/blog/spb-barnyy-peterburg-ryumochnye-spikizi
```

**Лимит:** ~10-15 URL/день в Вебмастере. Порядок: §5.1 → §5.2 (KGD, SPB, MSK) → остальное.

---

## 6. Gate перед PILOT-2 (NN + Perm)

В **Яндекс.Вебмастер** → **Индексирование** → **Страницы в поиске** (или «Проверка ответа сервера»):

| Проверка | URL | Ожидание |
|----------|-----|----------|
| Meta пилот KGD | `/podborki?city=kaliningrad` | Title/Desc из пилота; canonical self `?city=kaliningrad`; **не** склейка с `/cities/kaliningrad` |
| Meta пилот SPB | `/podborki?city=saint-petersburg` | то же; canonical self; **не** склейка с `/cities/sankt-peterburg` |
| Intent E | `/podborki/skoro/kaliningrad` (из batch 1) | HTTP 200; в поиске или «обход выполнен» без ошибки |
| Красный URL | `/podborki/segodnya-vecherom/saint-petersburg` | если статус «ошибка» - открыть карточку; при thin/off-season - ок, не блокер |

Если пилот-1 без склейки с city hubs и intents в индексе - можно стартовать `SEO.PODBORKI-PILOT-2` (код + `PODBORKI_SEO_PILOT_CITY_SLUGS`).

---

## 7. Заметки

- URL/mapping TOP-15 **не менять** без owner approval (SEO LOCK).
- Канон weekend: `/podborki/na-vyhodnye` (не `na-vyhodnyh`).
- Крыши city-path: только `/progulki-po-krysham/saint-petersburg`; national `/progulki-po-krysham` может показывать смотровые из других городов.
- После nightly TC sync (03:20 UTC) thin-страницы могут стать indexable при ≥ 6 офферов - имеет смысл переобход на следующий день.
