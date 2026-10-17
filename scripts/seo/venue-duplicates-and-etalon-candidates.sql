\pset format aligned
\pset fieldsep ' | '

-- r11 Задача 2: 241 группа / 580 записей — дубли НАЗВАНИЙ.
-- Метод из промпта: группировка по нормализованному названию.
-- Важно: слияние запрещено (r11 L75) — считаем, не удаляем.
create temp table norm as
select
  v."id" as id,
  v."slug" as slug,
  v."title" as title,
  v."kind"::text as kind,
  v."pageStatus"::text as page_status,
  v."isIndexable" as is_indexable,
  c."title" as city,
  length(coalesce(v."description",''))        as desc_len,
  length(coalesce(v."shortDescription",''))   as short_len,
  length(coalesce(v."heroImageUrl",''))       as hero_len,
  coalesce(v."address",'')                   as address,
  coalesce(v."metroStation",'')              as metro,
  coalesce(v."hookFact",'')                  as hook,
  coalesce(v."wayToFind",'')                 as way,
  lower(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(trim(v."title"),
          '[«»"''`„“”‘’]', '', 'g'),
        'ё', 'е', 'g'),
      '[^[:alnum:]]+', ' ', 'g'),
    '\s+', ' ', 'g')) as key
from "Venue" v
left join "City" c on c."id" = v."cityId";

\echo ---- ДУБЛИ: то же название В ТОМ ЖЕ городе (это настоящие дубли) ----
with g as (
  select key, city, count(*) as n,
         count(distinct kind) as kinds,
         string_agg(kind::text, ', ' order by kind) as kind_list,
         min(title) as sample,
         string_agg(page_status, ', ' order by page_status) as status_list
  from norm group by key, city having count(*) > 1
)
select
  (select count(*) from g)                as groups_same_city,
  (select sum(n) from g)                  as records_same_city;

\echo ---- ТОП-20 настоящих дублей (один город, разные записи) ----
with g as (
  select key, city, count(*) as n,
         count(distinct kind) as kinds,
         string_agg(distinct kind::text, ', ' order by kind::text) as kind_list,
         min(title) as sample
  from norm group by key, city having count(*) > 1
)
select n, city, kinds, kind_list, sample
from g order by n desc, city limit 20;

\echo ---- КАНДИДАТЫ В ЭТАЛОНЫ: Панорама (Сочи) полностью ----
select id, slug, title, kind as kind, page_status,
       is_indexable as ii,
       desc_len, short_len, hero_len,
       address, metro, hook, way,
       (select count(*) from "Event" e join "EventSession" s on s."eventId"=e."id"
         where e."venueId"=norm.id and s."startsAt" > now()) as future_sessions
from norm where city = 'Сочи' and key = 'панорама'
order by kind;

\echo ---- ОСТРОВ в СПб: кандидаты ----
select id, slug, title, kind as kind, page_status,
       desc_len, metro,
       (select count(*) from "Event" e join "EventSession" s on s."eventId"=e."id"
         where e."venueId"=norm.id and s."startsAt" > now()) as future_sessions
from norm where city = 'Санкт-Петербург' and key like '%остров%'
order by future_sessions desc limit 8;