create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  daily_water_goal integer default 8,
  report_day text default 'Sunday',
  created_at timestamptz default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  meal_type text not null,
  foods text not null,
  notes text,
  eaten_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create table if not exists public.symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  symptoms text not null,
  severity integer check (severity between 1 and 10),
  stress_level integer check (stress_level between 1 and 10),
  logged_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create table if not exists public.bowel_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  bristol_type integer not null check (bristol_type between 1 and 7),
  urgency text,
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create table if not exists public.trigger_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  food_name text not null,
  symptom_count integer default 0,
  confidence text default 'Possible',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  cups integer not null check (cups >= 0),
  logged_on date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  hours numeric(4, 2) not null check (hours >= 0 and hours <= 24),
  quality text,
  slept_on date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists public.medication_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  medicine_name text not null,
  reminder_time time not null,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  week_start date not null,
  week_end date not null,
  summary jsonb default '{}'::jsonb,
  clinician_notes text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;
alter table public.meals enable row level security;
alter table public.symptoms enable row level security;
alter table public.bowel_movements enable row level security;
alter table public.trigger_foods enable row level security;
alter table public.water_logs enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.medication_reminders enable row level security;
alter table public.weekly_reports enable row level security;

create policy "Users can manage own profile" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can manage own meals" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own symptoms" on public.symptoms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own bowel movements" on public.bowel_movements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own trigger foods" on public.trigger_foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own water logs" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own sleep logs" on public.sleep_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own medication reminders" on public.medication_reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own weekly reports" on public.weekly_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
