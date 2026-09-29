-- ============================================================================
-- Сколько страниц событий отдают 404, и кого из них спасает soft-redirect
--
-- Дата прогона: 2026-09-29
-- Запускал: Cline, вручную, по запросу owner
-- Зона: prod, только SELECT. Создаёт один view и удаляет его в конце.
--
-- ЧТО ПРОВЕРЯЕТ
--   Три вопроса, на которых стоит решение «410 для прошедших событий, или Б»:
--     1. сколько READY-событий вообще отдают 404;
--     2. сколько из них soft-redirect в public-event.dto.ts уже спасает;
--     3. сколько остаётся hard-404 без пути спасения, и какие они по типу.
--
-- ОЖИДАЕМЫЙ ВЫВОД (снимок на 2026-09-29, два прогона в тот же день)
--   events_total 44345 · sessions_total 48883
--
--   прогон 1 (вечер):  dead_404 19588 · hard_404 2698  (RECURRING 1535, SINGLE 1163)
--   прогон 2 (позже):  dead_404 19606 · hard_404 2805  (RECURRING 1635, SINGLE 1170)
--
--   rescued_by_title_twin_upper_bound 16890 → 16801 (86%)
--
--   Числа УЕЗЖАЮТ: между прогонами за несколько часов +18 hard-404, из них
--   +100 RECURRING. Это и есть та самая вентиляция — страницы умирают непрерывно,
--   и разовая починка сегодня не отменяет завтрашнюю партию. Любая цифра отсюда —
--   снимок момента, а не константа.
--
--   Вывод, который из этого следовал: 410 применять только к SINGLE; RECURRING не
--   трогать — у них, судя по приросту, рассинхрон синка, а не «прошло навсегда».
--   Разбирать причину рассинхрона отдельно, иначе hard-404 будет расти.
--
-- ЧТО ВАЖНО НЕ ЛОМАТЬ
--   Первая версия считала события по `max(startsAt) >= now()` и путала слоты
--   со событиями. Гейт в проде — `hasUpcomingOrOpenSchedule()` в
--   apps/backend/src/catalog-availability.ts, и он применяется к КАЖДОМУ слоту,
--   причём идущий сеанс (endsAt в будущем) считает живым. Наивный
--   `startsAt >= now()` считает его мёртвым и завышает потери почти вдвое
--   (11 867 вместо 19 588). Константы взяты из кода:
--     START_GRACE_MS         = 15 минут
--     RUNNING_SESSION_MAX_MS = 36 часов
--   Если эти константы поменяются — синхронизируй view ниже.
--
-- КАК ЗАПУСКАТЬ
--   Только по явному запросу owner. Ничего не деплоит и не меняет.
--
--   scp docs/seo/probes/dead-events-404.sql daibilet-msk:/tmp/
--   ssh daibilet-msk "sudo -n docker exec -i daibilet-tours-postgres \
--     psql -U daibilet -d daibilet -f - < /tmp/dead-events-404.sql"
--
--   Доступ: ssh daibilet-msk (алиас в ~/.ssh/config), sudo без пароля,
--   контейнер daibilet-tours-postgres, БД daibilet, пользователь daibilet.
--
-- ГРАНИЦА ТОЧНОСТИ
--   rescued_by_title_twin считается по `lower(title)` + город — это ВЕРХНЯЯ
--   граница спасения. Код на самом деле использует eventTitleTokenFingerprint
--   (строже, требует ≥4 токенов), поэтому фактическое спасение ниже, а
--   hard_404 выше 2698. Уточнять fingerprint-срезом перед тем, как опираться
--   на эти числа в решении.
-- ============================================================================

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
