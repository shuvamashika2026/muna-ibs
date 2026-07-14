# MUNA IBS — Schema Alignment Report

**Last updated:** 14 July 2026  
**Scope:** `supabase/schema.sql`, all files in `supabase/migrations/`, TypeScript types, and all Supabase queries in `src/`  
**Method:** Static audit only — no code or migration changes  
**Related docs:** [DATABASE.md](./DATABASE.md) · [MUNA_ARCHITECTURE.md](./MUNA_ARCHITECTURE.md) · [SECURITY.md](./SECURITY.md)

---

## Executive summary

| Metric | Count |
|--------|------:|
| **Total inconsistencies identified** | **28** |
| **Critical** | **3** |
| **High** | **9** |
| **Medium** | **10** |
| **Low** | **6** |

The repository has a **split source of truth**: baseline `schema.sql` covers early health tables only; six incremental migrations add experiments, memory, community, verified guidance, insights, and events. Application code additionally references **`profiles`** and **`food_items`**, which appear in queries but **not in any tracked migration**.

Production databases that match `schema.sql` exactly will fail or silently degrade several features (symptom logging with notes, food search, MIE profile goals, hydration insight accuracy).

---

## Authoritative table inventory

### In `schema.sql` (baseline)

| Table | RLS | Client write |
|-------|-----|--------------|
| `users` | Yes | Own row |
| `meals` | Yes | Own rows |
| `symptoms` | Yes | Own rows |
| `bowel_movements` | Yes | Own rows |
| `trigger_foods` | Yes | Own rows |
| `water_logs` | Yes | Own rows |
| `sleep_logs` | Yes | Own rows |
| `medication_reminders` | Yes | Own rows |
| `weekly_reports` | Yes | Own rows |

### In migrations only (not reflected in `schema.sql`)

| Migration | Tables |
|-----------|--------|
| `20260712120000_user_memory.sql` | `user_memory` |
| `20260712130000_experiments.sql` | `experiments`, `experiment_checkins` |
| `20260714150000_community_knowledge.sql` | `community_knowledge` |
| `20260714180000_verified_scientific_guidance.sql` | `verified_scientific_guidance` |
| `20260714200000_muna_insights.sql` | `muna_insights` |
| `20260714210000_muna_events.sql` | `muna_events` |

### Referenced in code but missing from repo schema/migrations

| Table | Referenced by | Severity |
|-------|---------------|----------|
| `profiles` | `personal-health.ts`, `muna-ai/route.ts`, `fetch-input.ts` | **Critical** |
| `food_items` | `food.ts`, `food-intelligence/page.tsx` | **Critical** |

---

## Issues by classification

### Critical

#### C1 — `profiles` table absent from migrations

| | |
|---|---|
| **Code** | `.from("profiles").eq("user_id", userId)` in `fetch-input.ts`, `personal-health.ts`, `muna-ai/route.ts` |
| **Expected columns (in code)** | `user_id`, `water_goal_liters`, `daily_water_goal_liters`, `water_goal_ml`, `ibs_type`, `ibs_subtype`, dietary preference fields |
| **Schema** | Not defined anywhere in repo |
| **Impact** | MIE hydration goals fall back to default 1.8 L; IBS subtype/preferences unavailable; `unavailableTables` may list `profiles` on every insight run |
| **Risk** | Insight accuracy and AI personalisation silently wrong |

#### C2 — `food_items` table absent from migrations

| | |
|---|---|
| **TypeScript** | `FoodItem` in `src/lib/food.ts` (11 columns) |
| **Code** | Search and browse on `/food-intelligence` |
| **Schema** | Not in repo |
| **Impact** | Food search returns empty or errors on fresh Supabase project |
| **Risk** | Feature appears broken after clean deploy |

#### C3 — `symptoms.notes` inserted but not in baseline schema

| | |
|---|---|
| **Insert** | `add-symptoms/page.tsx` → `SaveEntryButton` payload includes `notes` |
| **Baseline schema** | `symptoms` has: `symptoms`, `severity`, `stress_level`, `logged_at`, `created_at` — **no `notes`** |
| **Impact** | Postgres `INSERT` fails with unknown column if DB matches `schema.sql` |
| **Risk** | Symptom logging broken on strict schema |

---

### High

#### H1 — Duplicate profile concepts: `users` vs `profiles`

| | |
|---|---|
| **Profile UI** | Reads/writes `users` (`profile/page.tsx`) |
| **AI / MIE** | Reads `profiles` |
| **Baseline `users`** | Only `full_name`, `daily_water_goal`, `report_day` |
| **Profile form** | Displays `age`, `gender`, `ibs_type`, `height_cm`, etc. — **never persisted** (only `full_name` + `daily_water_goal` saved) |
| **Impact** | User-entered profile data lost; two incompatible profile models |

#### H2 — Symptom severity model mismatch

| | |
|---|---|
| **DB (baseline)** | Single `severity` column + free-text `symptoms` |
| **Insert** | Stores combined pain/bloating/gas in text; `severity = max(pain, bloating, gas)` |
| **Engines** | Read separate `pain_level`, `bloating_level`, `bloating` (`food-intelligence.ts`, MIE, muna-ai, health-report) |
| **Impact** | Bloating and pain analytics collapse to same value; food–symptom pairing less accurate |

#### H3 — `water_logs.amount_ml` expected but schema has `cups` only

| | |
|---|---|
| **Insert (water page)** | `cups`, `logged_on` only |
| **Readers** | `waterLitersFromRow()` tries `amount_ml`, `liters`, `amount_liters`, then `cups` |
| **MIE verification fixtures** | Use `amount_ml` / `log_date` (not `logged_on`) |
| **Impact** | Works via cups fallback in production UI, but tests/fixtures assume different shape; `log_date` vs `logged_on` date-key drift |

#### H4 — Meal boolean flags expected as columns

| | |
|---|---|
| **Insert (add-meal)** | Flags (`has_dairy`, `has_onion`, …) embedded in `notes` text only |
| **Readers** | `MEAL_FLAG_KEYS` in `food.ts`, MIE, muna-ai, brain-gut-intelligence check row boolean columns |
| **Impact** | Flag-based trigger ranking never fires from real DB rows |

#### H5 — Hydration goal unit confusion

| | |
|---|---|
| **`users.daily_water_goal`** | Stored as **cup count** (profile save: `ml / 250`) |
| **`profiles` (expected)** | `water_goal_liters`, `water_goal_ml` |
| **MIE** | `waterGoalFromProfile()` reads liter/ml fields on profile row |
| **Dashboard** | Hard-coded 2400 ml goal in risk calc |
| **Impact** | Inconsistent goals across dashboard, profile, MIE |

#### H6 — `schema.sql` stale vs migrations

| | |
|---|---|
| **Problem** | New developers applying only `schema.sql` miss 7 tables and RLS policies |
| **Impact** | Local/prod drift; documentation in `schema.sql` misleading |

#### H7 — `community_knowledge` / `verified_scientific_guidance` RLS with zero policies

| | |
|---|---|
| **Design** | Intentional server-only (service role) |
| **Code** | Community uses service client ✓; verified retrieval stub ✓ |
| **Impact** | Any future client-side query will fail closed; correct but easy to misuse |
| **Severity** | High for **operational** risk if a developer uses anon/authenticated client |

#### H8 — `muna_insights` / `muna_events` migrations may be unapplied

| | |
|---|---|
| **Code** | `/api/insights` writes via service role |
| **Impact** | POST /api/insights returns 500 if migrations not applied |
| **Risk** | Dashboard insight test panel fails |

#### H9 — TypeScript uses `Record<string, unknown>` for health rows

| | |
|---|---|
| **Problem** | No compile-time enforcement of column names |
| **Impact** | All column mismatches above slip through `npm run build` |

---

### Medium

#### M1 — Alternate date column names assumed

Code accepts `symptom_date`, `meal_date`, `log_date`, `sleep_date` but baseline schema uses `logged_at`, `eaten_at`, `logged_on`, `slept_on`. Works when primary columns populated; alternate names only appear in test fixtures.

#### M2 — `medication_reminders.medicine_name` vs code fallbacks

Schema: `medicine_name`. Code also tries `medication_name`, `name`, `title` — harmless fallbacks.

#### M3 — `trigger_foods` / `weekly_reports` read but never written in UI

Queried in `personal-health.ts` and `muna-ai/route.ts`; no insert path found in `src/app`. Tables exist; features inert.

#### M4 — `exercise` logs always empty

`HealthData.exercise` hard-coded to `[]`; no `exercise_logs` table. AI context section always empty.

#### M5 — Analytics bloating equals pain

`analytics/page.tsx` maps both `averageBloating` and `averagePain` from `severity` — misleading chart labels.

#### M6 — Confidence label casing split

| System | Values |
|--------|--------|
| `user_memory.confidence_level` | `Low`, `Moderate`, `Higher` (Title Case, DB check) |
| MIE / MIOS / MDRE | `higher`, `moderate`, `limited`, `unavailable` (lowercase) |

Different enums by design, but naming similarity causes confusion.

#### M7 — `fetch-input.ts` marks `experiments` unavailable when no row

Empty experiment state adds `experiments` to `unavailableTables` even if table exists — conflates “no data” with “table missing”.

#### M8 — `food_items` TypeScript duplicated

Identical `FoodItem` type in `food.ts` and `food-intelligence/page.tsx`.

#### M9 — Dashboard demo constants

`userName: "Shuvam"`, static `confidence: 89`, demo `trendData` — not schema issues but mask data-quality signals.

#### M10 — `insight-keys` / MIE status vs DB check

TypeScript `InsightStatus` omits `superseded`; storage type `StoredInsightStatus` includes it. Aligned with DB — OK, but in-memory `MunaInsight.status` cannot represent `superseded`.

---

### Low

#### L1 — `users.report_day` never referenced in application code

#### L2 — `weekly_reports.clinician_notes` never written from app

#### L3 — `trigger_foods.confidence` default `'Possible'` — no UI writer found

#### L4 — `community_knowledge.raw_record` / `verified_scientific_guidance.raw_record` — server import only, never client-facing (correct)

#### L5 — `safeSelect` always orders by `created_at` — suboptimal for `symptoms.logged_at`, `meals.eaten_at`

#### L6 — `bowel_movements.notes` duplicates urgency text on insert

---

## Tables referenced in code — coverage matrix

| Table | schema.sql | Migration | Queried | Insert/upsert UI or API |
|-------|:----------:|:---------:|:-------:|:-------------------------:|
| `users` | ✓ | — | ✓ | ✓ profile |
| `profiles` | ✗ | ✗ | ✓ | ✗ |
| `meals` | ✓ | — | ✓ | ✓ |
| `symptoms` | ✓ | — | ✓ | ✓ (notes column risk) |
| `bowel_movements` | ✓ | — | ✓ | ✓ |
| `water_logs` | ✓ | — | ✓ | ✓ |
| `sleep_logs` | ✓ | — | ✓ | ✓ |
| `medication_reminders` | ✓ | — | ✓ | ✓ |
| `trigger_foods` | ✓ | — | ✓ | ✗ |
| `weekly_reports` | ✓ | — | ✓ | ✗ |
| `user_memory` | ✗ | ✓ | ✓ | ✓ server (muna-ai) |
| `experiments` | ✗ | ✓ | ✓ | ✓ API |
| `experiment_checkins` | ✗ | ✓ | ✓ | ✓ API |
| `community_knowledge` | ✗ | ✓ | ✓ server | ✗ |
| `verified_scientific_guidance` | ✗ | ✓ | ✗ (stub) | ✗ |
| `muna_insights` | ✗ | ✓ | ✓ | ✓ server API |
| `muna_events` | ✗ | ✓ | ✓ storage only | ✓ server (unused route) |
| `food_items` | ✗ | ✗ | ✓ | ✗ |

---

## Enum and type alignment

| Domain | DB / migration | TypeScript | Match? |
|--------|----------------|------------|--------|
| Experiment `target_type` | `food_reduction`, `food_reintroduction`, `habit` | Same in `experiment-engine.ts` | ✓ |
| Experiment `status` | `draft`, `active`, `completed`, `stopped` | Same | ✓ |
| Experiment `duration_days` | `IN (3, 5, 7)` | `3 \| 5 \| 7` | ✓ |
| Insight `confidence` | lowercase 4 values | `InsightConfidence` | ✓ |
| Insight `status` | includes `superseded` | `StoredInsightStatus` | ✓ (partial in-memory gap) |
| Event `event_type` | 14 values in check | `TimelineEventType` | ✓ |
| Verified `review_status` | `draft`, `reviewed`, `approved` | `VerifiedReviewStatus` | ✓ |
| Community `priority` | lowercase | `KnowledgePriority` | ✓ |
| Memory `confidence_level` | Title Case 3 values | `ConfidenceLabel` | ✓ (different from MIE) |

---

## Recommended migration order

Apply on empty database in this sequence:

1. `supabase/schema.sql` — baseline health tables + RLS  
2. `20260712120000_user_memory.sql`  
3. `20260712130000_experiments.sql`  
4. `20260714150000_community_knowledge.sql` (+ seed import separately)  
5. `20260714180000_verified_scientific_guidance.sql` (+ seed import separately)  
6. `20260714200000_muna_insights.sql`  
7. `20260714210000_muna_events.sql`  

**Future migrations (recommended, not in repo):**

8. `profiles` **or** consolidate into `users` (single profile table)  
9. `food_items` reference table  
10. `symptoms.notes` column **or** remove from insert  
11. Optional: `meals` boolean flag columns **or** stop reading them in engines  
12. Optional: `water_logs.amount_ml` **or** standardise on `cups` only in code  

---

## Backwards compatibility considerations

| Change | Breaking? | Mitigation |
|--------|-----------|------------|
| Add `profiles` table | No | Backfill from `users`; dual-read period |
| Merge `profiles` → `users` | Yes if prod has both | Migration script copying rows |
| Add `symptoms.notes` | No | Additive column, nullable |
| Remove `notes` from insert | No | Stop sending field |
| Add `food_items` | No | Empty table until seeded |
| Add meal flag columns | No | Backfill from notes parsing optional |
| Rename `medicine_name` | Yes | Avoid; use views or aliases |
| Apply insight/event migrations | No | New tables only |

**Code defensively uses fallback column names** (`numberFrom`, `textFrom`, `getDateFromRow`) — this hides schema drift in development but causes silent accuracy loss rather than hard failures.

---

## Production risk assessment

| Area | Risk level | Notes |
|------|------------|-------|
| Symptom logging | **High** if DB matches baseline schema | `notes` column insert failure |
| Food intelligence search | **High** on clean DB | Missing `food_items` |
| MIE / insights API | **High** if migrations not applied | Missing `muna_insights` |
| MIE hydration insights | **Medium** | Missing `profiles` → default goal |
| MUNA AI personal context | **Medium** | Profile split; symptom field mismatch |
| Experiments API | **Medium** | Requires migration; reported 500s in roadmap |
| Community / verified AI | **Low–Medium** | Service role required; verified not wired |
| Auth / RLS health CRUD | **Low** | Baseline tables align with UI inserts (except symptoms notes) |
| MTI | **Low** | Library only; `muna_events` optional until wired |

**Overall:** A production database created from **`schema.sql` alone** is **not compatible** with the current application. A database with **all migrations applied** but **without manual `profiles` / `food_items` / column patches** will run but with **degraded intelligence features**.

---

## Suggested remediation priority

1. **Critical:** Add migration for `symptoms.notes` OR remove from insert payload.  
2. **Critical:** Add `profiles` migration OR redirect all queries to `users` with expanded columns.  
3. **Critical:** Add `food_items` migration + seed strategy.  
4. **High:** Unify hydration goal storage (liters vs cups vs profile table).  
5. **High:** Align symptom model (split columns or single-column readers only).  
6. **High:** Refresh `schema.sql` or replace with migration-only workflow documentation.  
7. **Medium:** Add typed Supabase generated types or Zod row schemas for health tables.

---

## Audit limitations

- Did not inspect live Supabase project — production may already have manual tables/columns not in git.  
- Did not validate seed/import scripts for community or verified datasets.  
- TypeScript audit limited to explicit `.from()` queries and known helper key lists; dynamic table names not used.  
- `npm run build` does not validate database schema.

---

## Build verification

```
npm run build — SUCCESS (14 July 2026)
```

Build passes because database access is untyped (`Record<string, unknown>`) and errors surface only at runtime against Postgres.
