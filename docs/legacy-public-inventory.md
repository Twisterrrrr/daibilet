# Legacy public inventory

Дата: 2026-06-20.

Источник: `Twisterrrrr/daibilet_tickets`, ветки `main` и `staging`. Для запуска новой версии используем старый public как библиотеку проверенных UX-шаблонов, но не переносим тяжелый checkout, supplier-flow и финансовый контур.

## Что уже найдено в старом public

| Зона | Старые файлы | Что забираем в MVP |
| --- | --- | --- |
| Root layout | [`packages/frontend/src/app/layout.tsx`](https://github.com/Twisterrrrr/daibilet_tickets/blob/main/packages/frontend/src/app/layout.tsx) | Header/Footer, cookie consent, chat widget, Yandex Metrika, подключение Ticketscloud и Teplohod widget scripts. |
| Главная | [`packages/frontend/src/app/page.tsx`](https://github.com/Twisterrrrr/daibilet_tickets/blob/main/packages/frontend/src/app/page.tsx) | Hero-текст со статистикой, поиск города, популярные/ближайшие события, городская сетка, категории/теги, CTA к каталогу. CTA "Стать партнером" в hero не возвращаем без отдельного согласования. |
| Footer | [`packages/frontend/src/components/layout/Footer.tsx`](https://github.com/Twisterrrrr/daibilet_tickets/blob/main/packages/frontend/src/components/layout/Footer.tsx) | Полный footer: каталог, города, компания, контакты, реквизиты, ссылки на legal/privacy/offer. |
| Каталог | `packages/frontend/src/app/events/EventsPageClient.tsx` | Верхние фильтры, быстрые даты, сортировка, город, цена, grid/list, пагинация 20/50/100, группировка мультисобытий. |
| Карточка события | [`packages/frontend/src/components/ui/EventCard.tsx`](https://github.com/Twisterrrrr/daibilet_tickets/blob/main/packages/frontend/src/components/ui/EventCard.tsx) | Богатая карточка: фото, бейджи, город, рейтинг, ближайшие слоты, цена, избранное как later. |
| Страница события | `packages/frontend/src/components/events/EventPageView.tsx` | Hero без простыни описания, блок покупки, категории билетов и цены, 5 ближайших сеансов, JSON-LD, ссылки на город/площадку. Внутреннюю корзину не переносим. |
| Города | `packages/frontend/src/app/cities/page.tsx`, `packages/frontend/src/app/cities/[slug]/page.tsx` | "Страница города" с hero, подборками, категориями, площадками, советами, похожими направлениями и JSON-LD. |
| Правовые страницы | `legal`, `privacy`, `offer`, `help`, `requisites` | Сохраняем страницы и реквизиты, но адаптируем формулировки под widget-only checkout. |
| Промо-блоки | [`packages/frontend/src/components/ui/PromoBlock.tsx`](https://github.com/Twisterrrrr/daibilet_tickets/blob/main/packages/frontend/src/components/ui/PromoBlock.tsx) | Используем позже для подборок/коллекций, если не мешает запуску каталога. |

## Реквизиты и контакты из старого сайта

- Телефон: `+7 911 988-61-20`.
- Email: `info@daibilet.ru`.
- ИП: `Бутин Василий Александрович`.
- ИНН: `781125361276`.
- ОГРНИП: `306784709000338`.
- Адрес: `193091, Россия, г. Санкт-Петербург, наб. Октябрьская, д. 24, корп. 1, кв. 28`.
- Банк: `АО "ТБанк"`.
- Расчетный счет: `40802810800005208699`.
- БИК: `044525974`.
- Корреспондентский счет: `30101810145250000974`.

## Что переносим до первой продажи

1. Footer и базовые страницы доверия: `legal`, `privacy`, `help`, `requisites`, `contacts/about` при наличии контента.
2. Public catalog UX из старого `EventsPageClient`: фильтры сверху, быстрые даты, сортировка, пагинация, grouped cards.
3. Event detail из старого `EventPageView`: категории билетов/цены, 5 ближайших сеансов, город/площадка как SEO-ссылки, виджеты TC/Teplohod.
4. City page и landing page по старой логике content hub: сильный hero, советы, блоки контента, подборки, FAQ/related links, не сухая выдача.
5. Header/Footer navigation audit: все ссылки либо работают, либо временно ведут на честную страницу "в разработке" без моков.

## Что адаптируем, а не копируем

- Старые тексты про оплату через сайт, YooKassa/TBank checkout, внутреннюю корзину и возвраты через нас меняем на модель: оплата и чек у билетной системы/поставщика, Дайбилет хранит факт покупки и статус.
- Старый `AddToCartButton`, cart provider и внутренний checkout не переносим в MVP продаж.
- Partner/supplier кабинет, ЭДО, финансы, сложные возвраты и промо-DSL оставляем после запуска.
- Favorites/account можно оставить как later, но не должен блокировать покупку через виджет.

## Деплой без потери старой версии

1. Пушим новый легкий проект в `Twisterrrrr/daibilet`.
2. Поднимаем staging на сервере Timeweb Cloud, не затирая старую публикацию.
3. Проверяем public/admin/API/sync/widget smoke на staging.
4. Только после smoke переключаем домен или nginx upstream.
5. Перед переключением сохраняем архив старой версии и список страниц, которые должны получить 301/канонические URL.

