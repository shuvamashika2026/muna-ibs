-- MUNA Experiment Mode Version 1
-- Structured self-tracking trials with daily check-ins (educational only, not diagnosis).

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_label text not null,
  target_type text not null,
  hypothesis text,
  start_date date not null,
  duration_days integer not null,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiments_target_type_check
    check (target_type in ('food_reduction', 'food_reintroduction', 'habit')),
  constraint experiments_duration_days_check
    check (duration_days in (3, 5, 7)),
  constraint experiments_status_check
    check (status in ('draft', 'active', 'completed', 'stopped'))
);

create table if not exists public.experiment_checkins (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  adhered boolean,
  symptom_severity integer,
  bloating_severity integer,
  stress_level integer,
  notes text,
  created_at timestamptz not null default now(),
  constraint experiment_checkins_symptom_severity_check
    check (symptom_severity is null or (symptom_severity between 0 and 10)),
  constraint experiment_checkins_bloating_severity_check
    check (bloating_severity is null or (bloating_severity between 0 and 10)),
  constraint experiment_checkins_stress_level_check
    check (stress_level is null or (stress_level between 0 and 10)),
  constraint experiment_checkins_experiment_date_unique
    unique (experiment_id, checkin_date)
);

create index if not exists experiments_user_id_status_idx
  on public.experiments (user_id, status);

create index if not exists experiments_user_id_start_date_idx
  on public.experiments (user_id, start_date);

create index if not exists experiment_checkins_experiment_id_checkin_date_idx
  on public.experiment_checkins (experiment_id, checkin_date);

create index if not exists experiment_checkins_user_id_checkin_date_idx
  on public.experiment_checkins (user_id, checkin_date);

alter table public.experiments enable row level security;
alter table public.experiment_checkins enable row level security;

create policy "Users can manage own experiments" on public.experiments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own experiment checkins" on public.experiment_checkins
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.experiments e
      where e.id = experiment_id
        and e.user_id = auth.uid()
    )
  );
