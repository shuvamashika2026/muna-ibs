# MUNA IBS — Product Roadmap

**Last updated:** 14 July 2026  
**Status:** Pre-beta development  
**Related docs:** [Architecture](./MUNA_ARCHITECTURE.md) · [Version History](./VERSION_HISTORY.md)

This roadmap reflects **what exists in the repository today** versus planned work. Planned items are not described as completed.

---

## Completed

These capabilities have implementation in `src/` and/or Supabase migrations:

| Area | Evidence in codebase |
|------|----------------------|
| **Authentication** | Supabase Auth, login page, Bearer token API pattern |
| **Health logging** | Meal, symptom, bowel, water, sleep, medication pages; baseline schema |
| **Dashboard** | `src/app/dashboard/page.tsx`, risk/gut score, daily brief card, food intelligence card |
| **Personal Memory** | `user_memory` table, `personal-health.ts`, MUNA AI integration |
| **Experiments** | `experiments` / `experiment_checkins` migrations, experiment engine, `/api/experiments`, UI |
| **Community knowledge** | `community_knowledge` migration, retrieval + MIOS adapter |
| **MIOS v1** | `src/lib/mios/` orchestration, intent, evidence merge, route integration |
| **MDRE v1** | `src/lib/response-engine/`, structured cards in AI chat |
| **MIE Phase A** | Deterministic `generateMunaInsights()`, domain modules, verification |
| **MIE Phase B** | `muna_insights` migration, `/api/insights`, storage, authenticated API client |

---

## Next (near-term)

Priorities aligned with current pre-beta gaps:

| Item | Notes |
|------|-------|
| **Fix experiments API 500 error** | `/api/experiments` reported failing in some environments; needs stable authenticated CRUD |
| **Remove temporary insight test panel** | Dashboard “Temporary Development Test” block calling `generateInsightsFromApi()` |
| **MTI Timeline Intelligence (Phase B+)** | Phase A library + `muna_events` migration exist; needs API wiring, MIE hook, and UI |
| **Approved verified-guidance retrieval** | Wire `fetchVerifiedGuidanceEvidenceForMios()` to return `review_status = approved` rows only |
| **Explain My Answer** | User-facing explanation layer for AI responses (not implemented) |
| **Dashboard insight integration** | Surface MIE insights in dashboard (replace dev test panel with product UI) |
| **Weekly digest** | Scheduled or on-demand summary (partially related to MIE overall + daily brief) |
| **Clinical timeline** | User-facing timeline from MTI events |
| **Deployment and beta testing** | Production hardening, migration apply, limited user cohort |

---

## Later

| Item | Notes |
|------|-------|
| **Knowledge Memory** | Long-horizon memory beyond current `user_memory` JSON |
| **Digital twin** | Personal model / simulation — not in codebase |
| **Research analytics** | Aggregated, consented analytics — not in codebase |
| **Clinician report** | Export-oriented reporting (`weekly_reports` table exists; full clinician workflow not built) |
| **Mobile store release** | PWA exists; native store packaging not in current scope |

---

## Explicitly not on “Completed”

Do not treat these as shipped product features yet:

- Verified guidance in live AI answers  
- MIE-driven dashboard insights (production UI)  
- MIE connected to MUNA AI  
- MTI API or timeline UI  
- Knowledge Memory  
- Explain My Answer  
- Clinical / clinician workflows  

---

## Documentation maintenance

When a roadmap item ships, update:

1. This file (move item to **Completed** with evidence)  
2. [MUNA_ARCHITECTURE.md](./MUNA_ARCHITECTURE.md) status tables  
3. [VERSION_HISTORY.md](./VERSION_HISTORY.md) milestone entry  
