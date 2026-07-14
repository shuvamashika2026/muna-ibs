-- MUNA Verified Scientific Guidance v1
-- Curated official-source summaries. Separate from personal health data and community knowledge.

create table if not exists public.verified_scientific_guidance (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  title text not null,
  source_organisation text not null,
  source_type text not null,
  published_on date,
  last_reviewed_on date,
  topic text not null,
  evidence_type text not null,
  summary text not null,
  recommendation text,
  contraindications text[] not null default '{}',
  red_flags text[] not null default '{}',
  citation_url text not null,
  citation_title text not null,
  review_status text not null default 'draft',
  reviewer_note text,
  version text not null,
  is_active boolean not null default true,
  raw_record jsonb not null,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_scientific_guidance_review_status_check
    check (review_status in ('draft', 'reviewed', 'approved')),
  constraint verified_scientific_guidance_evidence_type_check
    check (evidence_type in ('guideline', 'official_patient_guidance', 'university_clinical_guidance', 'consensus'))
);

create index if not exists verified_scientific_guidance_external_id_idx
  on public.verified_scientific_guidance (external_id);

create index if not exists verified_scientific_guidance_source_organisation_idx
  on public.verified_scientific_guidance (source_organisation);

create index if not exists verified_scientific_guidance_topic_idx
  on public.verified_scientific_guidance (topic);

create index if not exists verified_scientific_guidance_review_status_idx
  on public.verified_scientific_guidance (review_status);

create index if not exists verified_scientific_guidance_is_active_idx
  on public.verified_scientific_guidance (is_active);

create index if not exists verified_scientific_guidance_contraindications_gin_idx
  on public.verified_scientific_guidance using gin (contraindications);

create index if not exists verified_scientific_guidance_red_flags_gin_idx
  on public.verified_scientific_guidance using gin (red_flags);

alter table public.verified_scientific_guidance enable row level security;

-- No SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated roles.
-- Browser clients cannot mutate verified guidance. Server-side retrieval will be added later.
