-- MUNA Community Intelligence Engine v1
-- Curated, anonymised community knowledge. Completely separate from personal health records.

create table if not exists public.community_knowledge (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  dataset_version text not null,
  knowledge_type text not null,
  title text not null,
  summary text not null,
  priority text not null,
  evidence_layer text not null default 'community',
  evidence_type text,
  confidence text,
  symptoms text[] not null default '{}',
  triggers text[] not null default '{}',
  interventions text[] not null default '{}',
  outcomes text[] not null default '{}',
  conditions text[] not null default '{}',
  quality_of_life text[] not null default '{}',
  red_flags text[] not null default '{}',
  misinformation text[] not null default '{}',
  recommended_response text,
  tags text[] not null default '{}',
  source_note text,
  is_active boolean not null default true,
  raw_record jsonb not null,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_knowledge_priority_check
    check (priority in ('low', 'moderate', 'high', 'critical')),
  constraint community_knowledge_evidence_layer_check
    check (evidence_layer = 'community')
);

create index if not exists community_knowledge_knowledge_type_idx
  on public.community_knowledge (knowledge_type);

create index if not exists community_knowledge_priority_idx
  on public.community_knowledge (priority);

create index if not exists community_knowledge_is_active_idx
  on public.community_knowledge (is_active);

create index if not exists community_knowledge_symptoms_gin_idx
  on public.community_knowledge using gin (symptoms);

create index if not exists community_knowledge_triggers_gin_idx
  on public.community_knowledge using gin (triggers);

create index if not exists community_knowledge_interventions_gin_idx
  on public.community_knowledge using gin (interventions);

create index if not exists community_knowledge_conditions_gin_idx
  on public.community_knowledge using gin (conditions);

create index if not exists community_knowledge_red_flags_gin_idx
  on public.community_knowledge using gin (red_flags);

create index if not exists community_knowledge_tags_gin_idx
  on public.community_knowledge using gin (tags);

alter table public.community_knowledge enable row level security;

-- No SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated roles.
-- Browser clients cannot mutate community knowledge. Server-side retrieval will be added later.
