-- Persistent personal memory for MUNA AI
create table if not exists public.user_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  memory_json jsonb not null default '{}'::jsonb,
  confidence_level text not null default 'Low' check (confidence_level in ('Low', 'Moderate', 'Higher')),
  data_days integer not null default 0 check (data_days >= 0),
  last_updated timestamptz not null default now(),
  version integer not null default 1 check (version >= 1)
);

create index if not exists user_memory_last_updated_idx
  on public.user_memory (last_updated desc);

alter table public.user_memory enable row level security;

create policy "Users can manage own memory" on public.user_memory
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
