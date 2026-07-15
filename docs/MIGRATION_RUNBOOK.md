# MUNA IBS — Migration Runbook

**Last updated:** 15 July 2026  
**Purpose:** Safe application and verification of Supabase migrations for closed beta  
**Warning:** Apply migrations in a **staging** Supabase project first. Do **not** run destructive SQL against production without a verified backup.

---

## Required migration order

Apply migrations in **timestamp order** (oldest first):

| Order | File | Purpose |
|------:|------|---------|
| 0 | `supabase/schema.sql` | Baseline health tables (only on **new** empty projects) |
| 1 | `20260712120000_user_memory.sql` | Personal memory storage |
| 2 | `20260712130000_experiments.sql` | Experiment mode tables |
| 3 | `20260714150000_community_knowledge.sql` | Community knowledge corpus |
| 4 | `20260714180000_verified_scientific_guidance.sql` | Verified guidance corpus |
| 5 | `20260714200000_muna_insights.sql` | MIE insight storage |
| 6 | `20260714210000_muna_events.sql` | MTI timeline event storage |
| 7 | `20260714220000_schema_critical_alignment.sql` | **Critical beta alignment** — users profile columns, conditional `profiles` view, `food_items`, symptom extensions |

**Existing production databases** that already ran an older baseline should **skip** re-applying `schema.sql` and run only migrations **1–7** that are not yet recorded.

---

## Migration 7 — Preflight checks (run before applying)

Open Supabase **SQL Editor** and run the queries below **before** pasting migration 7. They are also embedded as comments at the top of `20260714220000_schema_critical_alignment.sql`.

### 1) Object types

```sql
SELECT c.relname AS object_name,
       CASE c.relkind
         WHEN 'r' THEN 'table'
         WHEN 'v' THEN 'view'
         WHEN 'm' THEN 'materialized view'
         ELSE c.relkind::text
       END AS object_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('profiles', 'food_items', 'symptoms', 'users')
ORDER BY c.relname;
```

| `profiles` result | What migration 7 does |
|-------------------|------------------------|
| **absent** | Creates `public.profiles` as a **view** over `public.users` |
| **`view`** | Replaces view definition (`CREATE OR REPLACE VIEW`) |
| **`table`** | **Preserves** the table unchanged — no drop, no replace |

### 2) Existing `users` profile columns

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN (
    'age', 'date_of_birth', 'gender', 'country', 'ibs_type', 'diagnosis_year',
    'height_cm', 'weight_kg', 'food_allergies', 'current_medication',
    'dietary_preference', 'preferred_units', 'sleep_goal', 'emergency_contact'
  )
ORDER BY column_name;
```

### 3) Existing `symptoms` columns

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'symptoms'
  AND column_name IN (
    'notes', 'pain_level', 'bloating_level', 'gas_level', 'energy_level', 'mood',
    'severity', 'stress_level'
  )
ORDER BY column_name;
```

### 4) Existing constraints

```sql
SELECT c.conrelid::regclass AS table_name,
       c.conname AS constraint_name,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN ('users', 'symptoms', 'food_items')
ORDER BY 1, 2;
```

### 5) Existing RLS policies

```sql
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('food_items', 'users', 'symptoms')
ORDER BY tablename, policyname;
```

### 6) Invalid severity/stress values (must return **0 rows** for constraint upgrade)

```sql
SELECT id, severity, stress_level
FROM public.symptoms
WHERE (severity IS NOT NULL AND (severity < 0 OR severity > 10))
   OR (stress_level IS NOT NULL AND (stress_level < 0 OR stress_level > 10));
```

If rows are returned, fix them with targeted `UPDATE` statements **before** rerunning migration 7. The migration will **skip** constraint upgrades and emit a `WARNING` rather than fail the whole script.

### 7) Invalid level columns (must return **0 rows** before level check constraints)

```sql
SELECT id, pain_level, bloating_level, gas_level, energy_level
FROM public.symptoms
WHERE (pain_level IS NOT NULL AND (pain_level < 0 OR pain_level > 10))
   OR (bloating_level IS NOT NULL AND (bloating_level < 0 OR bloating_level > 10))
   OR (gas_level IS NOT NULL AND (gas_level < 0 OR gas_level > 10))
   OR (energy_level IS NOT NULL AND (energy_level < 0 OR energy_level > 10));
```

---

## How to identify which section failed

Migration 7 is ordered in four sections. Use post-run state to locate the last successful section:

| Section | Lines (approx.) | Failure symptom | Partial-state check |
|---------|-----------------|-----------------|---------------------|
| **A — users** | Profile columns + checks | `duplicate_column` (old migration only) or check violation | Query #2 above |
| **B — profiles** | Conditional view | `relation "profiles" is not a view` (old migration only) | Query #1 — `profiles` kind |
| **C — food_items** | Table, indexes, policy | Policy name conflict (old migration only) | `to_regclass('public.food_items')`, query #5 |
| **D — symptoms** | Columns + constraints | Constraint add after invalid data | Query #3, #4, #6, #7 |

**Supabase SQL Editor:** scroll to **Messages** / **Notices** after run. Migration 7 emits `NOTICE` lines for profiles handling and constraint skips.

Common historical failure (fixed in current migration):

- **`CREATE OR REPLACE VIEW public.profiles`** when `profiles` already exists as a **table** → entire script aborted at section B.

Current migration detects `relkind` and skips view creation when `profiles` is a table.

---

## Safe rerun instructions

Migration 7 is **idempotent** and safe to rerun:

1. Run preflight queries **1–7**.
2. Fix any invalid symptom rows (queries **6–7**) if needed.
3. Paste the full migration file into SQL Editor (or `supabase db push` if CLI tracks it).
4. Rerun is safe — existing columns, constraints, policies, and tables are skipped.
5. Constraint upgrades run only when data validates and the target 0–10 check is not already present.

**Do not** manually `DROP TABLE profiles` to “fix” a failed run. If `profiles` is a table, keep it and verify columns (see below).

---

## How to check whether a migration is applied

### Option A — Supabase CLI migration history

```bash
supabase migration list
```

Applied migrations show a remote timestamp; pending migrations show empty remote.

### Option B — SQL inspection (Supabase SQL Editor)

```sql
-- user_memory
SELECT to_regclass('public.user_memory') IS NOT NULL AS user_memory_exists;

-- experiments
SELECT to_regclass('public.experiments') IS NOT NULL AS experiments_exists;

-- community_knowledge
SELECT to_regclass('public.community_knowledge') IS NOT NULL AS community_knowledge_exists;

-- verified_scientific_guidance
SELECT to_regclass('public.verified_scientific_guidance') IS NOT NULL AS verified_guidance_exists;

-- muna_insights
SELECT to_regclass('public.muna_insights') IS NOT NULL AS muna_insights_exists;

-- muna_events
SELECT to_regclass('public.muna_events') IS NOT NULL AS muna_events_exists;

-- critical alignment (20260714220000)
SELECT to_regclass('public.profiles') IS NOT NULL AS profiles_exists;
SELECT to_regclass('public.food_items') IS NOT NULL AS food_items_exists;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'symptoms'
  AND column_name IN ('notes', 'pain_level', 'bloating_level', 'gas_level', 'energy_level', 'mood');

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('age', 'ibs_type', 'dietary_preference', 'sleep_goal', 'emergency_contact');
```

Expected after migration **7**:

- `profiles_exists` = `true` (view **or** table — see profiles section below)
- `food_items_exists` = `true`
- All six symptom extension columns present
- All five sample `users` profile columns present

### Verify partial application

Run each block independently if the full script stopped mid-way:

```sql
-- Profiles kind after run
SELECT c.relname,
       CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' ELSE c.relkind::text END AS kind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'profiles';

-- Symptom constraints present?
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.symptoms'::regclass AND contype = 'c'
ORDER BY conname;

-- food_items policy present?
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'food_items';
```

### Verify constraint ranges (symptoms)

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.symptoms'::regclass
  AND conname LIKE 'symptoms_%';
```

Severity and stress should allow **0–10** after critical alignment (when data validated).

---

## Profiles: table vs view — how code reads it

| Object | Written by | Read by |
|--------|------------|---------|
| `public.users` | Profile UI (`src/app/profile/page.tsx`) | Profile UI |
| `public.profiles` | Migration view **or** legacy table | MIE (`fetch-input.ts`), AI (`muna-ai/route.ts`, `personal-health.ts`) |

**When `profiles` is a view (fresh or view-only DB):**  
Water goals are derived from `users.daily_water_goal` (cups × 0.25 L, cups × 250 mL).

**When `profiles` is an existing table (typical deployed Supabase):**  
Migration **preserves** it. Ensure the table exposes columns the engines expect:

- `user_id` (required for `.eq("user_id", userId)` queries)
- `water_goal_liters` and/or `daily_water_goal_liters`
- `water_goal_ml` and/or `daily_water_goal_ml`
- `ibs_type` and/or `ibs_subtype`

Code resolves fields flexibly (`src/lib/insights/types.ts`, `personal-health.ts`). If columns are missing, engines fall back to defaults — no app code change required for migration safety.

```sql
-- Verify profiles readability (view or table)
SELECT user_id, water_goal_liters, water_goal_ml, daily_water_goal_liters, ibs_type
FROM public.profiles
LIMIT 5;
```

---

## Safe application steps

1. **Backup** — Supabase Dashboard → Database → Backups (confirm recent snapshot on Pro) or `pg_dump` for self-hosted.
2. **Preflight** — Run migration 7 preflight queries **1–7** on staging.
3. **Staging** — Apply full chain 1–7 on staging; run verification queries above.
4. **App smoke test** — Profile save, symptom log, experiments API, insights POST (authenticated).
5. **Production** — Apply only pending migrations during a maintenance window.
6. **Record** — Note migration version, profiles object type (table/view), and timestamp in your release log.

### Supabase CLI (linked project)

```bash
supabase db push
```

Or apply individual files via SQL Editor in order if CLI is unavailable.

---

## Rollback considerations

**Do not** recommend destructive rollback (DROP TABLE, DROP COLUMN) on production with live user data.

| Scenario | Safe approach |
|----------|----------------|
| Migration 7 partially failed | Run preflight queries; fix data if needed; **rerun the same migration file** (idempotent) |
| Section B skipped (profiles table) | Expected — verify table columns; backfill water goal fields if missing |
| Constraint upgrade skipped (WARNING) | Fix invalid rows (preflight #6/#7); rerun migration 7 |
| App incompatible with new columns | Deploy previous app version; new columns remain unused (harmless) |
| Bad data in new column | `UPDATE` to correct values; do not drop column |

**Never** run `DROP TABLE` on `users`, `symptoms`, `experiments`, or insight/event tables in production without explicit DBA sign-off and backup restore plan.

Migration 7 intentionally avoids: `DROP TABLE`, `TRUNCATE`, `DELETE`, column type changes, and data resets. The only constraint drops are **severity/stress check replacements** when existing checks conflict with 0–10 and all rows pass validation.

---

## Environment warning

Server routes require these variables in Vercel/host (names only):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key)
- `SUPABASE_SERVICE_ROLE_KEY` — required for `/api/insights` writes and community retrieval
- `OPENAI_API_KEY` — required for `/api/muna-ai`

Missing `SUPABASE_SERVICE_ROLE_KEY` causes insight generation to return **500** even when migrations are applied.

---

## Post-migration functional checklist

- [ ] Profile page loads and saves all visible fields
- [ ] Symptom log succeeds with severity **0** and optional empty notes
- [ ] `/api/experiments` returns **401** without Bearer token
- [ ] `/api/experiments` succeeds with valid session token
- [ ] `SELECT * FROM profiles WHERE user_id = '<test-user>'` returns expected water/IBS fields
- [ ] `food_items` table exists (empty until seeded is OK)
- [ ] SQL Editor shows no `WARNING` about skipped constraints (or warnings resolved and migration rerun)

---

## Data import (optional, not automatic)

- Community knowledge: `scripts/import-community-knowledge.ts`
- Verified guidance: `scripts/import-verified-guidance.ts`
- Food catalog: seed `food_items` separately when ready

These imports are **not** part of migration 7 and do not run automatically.
