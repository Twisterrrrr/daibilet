# Города вне публичного каталога destinations

Дата: 2026-07-19 (prod DB `213.171.7.16`)

Критерий включения в выборку: distinct `City.title` с событиями **READY** и/или **saleable** (purchaseReady + price≥100 + активные слоты/OPEN_DATE), но город **не** в `standaloneCities` (36 публичных city destinations).

Доминирующая причина (что реально блокирует public **city** listing):
1. `no-saleable` — нет saleable → не попадает в destination buckets
2. `republic-regex` — `cityToRegion` → «Республика …», а `isPublicRegionName` требует `$/(область|край|республика|округ)/` → регион отфильтровывается
3. `cityToRegion→{region}` — свёртка в регион (не standalone city)
4. `allowlist` — saleable есть, но города нет в `standaloneCities`

Всего исключённых городов: **144**

| Причина (сводка) | Кол-во |
|---|---:|
| allowlist | 126 |
| cityToRegion | 8 |
| no-saleable | 8 |
| republic-regex | 1 |
| other | 1 |

| Город | Событий (READY/saleable) | Причина |
|---|---:|---|
| Сортавала | 0/877 | allowlist |
| Раменское | 362/199 | cityToRegion→Московская область |
| Лебяжье | 0/72 | allowlist |
| Чебоксары | 75/62 | allowlist |
| Светлогорск | 68/54 | allowlist |
| Владивосток | 31/31 | allowlist |
| Тольятти | 21/17 | allowlist |
| Липецк | 15/17 | allowlist |
| Новороссийск | 20/12 | cityToRegion→Краснодарский край |
| Королёв | 14/11 | allowlist |
| Хабаровск | 10/10 | allowlist |
| Сургут | 18/9 | allowlist |
| Иркутск | 10/9 | allowlist |
| Барнаул | 9/8 | allowlist |
| Набережные Челны | 9/8 | republic-regex |
| Курган | 8/8 | allowlist |
| Киров (Кировская область) | 3/8 | allowlist |
| Новокузнецк | 19/7 | allowlist |
| Пенза | 7/6 | allowlist |
| Подольск | 7/6 | allowlist |
| Череповец | 6/6 | allowlist |
| Иваново | 4/6 | allowlist |
| Владимир | 12/5 | allowlist |
| Кемерово | 5/5 | allowlist |
| Чита | 5/4 | allowlist |
| Не указан | 4/4 | other:нет primaryCity |
| Улан-Удэ | 4/4 | allowlist |
| Всеволожск | 4/3 | allowlist |
| Воскресенск | 3/3 | allowlist |
| Комсомольск-на-Амуре | 3/3 | cityToRegion→Хабаровский край |
| Магнитогорск | 3/3 | allowlist |
| Нефтекамск | 3/3 | allowlist |
| Саранск | 3/3 | allowlist |
| Стерлитамак | 3/3 | allowlist |
| Тамбов | 3/3 | allowlist |
| Брянск | 3/2 | allowlist |
| Видное | 3/2 | allowlist |
| Ейск | 3/2 | cityToRegion→Краснодарский край |
| Пятигорск | 3/2 | allowlist |
| Чехов (Московская область) | 3/2 | allowlist |
| Альметьевск | 2/2 | allowlist |
| Архангельск | 2/2 | allowlist |
| Батайск | 2/2 | allowlist |
| Батуми | 2/2 | allowlist |
| Белгород | 2/2 | allowlist |
| Бийск | 2/2 | allowlist |
| Благовещенск (Амурская область) | 2/2 | allowlist |
| Бугульма | 2/2 | allowlist |
| Бузулук | 2/2 | allowlist |
| Волгодонск | 2/2 | allowlist |
| Ефремов | 2/2 | allowlist |
| Йошкар-Ола | 2/2 | allowlist |
| Курск | 2/2 | allowlist |
| Мурманск | 2/2 | allowlist |
| Нижний Тагил | 2/2 | allowlist |
| Обнинск | 2/2 | allowlist |
| Рыбинск | 2/2 | allowlist |
| Саров | 2/2 | allowlist |
| Сергиев Посад | 2/2 | allowlist |
| Смоленск | 2/2 | allowlist |
| Сыктывкар | 2/2 | allowlist |
| Уссурийск | 2/2 | allowlist |
| Южно-Сахалинск | 2/2 | allowlist |
| Астрахань | 1/2 | allowlist |
| Мытищи | 3/1 | allowlist |
| Новочеркасск | 3/1 | allowlist |
| Анапа | 2/1 | cityToRegion→Краснодарский край |
| Суздаль | 2/1 | allowlist |
| Анна | 1/1 | allowlist |
| Бабаево | 1/1 | allowlist |
| Балашиха | 1/1 | allowlist |
| Белая-Калитва | 1/1 | allowlist |
| Белебей | 1/1 | allowlist |
| Березники | 1/1 | allowlist |
| Благовещенск (Башкортостан) | 1/1 | allowlist |
| Братск | 1/1 | allowlist |
| Бронницы | 1/1 | allowlist |
| Бутурлиновка | 1/1 | allowlist |
| Великие Луки | 1/1 | allowlist |
| Воткинск | 1/1 | allowlist |
| Выборг | 1/1 | allowlist |
| Геленджик | 1/1 | cityToRegion→Краснодарский край |
| Горбунки | 1/1 | allowlist |
| Грязи | 1/1 | allowlist |
| Данилов | 1/1 | allowlist |
| Дзержинск | 1/1 | allowlist |
| Димитровград | 1/1 | cityToRegion→Ульяновская область |
| Динская | 1/1 | allowlist |
| Дмитров | 1/1 | allowlist |
| Домодедово | 1/1 | allowlist |
| Донецк (Ростовская область) | 1/1 | allowlist |
| Дубна (Московская область) | 1/1 | allowlist |
| Егорьевск | 1/1 | allowlist |
| Завидово | 1/1 | allowlist |
| Зеленоград | 1/1 | allowlist |
| Златоуст | 1/1 | allowlist |
| Калуга | 1/1 | allowlist |
| Каменск-Шахтинский | 1/1 | allowlist |
| Каспийск | 1/1 | allowlist |
| Коломна | 1/1 | cityToRegion→Московская область |
| Кондрово | 1/1 | allowlist |
| Кострома | 1/1 | allowlist |
| Красный Сулин | 1/1 | allowlist |
| Кунгур | 1/1 | allowlist |
| Куровское | 1/1 | allowlist |
| Лазаревское | 1/1 | allowlist |
| Ливны | 1/1 | allowlist |
| Люберцы | 1/1 | allowlist |
| Минеральные Воды | 1/1 | allowlist |
| Нововоронеж | 1/1 | allowlist |
| Новое Девяткино | 1/1 | allowlist |
| Новозыбков | 1/1 | allowlist |
| Октябрьский (Республика Башкортостан) | 1/1 | allowlist |
| Орехово-Зуево | 1/1 | allowlist |
| Отрадное (Ленинградская область) | 1/1 | allowlist |
| Петрово-Дальнее | 1/1 | allowlist |
| Плавск | 1/1 | allowlist |
| Пушкин | 1/1 | allowlist |
| Рамонь | 1/1 | allowlist |
| Семикаракорск | 1/1 | allowlist |
| Серпухов | 1/1 | allowlist |
| Славянск На Кубани | 1/1 | allowlist |
| Соликамск | 1/1 | allowlist |
| Стародуб | 1/1 | allowlist |
| Таруса | 1/1 | allowlist |
| Тобольск | 1/1 | allowlist |
| Туапсе | 1/1 | allowlist |
| Углич | 1/1 | allowlist |
| Узловая | 1/1 | allowlist |
| Ухта | 1/1 | allowlist |
| Фрязино | 1/1 | allowlist |
| Шахты | 1/1 | allowlist |
| Шексна | 1/1 | allowlist |
| Щербинка | 1/1 | allowlist |
| Яранск | 1/1 | allowlist |
| Суровикино | 0/1 | allowlist |
| Зеленоградск | 3/0 | no-saleable |
| Красная Поляна | 2/0 | no-saleable |
| Ачинск | 1/0 | no-saleable |
| Ишим | 1/0 | no-saleable |
| Минусинск | 1/0 | no-saleable |
| Нижневартовск | 1/0 | no-saleable |
| Черногорск | 1/0 | no-saleable |
| Яровое | 1/0 | no-saleable |
