-- Hybrid meal analysis metadata columns (optional enrichment; analysis JSON remains source of truth).
-- Safe to run after 20260716210000_meal_analyses.sql. Idempotent.

alter table public.meal_analyses add column if not exists source text;
alter table public.meal_analyses add column if not exists confidence text;
alter table public.meal_analyses add column if not exists rules_version text;
alter table public.meal_analyses add column if not exists result_metadata jsonb;

create index if not exists meal_analyses_source_idx
  on public.meal_analyses (source)
  where source is not null;
