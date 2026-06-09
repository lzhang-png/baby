-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)
-- Luca baby tracker: households, auth-linked profiles, activity logs + RLS

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.feed_type as enum (
  'nursing', 'formula', 'expressed', 'donated'
);

create type public.diaper_type as enum ('wet', 'dirty', 'mixed', 'dry');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our family',
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.babies (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  birth_date date not null,
  created_at timestamptz not null default now()
);

create table public.feed_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  logged_by uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null,
  feed_type public.feed_type not null,
  amount_ml int check (amount_ml is null or amount_ml >= 0),
  duration_min int check (duration_min is null or duration_min >= 0),
  side text check (side is null or side in ('L', 'R', 'both')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  logged_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_min int check (duration_min is null or duration_min >= 0),
  notes text,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create table public.diaper_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  logged_by uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null,
  diaper_type public.diaper_type not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.pump_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  logged_by uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null,
  amount_ml int check (amount_ml is null or amount_ml >= 0),
  duration_left_min int check (duration_left_min is null or duration_left_min >= 0),
  duration_right_min int check (duration_right_min is null or duration_right_min >= 0),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index feed_logs_baby_time_idx on public.feed_logs (baby_id, occurred_at desc);
create index sleep_logs_baby_time_idx on public.sleep_logs (baby_id, started_at desc);
create index diaper_logs_baby_time_idx on public.diaper_logs (baby_id, occurred_at desc);
create index pump_logs_baby_time_idx on public.pump_logs (baby_id, occurred_at desc);
create index babies_household_idx on public.babies (household_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.user_in_household(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
  );
$$;

create or replace function public.user_has_baby_access(bid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.babies b
    where b.id = bid
      and public.user_in_household(b.household_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Auth trigger: profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPC: first user creates household + Luca
-- ---------------------------------------------------------------------------
create or replace function public.setup_family(
  p_display_name text default null,
  p_baby_name text default 'Luca',
  p_birth_date date default '2026-04-21'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_household_id uuid;
  v_baby_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.household_members where user_id = v_user_id) then
    raise exception 'Already in a household';
  end if;

  if p_display_name is not null and length(trim(p_display_name)) > 0 then
    update public.profiles
    set display_name = trim(p_display_name)
    where id = v_user_id;
  end if;

  insert into public.households (name)
  values (coalesce(nullif(trim(p_display_name), ''), 'Our family') || ' — Luca')
  returning id into v_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, v_user_id, 'owner');

  insert into public.babies (household_id, name, birth_date)
  values (v_household_id, p_baby_name, p_birth_date)
  returning id into v_baby_id;

  return v_baby_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: family member joins with invite code
-- ---------------------------------------------------------------------------
create or replace function public.join_household(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_household_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.household_members where user_id = v_user_id) then
    raise exception 'Already in a household';
  end if;

  select h.id into v_household_id
  from public.households h
  where upper(trim(h.invite_code)) = upper(trim(p_invite_code));

  if v_household_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, v_user_id, 'member');

  return v_household_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.babies enable row level security;
alter table public.feed_logs enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.diaper_logs enable row level security;
alter table public.pump_logs enable row level security;

-- profiles
create policy "Users read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- households
create policy "Members read household"
  on public.households for select
  using (public.user_in_household(id));

-- household_members
create policy "Members read household roster"
  on public.household_members for select
  using (public.user_in_household(household_id));

-- babies
create policy "Members read babies"
  on public.babies for select
  using (public.user_in_household(household_id));

-- feed_logs
create policy "Members read feeds"
  on public.feed_logs for select using (public.user_has_baby_access(baby_id));
create policy "Members insert feeds"
  on public.feed_logs for insert with check (public.user_has_baby_access(baby_id));
create policy "Members update feeds"
  on public.feed_logs for update using (public.user_has_baby_access(baby_id));
create policy "Members delete feeds"
  on public.feed_logs for delete using (public.user_has_baby_access(baby_id));

-- sleep_logs
create policy "Members read sleep"
  on public.sleep_logs for select using (public.user_has_baby_access(baby_id));
create policy "Members insert sleep"
  on public.sleep_logs for insert with check (public.user_has_baby_access(baby_id));
create policy "Members update sleep"
  on public.sleep_logs for update using (public.user_has_baby_access(baby_id));
create policy "Members delete sleep"
  on public.sleep_logs for delete using (public.user_has_baby_access(baby_id));

-- diaper_logs
create policy "Members read diapers"
  on public.diaper_logs for select using (public.user_has_baby_access(baby_id));
create policy "Members insert diapers"
  on public.diaper_logs for insert with check (public.user_has_baby_access(baby_id));
create policy "Members update diapers"
  on public.diaper_logs for update using (public.user_has_baby_access(baby_id));
create policy "Members delete diapers"
  on public.diaper_logs for delete using (public.user_has_baby_access(baby_id));

-- pump_logs
create policy "Members read pumps"
  on public.pump_logs for select using (public.user_has_baby_access(baby_id));
create policy "Members insert pumps"
  on public.pump_logs for insert with check (public.user_has_baby_access(baby_id));
create policy "Members update pumps"
  on public.pump_logs for update using (public.user_has_baby_access(baby_id));
create policy "Members delete pumps"
  on public.pump_logs for delete using (public.user_has_baby_access(baby_id));

-- ---------------------------------------------------------------------------
-- Realtime: push log changes to all household devices
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.feed_logs;
alter publication supabase_realtime add table public.sleep_logs;
alter publication supabase_realtime add table public.diaper_logs;
alter publication supabase_realtime add table public.pump_logs;

-- ---------------------------------------------------------------------------
-- Grants for RPC
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant execute on function public.setup_family(text, text, date) to authenticated;
grant execute on function public.join_household(text) to authenticated;
