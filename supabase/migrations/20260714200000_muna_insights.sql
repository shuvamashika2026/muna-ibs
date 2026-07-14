-- MUNA Insight Engine (MIE) v1 storage
-- Server-generated derived insights only. No raw health records.

create table if not exists public.muna_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_key text not null,
  insight_type text not null,
  title text not null,
  summary text not null,
  confidence text not null,
  evidence_count integer not null default 0,
  observation_window_days integer not null,
  supporting_evidence jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null,
  is_actionable boolean not null default false,
  suggested_next_step text,
  source_version text not null default 'mie-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint muna_insights_type_check
    check (insight_type in ('food', 'hydration', 'sleep', 'stress', 'bowel', 'experiment', 'overall')),
  constraint muna_insights_confidence_check
    check (confidence in ('higher', 'moderate', 'limited', 'unavailable')),
  constraint muna_insights_status_check
    check (status in ('active', 'insufficient_data', 'blocked', 'stale', 'superseded')),
  constraint muna_insights_evidence_count_check
    check (evidence_count >= 0),
  constraint muna_insights_observation_window_days_check
    check (observation_window_days > 0)
);

create unique index if not exists muna_insights_user_key_current_unique
  on public.muna_insights (user_id, insight_key, source_version)
  where status in ('active', 'insufficient_data', 'blocked');

create index if not exists muna_insights_user_id_status_idx
  on public.muna_insights (user_id, status);

create index if not exists muna_insights_user_id_type_idx
  on public.muna_insights (user_id, insight_type);

create index if not exists muna_insights_user_id_generated_at_idx
  on public.muna_insights (user_id, generated_at desc);

create index if not exists muna_insights_expires_at_idx
  on public.muna_insights (expires_at);

create index if not exists muna_insights_insight_key_idx
  on public.muna_insights (insight_key);

alter table public.muna_insights enable row level security;

create policy "Users can read own insights" on public.muna_insights
  for select
  using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for authenticated or anon clients.
-- Insight generation and persistence are server-side only via service role.
