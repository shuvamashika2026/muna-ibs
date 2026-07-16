-- MUNA AI Meal Analysis: persisted results + daily usage quotas.
-- Review and apply manually in Supabase SQL Editor or via supabase db push.

-- ---------------------------------------------------------------------------
-- meal_analyses (one current analysis per meal; upsert on re-analyse)
-- ---------------------------------------------------------------------------

create table if not exists public.meal_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  analysis jsonb not null,
  model_provider text not null default 'deepseek',
  model_name text not null default 'deepseek-v4-flash',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_analyses_meal_id_unique unique (meal_id)
);

create index if not exists meal_analyses_user_updated_idx
  on public.meal_analyses (user_id, updated_at desc);

alter table public.meal_analyses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meal_analyses'
      and policyname = 'Users manage own meal analyses'
  ) then
    create policy "Users manage own meal analyses"
      on public.meal_analyses
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- daily feature usage (chat + meal analysis quotas)
-- ---------------------------------------------------------------------------

create table if not exists public.daily_feature_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('muna_ai_chat', 'meal_analysis')),
  usage_date date not null default (timezone('utc', now()))::date,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, feature, usage_date)
);

alter table public.daily_feature_usage enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_feature_usage'
      and policyname = 'Users read own daily feature usage'
  ) then
    create policy "Users read own daily feature usage"
      on public.daily_feature_usage
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public._consume_daily_feature_request(
  p_feature text,
  p_request_limit integer
)
returns table(allowed boolean, used integer, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (timezone('utc', now()))::date;
  v_count integer;
begin
  if v_user_id is null then
    return query select false, 0, 0;
    return;
  end if;

  if p_request_limit is null or p_request_limit <= 0 then
    return query select false, 0, 0;
    return;
  end if;

  insert into public.daily_feature_usage (user_id, feature, usage_date, request_count)
  values (v_user_id, p_feature, v_today, 1)
  on conflict (user_id, feature, usage_date)
  do update set request_count = public.daily_feature_usage.request_count + 1
  returning request_count into v_count;

  if v_count > p_request_limit then
    return query select false, v_count, 0;
    return;
  end if;

  return query select true, v_count, greatest(p_request_limit - v_count, 0);
end;
$$;

create or replace function public.use_daily_ai_request(request_limit integer default 7)
returns table(allowed boolean, used integer, remaining integer)
language sql
security definer
set search_path = public
as $$
  select * from public._consume_daily_feature_request('muna_ai_chat', request_limit);
$$;

create or replace function public.use_daily_meal_analysis_request(request_limit integer default 10)
returns table(allowed boolean, used integer, remaining integer)
language sql
security definer
set search_path = public
as $$
  select * from public._consume_daily_feature_request('meal_analysis', request_limit);
$$;

revoke all on function public._consume_daily_feature_request(text, integer) from public;
grant execute on function public.use_daily_ai_request(integer) to authenticated;
grant execute on function public.use_daily_meal_analysis_request(integer) to authenticated;
