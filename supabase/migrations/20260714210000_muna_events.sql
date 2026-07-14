-- MUNA Timeline Intelligence (MTI) v1 storage
-- Derived timeline events from MIE insights only. No raw health records.

create table if not exists public.muna_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  event_type text not null,
  title text not null,
  summary text not null,
  confidence text not null,
  linked_insight_key text not null,
  supporting_event_ids jsonb not null default '[]'::jsonb,
  status text not null,
  generated_at timestamptz not null,
  expires_at timestamptz not null,
  source_version text not null default 'mti-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint muna_events_type_check
    check (event_type in (
      'food_pattern',
      'hydration_pattern',
      'sleep_pattern',
      'stress_pattern',
      'bowel_pattern',
      'symptom_change',
      'experiment_started',
      'experiment_completed',
      'experiment_updated',
      'overall_improvement',
      'overall_worsening',
      'tracking_milestone',
      'weekly_summary',
      'monthly_summary'
    )),
  constraint muna_events_confidence_check
    check (confidence in ('higher', 'moderate', 'limited', 'unavailable')),
  constraint muna_events_status_check
    check (status in ('active', 'superseded', 'stale')),
  constraint muna_events_linked_insight_key_check
    check (char_length(linked_insight_key) > 0)
);

create unique index if not exists muna_events_user_key_current_unique
  on public.muna_events (user_id, event_key, source_version)
  where status = 'active';

create index if not exists muna_events_user_id_status_idx
  on public.muna_events (user_id, status);

create index if not exists muna_events_user_id_type_idx
  on public.muna_events (user_id, event_type);

create index if not exists muna_events_user_id_generated_at_idx
  on public.muna_events (user_id, generated_at desc);

create index if not exists muna_events_expires_at_idx
  on public.muna_events (expires_at);

create index if not exists muna_events_event_key_idx
  on public.muna_events (event_key);

create index if not exists muna_events_linked_insight_key_idx
  on public.muna_events (linked_insight_key);

alter table public.muna_events enable row level security;

create policy "Users can read own timeline events" on public.muna_events
  for select
  using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for authenticated or anon clients.
-- Timeline generation and persistence are server-side only via service role.
