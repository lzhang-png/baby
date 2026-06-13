-- One-off data fix: replace ALL June 7–8, 2026 logs with the Baby Tracker
-- "report 4" export (the authoritative source for those two days).
--
-- Times below are local America/Los_Angeles (UTC−07:00 in June 2026).
-- Run in Supabase Dashboard → SQL Editor. The DO block is atomic: if anything
-- fails, nothing is committed.
--
-- If you have more than one baby, list them first and hard-code the id:
--   select id, name from public.babies;

do $$
declare
  v_baby uuid;
begin
  -- Resolve the (single) baby. Replace with an explicit id if you have several.
  select id into v_baby from public.babies order by created_at limit 1;
  if v_baby is null then
    raise exception 'No baby found in public.babies';
  end if;

  ---------------------------------------------------------------------------
  -- 1. Delete existing June 7–8 (local) rows
  ---------------------------------------------------------------------------
  delete from public.feed_logs
   where baby_id = v_baby
     and occurred_at >= timestamptz '2026-06-07 00:00:00-07'
     and occurred_at <  timestamptz '2026-06-09 00:00:00-07';

  delete from public.diaper_logs
   where baby_id = v_baby
     and occurred_at >= timestamptz '2026-06-07 00:00:00-07'
     and occurred_at <  timestamptz '2026-06-09 00:00:00-07';

  delete from public.pump_logs
   where baby_id = v_baby
     and occurred_at >= timestamptz '2026-06-07 00:00:00-07'
     and occurred_at <  timestamptz '2026-06-09 00:00:00-07';

  delete from public.sleep_logs
   where baby_id = v_baby
     and started_at >= timestamptz '2026-06-07 00:00:00-07'
     and started_at <  timestamptz '2026-06-09 00:00:00-07';

  ---------------------------------------------------------------------------
  -- 2. Feeds
  ---------------------------------------------------------------------------
  insert into public.feed_logs
    (baby_id, logged_by, occurred_at, feed_type, amount_ml, duration_min, side)
  values
    -- June 7
    (v_baby, null, '2026-06-07 20:43:00-07', 'nursing',   null, 16,   'R'),
    (v_baby, null, '2026-06-07 18:50:00-07', 'formula',     30, null, null),
    (v_baby, null, '2026-06-07 18:39:00-07', 'expressed',   50, null, null),
    (v_baby, null, '2026-06-07 18:07:00-07', 'nursing',   null, 18,   'L'),
    (v_baby, null, '2026-06-07 15:33:00-07', 'formula',     30, null, null),
    (v_baby, null, '2026-06-07 15:01:00-07', 'nursing',   null, 17,   'L'),
    (v_baby, null, '2026-06-07 12:39:00-07', 'formula',     30, null, null),
    (v_baby, null, '2026-06-07 11:58:00-07', 'nursing',   null, 18,   'R'),
    (v_baby, null, '2026-06-07 08:51:00-07', 'formula',    110, null, null),
    (v_baby, null, '2026-06-07 06:07:00-07', 'expressed',   10, null, null),
    (v_baby, null, '2026-06-07 06:02:00-07', 'formula',     45, null, null),
    (v_baby, null, '2026-06-07 05:25:00-07', 'nursing',   null, 9,    'L'),
    (v_baby, null, '2026-06-07 02:06:00-07', 'nursing',   null, 19,   'L'),
    -- June 8
    (v_baby, null, '2026-06-08 21:11:00-07', 'formula',     70, null, null),
    (v_baby, null, '2026-06-08 20:35:00-07', 'nursing',   null, 17,   'L'),
    (v_baby, null, '2026-06-08 18:17:00-07', 'expressed',   60, null, null),
    (v_baby, null, '2026-06-08 17:54:00-07', 'nursing',   null, 15,   'L'),
    (v_baby, null, '2026-06-08 15:15:00-07', 'expressed',   60, null, null),
    (v_baby, null, '2026-06-08 15:00:00-07', 'formula',     50, null, null),
    (v_baby, null, '2026-06-08 12:13:00-07', 'formula',    110, null, null),
    (v_baby, null, '2026-06-08 09:00:00-07', 'expressed',  115, null, null),
    (v_baby, null, '2026-06-08 05:37:00-07', 'nursing',   null, 9,    'R'),
    (v_baby, null, '2026-06-08 04:03:00-07', 'nursing',   null, 6,    'L'),
    (v_baby, null, '2026-06-08 01:38:00-07', 'nursing',   null, 22,   'R');

  ---------------------------------------------------------------------------
  -- 3. Diaper changes
  ---------------------------------------------------------------------------
  insert into public.diaper_logs
    (baby_id, logged_by, occurred_at, diaper_type)
  values
    -- June 7
    (v_baby, null, '2026-06-07 14:18:00-07', 'mixed'),
    (v_baby, null, '2026-06-07 14:04:00-07', 'wet'),
    (v_baby, null, '2026-06-07 12:30:00-07', 'mixed'),
    (v_baby, null, '2026-06-07 08:00:00-07', 'mixed'),
    (v_baby, null, '2026-06-07 05:03:00-07', 'mixed'),
    (v_baby, null, '2026-06-07 02:30:00-07', 'mixed'),
    -- June 8
    (v_baby, null, '2026-06-08 21:35:00-07', 'mixed'),
    (v_baby, null, '2026-06-08 16:48:00-07', 'wet'),
    (v_baby, null, '2026-06-08 16:04:00-07', 'mixed'),
    (v_baby, null, '2026-06-08 15:27:00-07', 'dirty'),
    (v_baby, null, '2026-06-08 12:50:00-07', 'mixed'),
    (v_baby, null, '2026-06-08 10:40:00-07', 'wet'),
    (v_baby, null, '2026-06-08 10:06:00-07', 'mixed'),
    (v_baby, null, '2026-06-08 05:08:00-07', 'mixed'),
    (v_baby, null, '2026-06-08 03:56:00-07', 'mixed'),
    (v_baby, null, '2026-06-08 02:03:00-07', 'mixed');

  ---------------------------------------------------------------------------
  -- 4. Pumping (report gives total ml + per-side durations)
  ---------------------------------------------------------------------------
  insert into public.pump_logs
    (baby_id, logged_by, occurred_at, amount_ml, duration_left_min, duration_right_min)
  values
    -- June 7
    (v_baby, null, '2026-06-07 22:37:00-07',  50,  6,  6),
    (v_baby, null, '2026-06-07 17:13:00-07',  50, 11, 11),
    (v_baby, null, '2026-06-07 05:46:00-07',  30,  9,  9),
    (v_baby, null, '2026-06-07 02:47:00-07',  45,  6,  6),
    -- June 8
    (v_baby, null, '2026-06-08 21:05:00-07',  15,  6,  6),
    (v_baby, null, '2026-06-08 16:26:00-07', 110, 10, 10),
    (v_baby, null, '2026-06-08 11:56:00-07', 100, 20, 20),
    (v_baby, null, '2026-06-08 07:05:00-07',  60, 11, 11);

  ---------------------------------------------------------------------------
  -- 5. Sleep (report lists the START time + duration)
  ---------------------------------------------------------------------------
  insert into public.sleep_logs
    (baby_id, logged_by, started_at, ended_at, duration_min)
  values
    -- June 7
    (v_baby, null, '2026-06-07 21:25:00-07', '2026-06-08 01:36:00-07', 251),
    (v_baby, null, '2026-06-07 08:22:00-07', '2026-06-07 08:50:00-07', 28),
    (v_baby, null, '2026-06-07 02:50:00-07', '2026-06-07 05:02:00-07', 132),
    -- June 8
    (v_baby, null, '2026-06-08 21:43:00-07', '2026-06-09 00:24:00-07', 161),
    (v_baby, null, '2026-06-08 13:16:00-07', '2026-06-08 14:44:00-07', 88),
    (v_baby, null, '2026-06-08 11:28:00-07', '2026-06-08 11:46:00-07', 18),
    (v_baby, null, '2026-06-08 09:05:00-07', '2026-06-08 10:05:00-07', 60),
    (v_baby, null, '2026-06-08 07:10:00-07', '2026-06-08 08:40:00-07', 90),
    (v_baby, null, '2026-06-08 05:48:00-07', '2026-06-08 05:54:00-07', 6),
    (v_baby, null, '2026-06-08 05:23:00-07', '2026-06-08 05:34:00-07', 11),
    (v_baby, null, '2026-06-08 04:10:00-07', '2026-06-08 05:06:00-07', 56),
    (v_baby, null, '2026-06-08 02:24:00-07', '2026-06-08 03:53:00-07', 89);

  raise notice 'June 7–8 logs replaced for baby %', v_baby;
end $$;
