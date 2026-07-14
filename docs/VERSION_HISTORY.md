# MUNA IBS — Version History

**Last updated:** 14 July 2026  
**Current status:** Pre-beta development  
**Package version:** `0.1.0`  
**Related docs:** [Architecture](./MUNA_ARCHITECTURE.md) · [Roadmap](./MUNA_ROADMAP.md)

Factual milestones derived from git history and implemented modules. Dates are approximate where commits span sprints.

---

## Timeline

### Foundation and authentication (2025 — early sprints)

- Next.js App Router application scaffold  
- Supabase Auth integration and login flow  
- Baseline health schema: meals, symptoms, bowel movements, water, sleep, medications, triggers, weekly reports (`supabase/schema.sql`)  
- Dashboard component architecture and navigation  

**Evidence:** Early sprint commits (`Sprint 3`, `Sprint 5`, Supabase env fixes)

---

### Health logging and dashboard intelligence (2025)

- Dedicated logging pages (meals, symptoms, water, sleep, bowel)  
- Analytics and food intelligence foundations  
- IBS risk prediction and dashboard intelligence (`src/lib/risk.ts`, dashboard redesign)  
- PWA manifest  

**Evidence:** `Sprint 8`–`Sprint 10`, `574887c`, `91a01f8`

---

### AI chat (2025)

- MUNA AI chat companion page  
- `/api/muna-ai` OpenAI integration  
- Voice-oriented UX experiments  
- Personalized health context in prompts  

**Evidence:** `cba02f7`, `f0f5bc7`, `b8e8983`

---

### Personal Memory (July 2026)

- `user_memory` table migration  
- Persistent memory JSON built from logs in `personal-health.ts`  
- Memory injected into MUNA AI and MIOS personal adapter  

**Evidence:** `20260712120000_user_memory.sql`, memory upsert in `muna-ai/route.ts`

---

### Experiment Mode v1 (July 2026)

- `experiments` and `experiment_checkins` tables  
- Deterministic experiment engine and safety rules  
- `/api/experiments` and experiment UI  
- MIOS experiment evidence adapter  

**Evidence:** `3f74de7`, `20260712130000_experiments.sql`

---

### Food Intelligence v1 (July 2026)

- Deterministic food classification and dashboard card  
- In-memory pattern detection from recent meals/symptoms  
- Not a separate database engine — uses existing meal rows  

**Evidence:** `744b0c1` checkpoint, `src/lib/food-intelligence.ts`

---

### Community Intelligence (July 2026)

- `community_knowledge` migration  
- Dataset validation and server-side retrieval  
- Safe labelling and safety triage themes  
- MIOS community adapter; integrated into MUNA AI  

**Evidence:** `9b209c3`, `20260714150000_community_knowledge.sql`

---

### Verified Guidance framework (July 2026)

- `verified_scientific_guidance` migration  
- Type definitions, record mapping, dataset validation  
- JSON source: `data/guidance/MUNA_Verified_IBS_Guidance_v1.json`  
- **Live AI retrieval stub** — not yet populating MIOS evidence  

**Evidence:** `20260714180000_verified_scientific_guidance.sql`, `src/lib/verified-guidance/`

---

### MIOS v1 — MUNA Intelligence Operating System (July 2026)

- Intent detection, evidence merge, authority ordering  
- Safety, personal, experiment, community, verified adapters  
- `orchestrateMios()` integrated into `/api/muna-ai`  
- Route integration verification suite  

**Evidence:** `a5ef763`, `src/lib/mios/`

---

### MDRE v1 — MUNA Dynamic Response Engine (July 2026)

- Template catalogue and selector  
- Structured JSON output from OpenAI  
- Emergency template hardening  
- AI chat card rendering driven by template metadata  

**Evidence:** `dc615a2` checkpoint, `src/lib/response-engine/`

---

### MIE Phase A — MUNA Insight Engine (July 2026)

- Deterministic domain insight generators  
- `generateMunaInsights()` orchestrator  
- In-memory verification (10 cases)  
- No OpenAI, no DB  

**Evidence:** `e2fdf68` checkpoint, `src/lib/insights/`

---

### MIE Phase B — storage and API (July 2026)

- `muna_insights` migration  
- Server-side storage, supersede/stale strategy  
- `GET/POST /api/insights` with Bearer auth  
- Client API helper and dashboard temporary test panel  
- **Not connected to MUNA AI or production dashboard insights UI**  

**Evidence:** `833b1e4` checkpoint, `20260714200000_muna_insights.sql`

---

### MTI Phase A — MUNA Timeline Intelligence (July 2026)

- `muna_events` migration  
- `generateTimelineEvents()` from MIE insights  
- Storage helpers and verification  
- **No API route or UI**  

**Evidence:** `src/lib/timeline/`, `20260714210000_muna_events.sql`

---

## Current release posture

| Attribute | Value |
|-----------|-------|
| **Status** | Pre-beta development |
| **Version** | 0.1.0 |
| **Production AI** | MUNA AI with MIOS + MDRE |
| **Insights product surface** | API + dev test only |
| **Verified guidance in AI** | Not live |
| **MTI product surface** | Library only |

---

## How to update this document

When merging significant features:

1. Add a dated milestone with git commit or migration reference  
2. State whether the feature is user-visible or internal-only  
3. Update [MUNA_ROADMAP.md](./MUNA_ROADMAP.md) completed/next lists  

Do not mark planned work as shipped without code evidence.
