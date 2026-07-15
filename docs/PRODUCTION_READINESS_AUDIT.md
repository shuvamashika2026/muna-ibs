# MUNA IBS — Production Readiness Audit (Closed Beta)

**Audit date:** 14 July 2026  
**Scope:** Current implementation in `src/`, `supabase/`, `docs/`, `package.json`, `next.config.ts`, `tsconfig.json`, `.gitignore`  
**Target:** Closed beta, 25–100 users  
**Method:** Static code review + `npm run build` + `npm run lint` (no code or migration changes)  
**Related:** [SCHEMA_ALIGNMENT_REPORT.md](./SCHEMA_ALIGNMENT_REPORT.md) · [SECURITY.md](./SECURITY.md) · [AI_PIPELINE.md](./AI_PIPELINE.md)

---

## A. Executive summary

MUNA IBS **builds successfully** (TypeScript clean) and has a **mature AI safety stack** (MIOS intent classification, MDRE templates, emergency override, medication-dose refusal, community/verified separation). Bearer-token auth is implemented for insights and partially elsewhere.

However, the app is **not beta-ready as deployed from the repository alone**. Three **Critical** schema gaps (`profiles`, `food_items`, `symptoms.notes`) will break or silently degrade core flows on a database that matches tracked SQL. Profile UI fields are mostly **not persisted**. A **Temporary Development Test** panel on the dashboard exposes internal insight generation to all authenticated users. **ESLint fails** (5 errors). Several API routes use **`getUser()` without passing the JWT**, unlike the fixed `/api/insights` pattern. **Verified clinical guidance retrieval is stubbed empty**. **No automated test suite** runs in CI. **No rate limiting** protects `/api/muna-ai` from cost abuse.

**Recommendation:** **Conditional Go** — proceed with a hand-picked closed beta **only after** resolving Critical blockers below, applying all migrations, and removing dev-only UI.

---

## B. Beta-readiness score

| Area | Weight | Score (/100 area) | Weighted |
|------|-------:|------------------:|---------:|
| Build & code quality | 10 | 62 | 6.2 |
| Auth & authorization | 15 | 68 | 10.2 |
| Database & schema | 20 | 35 | 7.0 |
| Personal health data | 15 | 52 | 7.8 |
| AI pipeline & safety | 15 | 78 | 11.7 |
| API routes | 10 | 58 | 5.8 |
| User experience | 10 | 64 | 6.4 |
| Performance | 5 | 70 | 3.5 |
| Privacy & deployment | 10 | 55 | 5.5 |

**Overall beta-readiness score: 58 / 100**

---

## C. Critical blockers (must fix before closed beta)

### CR-01 — `profiles` table missing from repo schema/migrations

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Evidence** | Code queries `.from("profiles")` in `personal-health.ts`, `fetch-input.ts`, `muna-ai/route.ts`; no migration defines the table. Documented as C1 in SCHEMA_ALIGNMENT_REPORT. |
| **Affected files** | `src/lib/personal-health.ts`, `src/lib/insights/fetch-input.ts`, `src/app/api/muna-ai/route.ts`, `supabase/schema.sql` |
| **User impact** | Hydration goals, IBS subtype, and AI personalisation fall back to defaults; MIE marks profiles unavailable on every run. |
| **Recommended correction** | Add migration for `profiles` with columns used in code (`user_id`, water goal fields, `ibs_type`, dietary prefs) **or** consolidate onto `users` and update all queries. |
| **Blocks beta?** | **Yes** |

### CR-02 — `food_items` table missing from repo schema/migrations

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Evidence** | `src/lib/food.ts` searches `food_items`; `/food-intelligence` depends on it. No migration. |
| **Affected files** | `src/lib/food.ts`, `src/app/food-intelligence/page.tsx` |
| **User impact** | Food search/browse empty or errors on fresh Supabase project. |
| **Recommended correction** | Add migration + seed/import path, or disable food-intelligence UI until table exists. |
| **Blocks beta?** | **Yes** (if food features are in beta scope) |

### CR-03 — `symptoms.notes` column inserted but absent from baseline schema

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Evidence** | `add-symptoms/page.tsx` → `SaveEntryButton` payload includes `notes`; `schema.sql` `symptoms` has no `notes` column. |
| **Affected files** | `src/app/add-symptoms/page.tsx`, `src/components/save-entry-button.tsx`, `supabase/schema.sql` |
| **User impact** | Symptom logging **INSERT fails** on DB matching baseline schema. |
| **Recommended correction** | Migration: `ALTER TABLE symptoms ADD COLUMN notes text;` or stop sending `notes` until column exists. |
| **Blocks beta?** | **Yes** |

### CR-04 — Incremental migrations may be unapplied in live Supabase

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Evidence** | Six migrations after baseline (`user_memory`, `experiments`, `community_knowledge`, `verified_scientific_guidance`, `muna_insights`, `muna_events`); `schema.sql` does not include them. |
| **Affected files** | `supabase/migrations/*.sql`, `/api/insights`, `/api/experiments`, personal memory |
| **User impact** | POST `/api/insights` 500; experiments 500; memory persistence fails. |
| **Recommended correction** | Apply all migrations to beta Supabase; reconcile `schema.sql` with migrations; verify in staging. |
| **Blocks beta?** | **Yes** |

### CR-05 — Profile form displays many fields but only saves two

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Evidence** | `profile/page.tsx` loads `age`, `gender`, `ibs_type`, etc. from `users`; `handleSave` upserts only `full_name` and `daily_water_goal`. Baseline `users` lacks most displayed columns anyway. |
| **Affected files** | `src/app/profile/page.tsx`, `supabase/schema.sql` |
| **User impact** | Users believe health profile is saved; data is **lost on refresh**. Undermines trust in a health app. |
| **Recommended correction** | Extend `users` or `profiles` schema to match UI; persist all collected fields; align AI/MIE readers. |
| **Blocks beta?** | **Yes** |

### CR-06 — Temporary Development Test panel on production dashboard

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Evidence** | `dashboard/page.tsx` lines ~454–482: dashed amber panel “Temporary Development Test”, `generateInsightsFromApi({ force: true })`, `console.log` of full API response. |
| **Affected files** | `src/app/dashboard/page.tsx`, `src/lib/insights/api-client.ts` |
| **User impact** | Beta users can force insight regeneration (cost/load); console may expose insight payloads; unprofessional UX. |
| **Recommended correction** | Remove panel before beta; gate behind env flag if needed for internal QA only. |
| **Blocks beta?** | **Yes** |

### CR-07 — Symptom `severity` can be 0; DB constraint requires 1–10

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Evidence** | UI sliders `min="0"`; payload `severity: Math.max(painLevel, bloatingLevel, gasLevel)`; DB `check (severity between 1 and 10)`. |
| **Affected files** | `src/app/add-symptoms/page.tsx`, `supabase/schema.sql` |
| **User impact** | Save fails when all symptom sliders at 0. |
| **Recommended correction** | Clamp severity to 1–10 or allow NULL when zero; align UI minimum with DB. |
| **Blocks beta?** | **Yes** |

### CR-08 — Experiments API auth uses `getUser()` without explicit JWT

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Evidence** | `experiments/route.ts` `requireAuth` calls `supabase.auth.getUser()` with no token argument; `/api/insights` uses `authenticateSupabaseRequest` → `getUser(accessToken)`. Client sends Bearer header only. |
| **Affected files** | `src/app/api/experiments/route.ts`, `src/lib/supabase/request-auth.ts` |
| **User impact** | Intermittent **401/500** on experiments despite valid client session; dashboard experiment card fails. |
| **Recommended correction** | Use `authenticateSupabaseRequest` consistently across all API routes. |
| **Blocks beta?** | **Yes** (experiments in beta scope) |

---

## D. High-priority issues

### HI-01 — Duplicate health-data layer (`muna-ai/route.ts` vs `personal-health.ts`)

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | `muna-ai/route.ts` defines local `retrieveHealthData`, `buildHealthSummary`, `loadUserMemory`, `safeSelect`, types — parallel to `personal-health.ts` (~1200+ duplicated lines). |
| **Affected files** | `src/app/api/muna-ai/route.ts`, `src/lib/personal-health.ts` |
| **User impact** | Auth fixes applied to one path may not reach the other; drift risk. |
| **Recommended correction** | Import shared helpers from `personal-health.ts` only. |
| **Blocks beta?** | No (but high regression risk) |

### HI-02 — `/api/muna-ai` allows unauthenticated requests

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | No 401; `retrieveHealthData` returns empty health context with access note; AI chat sends token optionally (`...(token ? { Authorization } : {})`). |
| **Affected files** | `src/app/api/muna-ai/route.ts`, `src/app/ai-chat/page.tsx` |
| **User impact** | Anonymous OpenAI usage (cost/abuse); no personal context (acceptable) but no auth gate. |
| **Recommended correction** | Require Bearer token for beta; return 401 without it. |
| **Blocks beta?** | Recommended yes for cost control |

### HI-03 — No rate limiting on `/api/muna-ai`

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | Only `/api/insights` has 15-minute cooldown; muna-ai has message length cap (2000) and history slice (-8) but no per-user throttle. |
| **Affected files** | `src/app/api/muna-ai/route.ts` |
| **User impact** | Token cost spike; abuse in 25–100 user beta. |
| **Recommended correction** | Per-user/IP rate limit (e.g. Vercel middleware or Upstash); daily cap for beta. |
| **Blocks beta?** | Recommended yes |

### HI-04 — Verified guidance retrieval stubbed empty

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | `fetchVerifiedGuidanceEvidenceForMios()` returns `[]` with comment “not wired in Version 1”. |
| **Affected files** | `src/lib/mios/adapters/verified.ts`, `src/lib/response-engine/templates.ts` (education card references reviewed guidance) |
| **User impact** | Education template may reference guidance that never arrives; reliance on model parametric knowledge. |
| **Recommended correction** | Wire approved-row retrieval via service role **or** remove “reviewed guidance” card claims until live. |
| **Blocks beta?** | No if disclosed; yes if marketing claims verified citations |

### HI-05 — Suicidal/self-harm language not routed to emergency

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | `intent.ts` EMOTIONAL_PATTERNS: `hopeless`, `worthless`, `scared` — no `suicid`, `self-harm`, `kill myself`. `templates.ts` emotional_support: “Escalate appropriately if self-harm language appears” (LLM-dependent only). |
| **Affected files** | `src/lib/mios/intent.ts`, `src/lib/response-engine/templates.ts` |
| **User impact** | Crisis language may get generic emotional support instead of crisis resources. |
| **Recommended correction** | Add crisis phrase list → `emergency` or dedicated crisis template with helpline guidance (region-agnostic framing). |
| **Blocks beta?** | **Yes** for responsible health-adjacent beta |

### HI-06 — Meal FODMAP flags stored in notes text only

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | SCHEMA report H4; `add-meal` embeds flags in `notes`; readers check boolean columns (`has_dairy`, etc.). |
| **Affected files** | `src/app/add-meal/page.tsx`, `src/lib/food.ts`, MIE, `muna-ai` |
| **User impact** | Trigger ranking and food insights never fire from real DB rows. |
| **Recommended correction** | Add columns or structured JSON on `meals`; migrate insert path. |
| **Blocks beta?** | No if food intelligence scoped out; yes if in beta |

### HI-07 — Symptom severity model mismatch (single column vs split levels)

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | Insert stores combined text + `max(pain,bloating,gas)`; analytics/MIE read `pain_level`, `bloating_level` separately. |
| **Affected files** | `src/app/add-symptoms/page.tsx`, `src/app/analytics/page.tsx`, insight engines |
| **User impact** | Bloating/pain analytics inaccurate; misleading charts. |
| **Recommended correction** | Add columns or parse structured payload consistently. |
| **Blocks beta?** | No (degraded accuracy) |

### HI-08 — Experiments API exposes raw Postgres errors

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | `return NextResponse.json({ error: error.message })` on insert/update failures. |
| **Affected files** | `src/app/api/experiments/route.ts` |
| **User impact** | Schema/table names leaked to client. |
| **Recommended correction** | Generic 500 messages; log details server-side only. |
| **Blocks beta?** | No |

### HI-09 — ESLint fails (5 errors, 9 warnings)

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | `npm run lint` exit code 1; `react-hooks/set-state-in-effect` in ai-chat, brain-gut-reset, experiment, muna-sound-space; unused vars in dashboard, muna-ai. |
| **Affected files** | See lint output paths |
| **User impact** | CI would fail; possible perf/cascade render issues. |
| **Recommended correction** | Fix or suppress with justification; add lint to pre-deploy checklist. |
| **Blocks beta?** | No if build-only deploy; yes if lint gated |

### HI-10 — Proprietary community knowledge tracked in Git

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | `git ls-files`: `knowledge-project/02_processed_data/community_knowledge_refined.json` (+ jsonl); `.gitignore` only excludes `data/community/*.json`. |
| **Affected files** | `knowledge-project/**`, `.gitignore` |
| **User impact** | Dataset exposure if repo shared; licensing risk. |
| **Recommended correction** | Move to private storage; gitignore knowledge-project processed outputs; import via scripts only. |
| **Blocks beta?** | No (repo access control); yes if repo is shared |

### HI-11 — `SUPABASE_SERVICE_ROLE_KEY` missing from `.env.example`

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | `.env.example` lists URL, anon, OpenAI only; insights/community require service role. |
| **Affected files** | `.env.example`, `src/lib/supabase/admin.ts` |
| **User impact** | Deploy misconfiguration → insights 500. |
| **Recommended correction** | Document server-only vars in `.env.example` (names, no values). |
| **Blocks beta?** | No (ops) |

### HI-12 — `muna-ai` memory preload uses `getUser()` without JWT

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | `route.ts` ~1390: `await supabase.auth.getUser()` without accessToken before `loadUserMemory`. |
| **Affected files** | `src/app/api/muna-ai/route.ts` |
| **User impact** | Personal memory may not load despite Bearer token; degraded AI answers. |
| **Recommended correction** | Use `extractBearerToken` + `getUser(accessToken)` like `personal-health.ts`. |
| **Blocks beta?** | No (degraded) |

### HI-13 — Daily brief `/api/daily-brief` same auth gap

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | `daily-brief/route.ts` uses `getUser()` without token; no 401 — degrades to generic brief. |
| **Affected files** | `src/app/api/daily-brief/route.ts`, `src/app/dashboard/page.tsx` |
| **User impact** | Personalised brief may not use memory/name when JWT not picked up. |
| **Recommended correction** | Align with `authenticateSupabaseRequest`. |
| **Blocks beta?** | No |

### HI-14 — Water UI shows mL; DB stores `cups` only; duplicate daily rows allowed

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | `water/page.tsx` converts mL→cups; no unique on `(user_id, logged_on)`; each save INSERTs new row. |
| **Affected files** | `src/app/water/page.tsx`, `supabase/schema.sql` |
| **User impact** | Double-counting hydration; MIE/dashboard totals inflated if user logs multiple times. |
| **Recommended correction** | Upsert daily total or sum on read; document behaviour. |
| **Blocks beta?** | No |

### HI-15 — No automated test script in `package.json`

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Evidence** | Scripts: `dev`, `build`, `start`, `lint` only; verification modules exist but are not CI-invoked. |
| **Affected files** | `package.json`, `src/lib/**/verification.ts` |
| **User impact** | Regressions in MIOS/MIE/auth undetected until manual QA. |
| **Recommended correction** | Add `npm test` running verification runners; gate beta deploy. |
| **Blocks beta?** | Recommended yes |

---

## E. Medium-priority issues

### MD-01 — Dashboard hard-coded demo constants

| **Severity** | Medium |
| **Evidence** | Fallback `userName: "Shuvam"`; static confidence/trend demo data in dashboard components. |
| **Affected files** | `src/app/dashboard/page.tsx` |
| **User impact** | Wrong name/stats for other beta users. |
| **Recommended correction** | Remove placeholders; use loaded user data only. |
| **Blocks beta?** | No |

### MD-02 — MIE not wired to dashboard production UI

| **Severity** | Medium |
| **Evidence** | Insights via dev test panel only; no consumer of GET `/api/insights` in main dashboard cards. |
| **Affected files** | `src/app/dashboard/page.tsx`, `src/lib/insights/api-client.ts` |
| **User impact** | Generated insights invisible to users except dev panel. |
| **Recommended correction** | Wire actionable insights to UI or defer MIE from beta scope. |
| **Blocks beta?** | No |

### MD-03 — MTI timeline has storage/orchestrator but no API or UI

| **Severity** | Medium |
| **Evidence** | `src/lib/timeline/*`, migration `muna_events`; no `/api/timeline` route. |
| **Affected files** | `src/lib/timeline/`, `supabase/migrations/20260714210000_muna_events.sql` |
| **User impact** | None (feature not exposed). |
| **Recommended correction** | Document as post-beta; do not promise timeline in beta comms. |
| **Blocks beta?** | No |

### MD-04 — Analytics page maps bloating and pain both from `severity`

| **Severity** | Medium |
| **Evidence** | SCHEMA report M5; single DB column used for two chart series. |
| **Affected files** | `src/app/analytics/page.tsx` |
| **User impact** | Misleading analytics. |
| **Recommended correction** | Parse symptom text or add columns. |
| **Blocks beta?** | No |

### MD-05 — `fetchMieInput` conflates empty experiments with missing table

| **Severity** | Medium |
| **Evidence** | SCHEMA M7; `unavailableTables` includes `experiments` when no rows. |
| **Affected files** | `src/lib/insights/fetch-input.ts` |
| **User impact** | Insight engine reports false “unavailable” domains. |
| **Recommended correction** | Distinguish query error vs empty result. |
| **Blocks beta?** | No |

### MD-06 — Timezone: date keys use `toISOString().slice(0,10)` (UTC)

| **Severity** | Medium |
| **Evidence** | Water `logged_on`, experiment dates, dashboard “today” filter. |
| **Affected files** | `src/app/water/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/experiment/page.tsx` |
| **User impact** | Off-by-one day for users far from UTC. |
| **Recommended correction** | Use local date helper consistently. |
| **Blocks beta?** | No |

### MD-07 — AI chat history unbounded in session (client); server slices to 8

| **Severity** | Medium |
| **Evidence** | Client keeps full `messages`; API `history.slice(-8)`, content truncated to 700 chars. |
| **Affected files** | `src/app/ai-chat/page.tsx`, `src/app/api/muna-ai/route.ts` |
| **User impact** | Long sessions lose context; duplicate token use on repair pass. |
| **Recommended correction** | Document limits; trim client history. |
| **Blocks beta?** | No |

### MD-08 — Duplicate `FoodItem` type definition

| **Severity** | Medium |
| **Evidence** | SCHEMA M8; types in `food.ts` and `food-intelligence/page.tsx`. |
| **Affected files** | `src/lib/food.ts`, `src/app/food-intelligence/page.tsx` |
| **User impact** | Maintenance drift. |
| **Recommended correction** | Single exported type. |
| **Blocks beta?** | No |

### MD-09 — `collectMemoryEntries` unused in muna-ai route

| **Severity** | Medium |
| **Evidence** | ESLint `@typescript-eslint/no-unused-vars` at `muna-ai/route.ts:997`. |
| **Affected files** | `src/app/api/muna-ai/route.ts` |
| **User impact** | Dead code confusion. |
| **Recommended correction** | Remove or use. |
| **Blocks beta?** | No |

### MD-10 — Unused dashboard card components

| **Severity** | Medium |
| **Evidence** | ESLint: `TodaysFocusCard`, `BrainGutResetCard`, `DailyLessonCard`, `DailyActionCard` defined never used. |
| **Affected files** | `src/app/dashboard/page.tsx` |
| **User impact** | Dead code; larger bundle. |
| **Recommended correction** | Remove or wire up. |
| **Blocks beta?** | No |

### MD-11 — Privacy policy lacks data processor/subprocessor list

| **Severity** | Medium |
| **Evidence** | `privacy/page.tsx` describes collection/rights; no explicit OpenAI/Supabase/Vercel subprocessors, retention periods, or beta disclaimer. |
| **Affected files** | `src/app/privacy/page.tsx` |
| **User impact** | GDPR-style transparency gap for EU beta users. |
| **Recommended correction** | Add subprocessors, retention, contact for deletion. |
| **Blocks beta?** | No (jurisdiction-dependent) |

### MD-12 — No request body size limit on API routes beyond AI message length

| **Severity** | Medium |
| **Evidence** | Insights POST accepts JSON without explicit size cap; experiments POST unbounded body. |
| **Affected files** | API routes under `src/app/api/` |
| **User impact** | Large payload DoS. |
| **Recommended correction** | Next.js/middleware body size limits. |
| **Blocks beta?** | No |

---

## F. Low-priority improvements

### LO-01 — `next.config.ts` empty (no security headers)

| **Severity** | Low |
| **Evidence** | Default config only. |
| **Affected files** | `next.config.ts` |
| **Recommended correction** | Add CSP, HSTS, `X-Frame-Options` for production. |
| **Blocks beta?** | No |

### LO-02 — Console logging in client insight API client and dashboard test

| **Severity** | Low |
| **Evidence** | `console.error` in `api-client.ts`; `console.log` in dashboard test handler. |
| **Affected files** | `src/lib/insights/api-client.ts`, `src/app/dashboard/page.tsx` |
| **Recommended correction** | Remove or guard with `NODE_ENV === 'development'`. |
| **Blocks beta?** | No |

### LO-03 — `users.report_day` unused

| **Severity** | Low |
| **Evidence** | SCHEMA L1. |
| **Affected files** | `supabase/schema.sql` |
| **Blocks beta?** | No |

### LO-04 — `safeSelect` orders by `created_at` not domain timestamps

| **Severity** | Low |
| **Evidence** | SCHEMA L5; symptoms/meals may sort incorrectly vs `logged_at`/`eaten_at`. |
| **Affected files** | `src/lib/personal-health.ts`, `src/app/api/muna-ai/route.ts` |
| **Blocks beta?** | No |

### LO-05 — PWA service worker registers without offline health-data strategy

| **Severity** | Low |
| **Evidence** | `pwa-register.tsx` registers `/sw.js`; no offline queue for logs. |
| **Affected files** | `src/components/pwa-register.tsx` |
| **Blocks beta?** | No |

### LO-06 — Strict TypeScript but health rows as `Record<string, unknown>`

| **Severity** | Low |
| **Evidence** | SCHEMA H9; no compile-time column checks. |
| **Affected files** | Widespread in health/AI layers |
| **Blocks beta?** | No |

### LO-07 — No logout/session-expiry UX beyond redirect on `getUser` failure

| **Severity** | Low |
| **Evidence** | `app-shell.tsx` signOut works; expired JWT may show generic errors on API calls. |
| **Affected files** | `src/components/app-shell.tsx`, API clients |
| **Recommended correction** | Central 401 handler → refresh or re-login prompt. |
| **Blocks beta?** | No |

### LO-08 — Verified guidance JSON in Git (`data/guidance/`)

| **Severity** | Low |
| **Evidence** | Tracked: `data/guidance/MUNA_Verified_IBS_Guidance_v1.json` (curated, not raw PHI). |
| **Affected files** | `data/guidance/` |
| **Blocks beta?** | No |

---

## G. Safety scenario matrix (current implementation)

| Scenario | Intent detected | Template | Blocks routine IBS advice | Next action appropriate | Gap |
|----------|-----------------|----------|---------------------------|-------------------------|-----|
| Rectal bleeding | `emergency` (phrase + community theme) | `emergency` | Yes (prompt + MDRE) | Urgent assessment | None significant |
| Black stool | `emergency` | `emergency` | Yes | Urgent assessment | None |
| Fainting / passed out | `emergency` | `emergency` | Yes | Urgent assessment | None |
| Overdose (“too many tablets” + faint) | `emergency` | `emergency` | Yes | Urgent assessment | Depends on LLM following template |
| Breathing difficulty | `emergency` | `emergency` | Yes | Emergency services framing | None |
| Bowel obstruction patterns | `emergency` | `emergency` | Yes | Urgent assessment | None |
| Severe dehydration | Route regex `dehydration` → urgentSafety; intent may stay non-emergency | `emergency` via urgentSafety | Yes when matched | Medical review | Weaker if user says “severely dehydrated” without exact token |
| Persistent vomiting | `emergency` | `emergency` | Yes | Urgent assessment | None |
| Unexplained weight loss | `emergency` + route regex | `emergency` | Yes | Medical review | None |
| Suicidal / self-harm language | `emotional_support` (not emergency) | `emotional_support` | No hard block | LLM prompt only: “escalate appropriately” | **HI-05 — no deterministic crisis routing** |

**Medication dose refusal:** `medication` intent + `medication` template; response plan: “Avoid dosing advice”; verification cases H–J in `mios/verification.ts`. **Works by design** (template + prompts).

**Emergency override:** `buildMdreSelection` forces `emergency` when `urgentSafety`; `mustUseEmergencyTemplate` blocks general fallback (`response-engine/selector.ts`).

**Red-flag screening layers:** (1) route regex in muna-ai, (2) MIOS `detectIntent`, (3) community `CRITICAL_SAFETY_THEMES`, (4) system prompt.

---

## H. API route audit summary

| Route | Auth | Validation | Errors | Rate limit | Notes |
|-------|------|------------|--------|------------|-------|
| `/api/muna-ai` | Optional Bearer | Message required, ≤2000 chars, history ≤8 | Generic 500/502/503 | **None** | OpenAI repair pass doubles tokens; no user_id from client ✓ |
| `/api/insights` | **Required** Bearer | Rejects client `user_id`; clamps window | Generic 500 | **15 min** cooldown | Service role writes ✓ |
| `/api/experiments` | Bearer (fragile) | Action-based validation; severity 0–10 | **Raw DB messages** | None | Upsert checkins ✓ |
| `/api/daily-brief` | Optional Bearer | None | Generic 500 | None | Degraded without auth |

---

## I. Build and lint results

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** — Next.js 16.2.10, TypeScript clean, 36 routes compiled |
| `npm run lint` | **FAIL** — 14 problems (5 errors, 9 warnings) |

**Lint errors (blocking strict CI):**

- `src/app/ai-chat/page.tsx:146` — setState in effect
- `src/app/brain-gut-reset/page.tsx:47` — setState in effect
- `src/app/experiment/page.tsx:85` — setState in effect
- `src/components/muna-sound-space.tsx:122,135` — setState in effect

---

## J. Exact affected files (index)

**API:** `src/app/api/muna-ai/route.ts`, `src/app/api/insights/route.ts`, `src/app/api/experiments/route.ts`, `src/app/api/daily-brief/route.ts`

**Auth:** `src/lib/supabase/request-auth.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase.ts`

**Health data UI:** `src/app/add-symptoms/page.tsx`, `src/app/add-meal/page.tsx`, `src/app/water/page.tsx`, `src/app/profile/page.tsx`, `src/components/save-entry-button.tsx`

**AI pipeline:** `src/lib/mios/*`, `src/lib/response-engine/*`, `src/lib/community-knowledge/retrieval.ts`, `src/lib/mios/adapters/verified.ts`

**Insights/timeline:** `src/lib/insights/*`, `src/lib/timeline/*`

**Dashboard:** `src/app/dashboard/page.tsx`

**Database:** `supabase/schema.sql`, `supabase/migrations/20260712120000_user_memory.sql`, `20260712130000_experiments.sql`, `20260714150000_community_knowledge.sql`, `20260714180000_verified_scientific_guidance.sql`, `20260714200000_muna_insights.sql`, `20260714210000_muna_events.sql`

**Config:** `package.json`, `next.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`

---

## K. Recommended fix order

1. **Schema remediation** — CR-01, CR-02, CR-03, CR-07; apply CR-04 migrations; update `schema.sql`.
2. **Profile persistence** — CR-05; unify `users` vs `profiles`.
3. **Remove dev artifacts** — CR-06, LO-02, MD-01.
4. **Auth unification** — CR-08, HI-12, HI-13; use `authenticateSupabaseRequest` on all API routes; HI-02 require auth on muna-ai for beta.
5. **Safety** — HI-05 crisis language routing.
6. **Ops** — HI-11 env docs; HI-03 rate limits; HI-10 gitignore knowledge datasets.
7. **Data quality** — HI-06, HI-07, HI-14 meal/symptom/water models.
8. **AI evidence** — HI-04 verified guidance wiring or UI copy downgrade.
9. **Quality gate** — HI-09 lint; HI-15 automated verification scripts.
10. **Polish** — MD-02 MIE dashboard wiring; MD-06 timezone; LO-01 security headers.

---

## L. Closed-beta release criteria

- [ ] All six Supabase migrations applied and verified in staging
- [ ] `profiles` (or unified profile model), `food_items` (if in scope), `symptoms.notes` exist in production DB
- [ ] Symptom logging succeeds end-to-end (including notes, severity edge cases)
- [ ] Profile save persists all displayed fields
- [ ] Temporary Development Test panel removed from dashboard
- [ ] All API routes authenticate via `getUser(accessToken)` pattern
- [ ] `/api/muna-ai` requires authentication; rate limit configured
- [ ] Crisis/self-harm phrases route to emergency or crisis template
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` set in Vercel; `.env.example` updated
- [ ] Manual safety spot-check: 10 scenarios in Safety matrix
- [ ] Privacy/terms reviewed for beta cohort; data deletion process documented
- [ ] `npm run build` and `npm run lint` pass (or lint exceptions documented)
- [ ] No raw Postgres errors returned to clients from experiments API

---

## M. Issue counts by severity

| Severity | Count |
|----------|------:|
| Critical | 8 |
| High | 15 |
| Medium | 12 |
| Low | 8 |
| **Total** | **43** |

---

## N. Release verdict

### **Conditional Go**

MUNA IBS has **strong AI safety architecture** and a **passing production build**, but **database/schema misalignment**, **profile data loss**, **dev-only dashboard tooling**, **inconsistent API authentication**, and **crisis-language gaps** prevent a responsible closed beta until Critical blockers (CR-01–CR-08) are resolved.

**Go** after Critical + HI-05 + auth/rate-limit items are fixed and migrations are applied.  
**No-Go** if shipping current `main` to 25–100 users without schema remediation and dev panel removal.

---

*Audit performed statically against repository state 14 July 2026. Planned features (MTI API, MIE dashboard wiring, verified guidance retrieval) were not scored as shipped.*
