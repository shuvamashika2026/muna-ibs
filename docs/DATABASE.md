# MUNA IBS — Database Reference

**Last updated:** 14 July 2026  
**Related docs:** [Architecture](./MUNA_ARCHITECTURE.md) · [Security](./SECURITY.md)

This document describes tables defined in `supabase/schema.sql` and `supabase/migrations/`. It does **not** list secret environment variable values.

---

## Summary by category

| Category | Tables |
|----------|--------|
| Personal health | `users`, `meals`, `symptoms`, `bowel_movements`, `water_logs`, `sleep_logs`, `medication_reminders`, `trigger_foods`, `weekly_reports` |
| User memory | `user_memory` |
| Experiments | `experiments`, `experiment_checkins` |
| Community knowledge | `community_knowledge` |
| Verified scientific guidance | `verified_scientific_guidance` |
| MIE insights | `muna_insights` |
| MTI timeline | `muna_events` |

**Auth parent:** All user-owned tables reference `auth.users(id)` with `ON DELETE CASCADE` unless noted.

---

## Personal health tables

### `public.users`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Extended profile row keyed to auth user |
| **Important columns** | `id` (PK, FK → `auth.users`), `full_name`, `daily_water_goal`, `report_day` |
| **Personal data** | Yes |
| **RLS** | Enabled |
| **Client permissions** | Full CRUD own row (`auth.uid() = id`) |
| **Server-only** | No |
| **History** | Single row per user; updates in place |

**Source:** `supabase/schema.sql`

---

### `public.meals`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Meal logs |
| **Important columns** | `user_id`, `meal_type`, `foods` (text), `notes`, `eaten_at` |
| **Personal data** | Yes |
| **RLS** | Enabled — manage own rows |
| **Client permissions** | Insert/select/update/delete own |
| **Server-only** | No |
| **History** | Append-oriented logging |

---

### `public.symptoms`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Symptom logs |
| **Important columns** | `user_id`, `symptoms` (text), `severity`, `stress_level`, `logged_at` |
| **Personal data** | Yes |
| **RLS** | Enabled — manage own rows |
| **Client permissions** | Full own CRUD |
| **Note** | Application code also reads optional fields such as `bloating_level` / `pain_level` when present; baseline schema lists `severity` and `stress_level` only — see [gaps](#documentation-gaps) |

---

### `public.bowel_movements`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Bristol stool and bowel notes |
| **Important columns** | `user_id`, `bristol_type`, `urgency`, `notes`, `logged_at` |
| **Personal data** | Yes |
| **RLS** | Enabled — manage own rows |

---

### `public.water_logs`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Hydration tracking |
| **Important columns** | `user_id`, `cups`, `logged_on` |
| **Personal data** | Yes |
| **RLS** | Enabled — manage own rows |
| **Note** | MIE/MIOS code also accepts `amount_ml` / `liters` when columns exist in live DB |

---

### `public.sleep_logs`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Sleep duration and quality |
| **Important columns** | `user_id`, `hours`, `quality`, `slept_on` |
| **Personal data** | Yes |
| **RLS** | Enabled — manage own rows |

---

### `public.medication_reminders`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Medication reminder configuration (not dosing advice) |
| **Important columns** | `user_id`, `medicine_name`, `reminder_time`, `is_active` |
| **Personal data** | Yes |
| **RLS** | Enabled — manage own rows |

---

### `public.trigger_foods`

| Aspect | Detail |
|--------|--------|
| **Purpose** | User-marked or derived trigger food notes |
| **Important columns** | `user_id`, `food_name`, `symptom_count`, `confidence`, `notes` |
| **Personal data** | Yes |
| **RLS** | Enabled — manage own rows |

---

### `public.weekly_reports`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Stored weekly summary payloads |
| **Important columns** | `user_id`, `week_start`, `week_end`, `summary` (jsonb), `clinician_notes` |
| **Personal data** | Yes |
| **RLS** | Enabled — manage own rows |
| **History** | Multiple rows per user possible |

---

## User memory

### `public.user_memory`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Persistent Personal Memory profile for AI |
| **Important columns** | `user_id` (PK), `memory_json`, `confidence_level`, `data_days`, `version`, `last_updated` |
| **Personal data** | Yes (derived summaries, not raw log dumps) |
| **RLS** | Enabled — manage own row |
| **Client permissions** | Full own CRUD |
| **Server-only writes** | Also updated from `/api/muna-ai` server path |
| **History** | Upsert single row per user |

**Source:** `supabase/migrations/20260712120000_user_memory.sql`

---

## Experiments

### `public.experiments`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Structured self-observation trials |
| **Important columns** | `user_id`, `target_label`, `target_type`, `hypothesis`, `start_date`, `duration_days`, `status`, `notes` |
| **Personal data** | Yes |
| **RLS** | Enabled — manage own rows |
| **Client permissions** | Full own CRUD via authenticated client / API |
| **History** | Status transitions (`draft`, `active`, `completed`, `stopped`); rows retained |

---

### `public.experiment_checkins`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Daily experiment check-ins |
| **Important columns** | `experiment_id`, `user_id`, `checkin_date`, `adhered`, `symptom_severity`, `bloating_severity`, `stress_level`, `notes` |
| **Personal data** | Yes |
| **RLS** | Enabled — own rows; FK must match own experiment |
| **History** | Unique per `(experiment_id, checkin_date)`; upserted |

**Source:** `supabase/migrations/20260712130000_experiments.sql`

---

## Community knowledge

### `public.community_knowledge`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Curated anonymised community knowledge records |
| **Important columns** | `external_id`, `dataset_version`, `knowledge_type`, `title`, `summary`, `priority`, `symptoms[]`, `triggers[]`, `red_flags[]`, `raw_record`, `is_active` |
| **Personal data** | **No** (community-level, anonymised) |
| **RLS** | Enabled |
| **Client permissions** | **None** (no SELECT/INSERT/UPDATE/DELETE policies for anon/authenticated) |
| **Server-only** | Read via service role in `community-knowledge/retrieval.ts` |
| **History** | Import updates; `is_active` flag |

**Source:** `supabase/migrations/20260714150000_community_knowledge.sql`

---

## Verified scientific guidance

### `public.verified_scientific_guidance`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Official-source IBS guidance summaries with review workflow |
| **Important columns** | `external_id`, `title`, `source_organisation`, `topic`, `evidence_type`, `summary`, `recommendation`, `citation_url`, `review_status`, `is_active`, `raw_record` |
| **Personal data** | **No** |
| **RLS** | Enabled |
| **Client permissions** | **None** |
| **Server-only** | Intended read via service role; **live MIOS retrieval not wired** |
| **Approval** | Only `review_status = 'approved'` should be used in AI when retrieval is enabled |
| **History** | Versioned imports; draft rows must not reach users |

**Source:** `supabase/migrations/20260714180000_verified_scientific_guidance.sql`

---

## MIE insights

### `public.muna_insights`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Server-generated derived insights from logs (MIE v1) |
| **Important columns** | `user_id`, `insight_key`, `insight_type`, `title`, `summary`, `confidence`, `evidence_count`, `observation_window_days`, `supporting_evidence` (jsonb), `limitations` (jsonb), `status`, `generated_at`, `expires_at`, `source_version` |
| **Personal data** | Yes (derived summaries only — **no raw meal/symptom rows**) |
| **RLS** | Enabled |
| **Client permissions** | **SELECT own rows only** |
| **Server-only** | INSERT/UPDATE (generation, supersede, stale marking) via service role |
| **Duplicate rule** | Partial unique index on `(user_id, insight_key, source_version)` where status ∈ `active`, `insufficient_data`, `blocked` |
| **History** | Superseded rows retained; expired actives marked `stale`; never hard-deleted by engine |

**Source:** `supabase/migrations/20260714200000_muna_insights.sql`

---

## MTI timeline

### `public.muna_events`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Timeline events derived from MIE insights (MTI v1) |
| **Important columns** | `user_id`, `event_key`, `event_type`, `title`, `summary`, `confidence`, `linked_insight_key`, `supporting_event_ids` (jsonb), `status`, `generated_at`, `expires_at`, `source_version` |
| **Personal data** | Yes (derived narrative, linked to insight keys) |
| **RLS** | Enabled |
| **Client permissions** | **SELECT own rows only** |
| **Server-only** | Writes via service role |
| **Duplicate rule** | Partial unique on `(user_id, event_key, source_version)` where `status = 'active'` |
| **History** | Supersede-only updates; no deletes |

**Source:** `supabase/migrations/20260714210000_muna_events.sql`

---

## Tables referenced in code but not in repo migrations

The following are queried in application code but **not** defined in `supabase/schema.sql` or tracked migrations:

| Table | Used by | Gap |
|-------|---------|-----|
| `profiles` | `personal-health.ts`, `fetch-input.ts`, `muna-ai/route.ts` | May exist only in deployed DB; not in repo schema |
| `food_items` | `src/lib/food.ts`, food-intelligence page | Reference / search table; no migration in repo |

Document these as **environment-dependent** until migrations are added.

---

## Documentation gaps

1. **`profiles` vs `users`:** Code reads `profiles` for goals/preferences; baseline schema defines `users` only.  
2. **Symptom column names:** Code tolerates multiple field names; baseline schema is narrower.  
3. **Migration apply state:** Migrations exist in repo; production DB may lag.  
4. **`food_items`:** Used for food search; schema not versioned here.  
5. **MTI / MIE migrations:** Storage helpers exist; timeline API and automatic MTI on insight POST are not implemented.

See [MUNA_ARCHITECTURE.md](./MUNA_ARCHITECTURE.md) for system context.
