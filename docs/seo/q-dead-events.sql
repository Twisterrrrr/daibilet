#!/usr/bin/env node
/**
 * Сколько событий реально отдают 404, и кого из них спасает soft-redirect.
 *
 * 29.09. Первая версия этого запроса сравнивала события по
 * `max(startsAt) >= now()` и путала два разных вопроса:
 *   - слоты (EventSession) — что именно проходит гейт;
 *   - события (Event)     — у какого события вообще есть живой слот.
 * Гейт в проде живёт в `hasUpcomingOrOpenSchedule()` и применяется к
 * КАЖДОМУ слоту, а идущий сеанс (endsAt в будущем) он считает живым.
 * Наивный `startsAt >= now()` считает его мёртвым и завышает потери.
 *
 * Здесь гейт воспроизведён построчно, константы взяты из кода:
 *   START_GRACE_MS       = 15 минут
 *   RUNNING_SESSION_MAX_MS = 36 часов
 *
 * Запуск (только SELECT, view удаляется в конце):
 *   scp q-dead-events.sql daibilet-msk:/tmp/
 *   ssh daibilet-msk "sudo -n docker exec -i daibilet-tours-postgres \
 *     psql -U daibilet -d daibilet -f - < /tmp/q-dead-events.sql"
 */
create or replace view v_saleable_session as
select
  s."eventId",
  s.id            as session_id,
  s."startsAt",
  s."endsAt",
  s."sourceStatus",
  e.kind::text    as event_kind,
  e.status::text  as event_status,
  (
    lower(coalesce(s."sourceStatus",'')) = 'widget'
    or e.kind::text = 'OPEN_DATE'
    or lower(coalesce(s."sourceStatus",'')) = 'open_date'
    or (s."startsAt" >= now() - interval '15 minutes')
    or (
      s."startsAt" < now()
      and s."endsAt" >= now()
      and (
        (s."endsAt" - s."startsAt") <= interval '36 hours'
        or e.kind::text in ('RECURRING','SERIES')
      )
    )
  ) as session_is_saleable
from "EventSession" s
join "Event" e on e.id = s."eventId"
where s."isActive" = true
  and s."cancelledAt" is null
  and e.status = 'READY'
  and lower(coalesce(s."sourceStatus",'')) not in
      ('widget_blocked','paused','suspended','stopped','cancelled');

\echo '=== 1. Sanity: sessions vs events (do not confuse the two) ==='
select
  (select count(distinct "eventId") from "EventSession" s
     join "Event" e on e.id = s."eventId"
   where s."isActive" and s."cancelledAt" is null and e.status='READY') as events_total,
  (select count(*) from "EventSession" s
     join "Event" e on e.id = s."eventId"
   where s."isActive" and s."cancelledAt" is null and e.status='READY') as sessions_total,
  (select count(*) from v_saleable_session) as saleable_sessions,
  (select count(distinct "eventId") from v_saleable_session where session_is_saleable)
    as events_with_saleable_session;

\echo '=== 2. THE ANSWER: events whose page 404s because sessionRows[0] is absent ==='
with ev as (
  select e.id, e.slug, e."primaryCityId", e.title, e."isIndexable", e.kind::text as kind
  from "Event" e where e.status = 'READY'
)
select
  count(*) filter (where not exists (
      select 1 from v_saleable_session v where v."eventId" = ev.id and v.session_is_saleable
  )) as dead_404,
  count(*) filter (where exists (
      select 1 from v_saleable_session v where v."eventId" = ev.id and v.session_is_saleable
  )) as alive_200
from ev;

\echo '=== 3. Dead 404 split by rescue path (soft-redirect already in code) ==='
with ev as (
  select e.id, e.slug, e."primaryCityId", e.title, o."mergeGroupKey"
  from "Event" e
  left join "EventOverride" o on o."eventId" = e.id
  where e.status = 'READY'
),
dead as (
  select ev.* from ev where not exists (
    select 1 from v_saleable_session v where v."eventId" = ev.id and v.session_is_saleable
  )
),
live as (
  select ev.* from ev where exists (
    select 1 from v_saleable_session v where v."eventId" = ev.id and v.session_is_saleable
  )
)
select
  (select count(*) from dead) as dead_total,
  (select count(*) from dead d where exists (
     select 1 from live l where l."primaryCityId" = d."primaryCityId"
       and lower(l.title) = lower(d.title)))  as rescued_by_title_twin_upper_bound,
  (select count(*) from dead d where not exists (
     select 1 from live l where l."primaryCityId" = d."primaryCityId"
       and lower(l.title) = lower(d.title))
   and not exists (
     select 1 from live l where d."mergeGroupKey" is not null
       and l."mergeGroupKey" = d."mergeGroupKey")) as hard_404_no_redirect;

\echo '=== 4. Hard-404: indexable? by kind? ==='
with ev as (
  select e.id, e.slug, e.title, e."primaryCityId", e.kind::text as kind,
         coalesce(e."isIndexable", true) as idx, o."mergeGroupKey"
  from "Event" e
  left join "EventOverride" o on o."eventId" = e.id
  where e.status = 'READY'
),
dead as (select ev.* from ev where not exists (
    select 1 from v_saleable_session v where v."eventId" = ev.id and v.session_is_saleable)),
live as (select ev.* from ev where exists (
    select 1 from v_saleable_session v where v."eventId" = ev.id and v.session_is_saleable))
select kind, idx, count(*) as hard_404
from dead d
where not exists (select 1 from live l where l."primaryCityId" = d."primaryCityId" and lower(l.title) = lower(d.title))
  and not exists (select 1 from live l where d."mergeGroupKey" is not null and l."mergeGroupKey" = d."mergeGroupKey")
group by kind, idx
order by hard_404 desc;

-- Прод не оставляем за собой: view — единственный объект, созданный на сервере.
drop view if exists v_saleable_session;
