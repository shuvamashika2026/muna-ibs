# User Data Isolation — Two-Account Verification Checklist

Use this checklist after applying `supabase/migrations/20260716180000_user_data_isolation_rls.sql`.

## Setup

1. Create **Account A** and **Account B** in Supabase Auth (different emails).
2. Use a private/incognito window when switching accounts, or sign out fully between tests.
3. Confirm RLS migration applied: policies exist for `meals`, `symptoms`, `user_memory`, etc.

## Account A — create distinct data

- [ ] Sign in as Account A
- [ ] Profile: save a unique full name (e.g. `Account A Tester`)
- [ ] Meal: log `Account A breakfast`
- [ ] Symptom: log pain level **8**
- [ ] Bowel movement: log Bristol type **6**
- [ ] Water: log **500 mL**
- [ ] Sleep: log **6.0 h**
- [ ] Medication reminder: add `Account A med`
- [ ] Dashboard shows Account A name and non-zero stats from A's logs
- [ ] AI chat: ask a question; response should reference A's context only
- [ ] Trigger analysis: shows only A's trigger foods (if any marked)

## Switch to Account B

- [ ] Sign out Account A (Settings or header Sign out)
- [ ] Sign in as Account B
- [ ] Dashboard **must not** show Account A name, meals, symptoms, or stats
- [ ] Profile form **must be empty** except defaults (water 2500 ml, sleep 7.5 h)
- [ ] History page **must be empty** for today unless B logged data
- [ ] Trigger analysis **must be empty**
- [ ] Weekly report counts **must be zero** (— for averages)
- [ ] AI chat history **must be empty** on load
- [ ] Voice draft from A **must not** prefill B's meal/symptom/sleep forms

## Account B — create different data

- [ ] Profile: save `Account B Tester`
- [ ] Meal: log `Account B lunch`
- [ ] Symptom: log pain level **2**
- [ ] Dashboard reflects B's data only

## Switch back to Account A

- [ ] Sign out B, sign in A
- [ ] Dashboard shows A's original data
- [ ] B's meal/symptom **must not** appear

## SQL spot checks (Supabase SQL Editor, as Account A JWT or service role with filter)

```sql
-- Should return 0 rows for other users when run as authenticated user B querying without filter (RLS enforced)
SELECT COUNT(*) FROM public.meals WHERE user_id <> auth.uid();

-- user_memory is keyed by user_id
SELECT user_id, last_updated FROM public.user_memory ORDER BY last_updated DESC LIMIT 5;
```

## Automated smoke (code-level)

```bash
node scripts/run-user-isolation-verification.mjs
npm run lint
npm run build
```

Expected: isolation script passes; lint and build pass.
