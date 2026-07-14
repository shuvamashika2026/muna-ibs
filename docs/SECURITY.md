# MUNA IBS — Security & Privacy

**Last updated:** 14 July 2026  
**Related docs:** [Architecture](./MUNA_ARCHITECTURE.md) · [Database](./DATABASE.md) · [AI Pipeline](./AI_PIPELINE.md)

MUNA IBS is an **educational and pattern-awareness** product. Security controls aim to protect personal health data, separate community content from clinical evidence, and prevent unsafe AI behaviour — not to certify MUNA as a medical device.

---

## Supabase authentication

- Users authenticate through **Supabase Auth** (`auth.users`).
- Browser client: `src/lib/supabase.ts` (anon/publishable key only).
- Sessions are stored in the browser (localStorage via Supabase JS) — **not** automatically sent to Next.js API routes.

---

## Bearer-token flow

All privileged API routes expect the client to send:

```http
Authorization: Bearer <access_token>
```

Implementation: `src/lib/supabase/request-auth.ts`

- `extractBearerToken(request)`
- `authenticateSupabaseRequest(request)` → `supabase.auth.getUser(accessToken)`
- User-scoped Supabase client attaches the same token for RLS queries

Routes using this pattern:

- `/api/muna-ai` (soft-fail without token)
- `/api/insights` (401 without token)
- `/api/experiments` (401 without token)
- `/api/daily-brief` (degraded without token)

**Never** accept client-supplied `user_id` / `userId` on insight generation (`POST /api/insights` returns 400).

---

## Service-role usage

Service role key: `SUPABASE_SERVICE_ROLE_KEY` — read only in `src/lib/supabase/admin.ts`.

**Used for:**

- Community knowledge retrieval
- `muna_insights` INSERT/UPDATE (supersede, stale)
- `muna_events` INSERT/UPDATE (when invoked server-side)

**Never:**

- Import in client components  
- Expose in API responses  
- Log or commit in repository  

Client bundles must only contain `NEXT_PUBLIC_SUPABASE_*` keys.

---

## RLS principles

| Pattern | Example tables |
|---------|----------------|
| User owns row → full client CRUD | `meals`, `symptoms`, `user_memory`, `experiments` |
| User owns row → SELECT only | `muna_insights`, `muna_events` |
| No client policies → server only | `community_knowledge`, `verified_scientific_guidance` |

Default deny: if no policy grants access, client cannot read or write.

---

## Environment-variable handling

Typical server-only variables (names only — **do not commit values**):

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Public (browser-safe):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

**Rules:**

- Never commit `.env.local` or secrets to git (see `.gitignore`).
- Configure secrets in Vercel/host environment for production.
- Rotate keys if exposed.

---

## Health-data privacy

- Personal logs stay in user-scoped tables with RLS.
- Server routes aggregate logs into summaries for AI and insights.
- **MIE** persists only derived insight fields — not raw meal/symptom rows, chat, or prompts (`supporting_evidence` is sanitised).
- **`internalSummary`** from MIE is never stored or returned by API.
- Personal Memory stores derived JSON, not full log exports.

---

## Community-data separation

- `community_knowledge` has **no** `user_id` — anonymised corpus.
- Retrieved only server-side with service role.
- Always labelled anecdotal in MIOS and prompts.
- **Never treat community reports as clinical evidence or prevalence statistics.**

Safety themes from community retrieval can trigger emergency handling alongside route regex checks.

---

## Verified-guidance approval requirement

- Rows in `verified_scientific_guidance` may be `draft`, `reviewed`, or `approved`.
- MIOS adapter filters to **`approved` + `is_active`** when retrieval is enabled.
- **Current codebase:** retrieval stub returns empty — drafts cannot reach users via that path today.
- Dataset imports must not activate draft content in production retrieval.

---

## MIE insight privacy (Phase B)

- Generation server-side only (service role writes).
- GET `/api/insights` returns user-safe objects only.
- Blocked insights: `coachingBlocked: true`; no detailed sensitive clinical instructions.
- Rate limit: 15-minute regeneration cooldown unless `force=true` (authenticated).

---

## Emergency-safety behaviour

- Emergency intent and red-flag patterns force MDRE **emergency** template.
- System prompt instructs urgent medical care for red-flag symptoms.
- MIE bowel blocked insights stored as safety markers only.
- MUNA does **not** provide emergency treatment instructions from MIE/MTI.

---

## Prohibited logging (policy)

Do **not** persist or expose:

- Raw OpenAI prompts or chain-of-thought  
- Full user chat exports in analytics tables  
- Service-role keys or user JWTs in logs  
- Community `raw_record` blobs to end users without curation  

Application code does not implement a dedicated audit-log table in v1.

---

## Deployment-security checklist

- [ ] Supabase RLS enabled on all public tables  
- [ ] Service role key only in server environment  
- [ ] `.env.local` gitignored; secrets in host dashboard  
- [ ] Migrations applied in order before enabling insight/event APIs  
- [ ] Community and verified tables have no anon/authenticated write policies  
- [ ] CORS / same-origin API usage for authenticated routes  
- [ ] OpenAI key restricted to server route  
- [ ] Review temporary dashboard insight test panel before public beta  
- [ ] Confirm `profiles` / schema alignment in target database  

---

## Explicit security statements

1. **Never expose service-role keys** to the browser or client bundles.  
2. **Never commit `.env.local`** or production secrets to the repository.  
3. **Never store raw prompts or internal reasoning** in user-visible tables or API responses.  
4. **Never treat community reports as clinical evidence.**  
5. MUNA is **not** a diagnostic or clinical-decision system.

See also [DATABASE.md](./DATABASE.md) for per-table RLS detail.
