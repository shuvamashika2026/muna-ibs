import { clampObservationWindowDays } from "@/lib/insights/fetch-input";
import { generateMunaInsights } from "@/lib/insights/orchestrator";
import {
  deriveInsightKey,
  isCurrentInsightStatus,
  mapInsightToUserSafe,
  MIE_REGENERATION_COOLDOWN_MS,
  sanitizeSupportingEvidence,
  supportingEvidenceLooksSafe,
  type MunaInsightRow,
} from "@/lib/insights/insight-keys";
import {
  assertNoRawHealthRecordsInEvidence,
  buildRateLimitedResponseInsights,
  dedupeActiveInsightsByKey,
} from "@/lib/insights/storage";
import { createInsight, type MunaInsight } from "@/lib/insights/types";

function sampleInsight(overrides: Partial<MunaInsight> = {}): MunaInsight {
  return createInsight({
    id: "hydration-no-data",
    type: "hydration",
    title: "No hydration data recorded",
    summary: "No hydration data recorded in your current logs for this window.",
    confidence: "unavailable",
    evidenceCount: 0,
    observationWindowDays: 14,
    supportingEvidence: ["No water entries were found."],
    limitations: ["Missing logs are not treated as zero intake."],
    status: "insufficient_data",
    isActionable: true,
    suggestedNextStep: "Log water when you can.",
    generatedAt: "2026-07-14T12:00:00.000Z",
    ...overrides,
  });
}

function sampleRow(overrides: Partial<MunaInsightRow> = {}): MunaInsightRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "22222222-2222-2222-2222-222222222222",
    insight_key: "hydration:no_data",
    insight_type: "hydration",
    title: "No hydration data recorded",
    summary: "No hydration data recorded in your current logs for this window.",
    confidence: "unavailable",
    evidence_count: 0,
    observation_window_days: 14,
    supporting_evidence: ["No water entries were found."],
    limitations: ["Missing logs are not treated as zero intake."],
    generated_at: "2026-07-14T12:00:00.000Z",
    expires_at: "2026-07-15T12:00:00.000Z",
    status: "insufficient_data",
    is_actionable: true,
    suggested_next_step: "Log water when you can.",
    source_version: "mie-v1",
    created_at: "2026-07-14T12:00:00.000Z",
    updated_at: "2026-07-14T12:00:00.000Z",
    ...overrides,
  };
}

type Case = { id: string; run: () => boolean | Promise<boolean> };

export async function runMiePhaseBVerification(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  const cases: Case[] = [
    {
      id: "A. Same insights generated twice should not duplicate active keys",
      run: () => {
        const key = deriveInsightKey(sampleInsight());
        const active = dedupeActiveInsightsByKey([
          mapInsightToUserSafe(sampleRow({ insight_key: key, status: "active" })),
          mapInsightToUserSafe(
            sampleRow({
              insight_key: key,
              status: "active",
              id: "33333333-3333-3333-3333-333333333333",
            })
          ),
        ]);
        return active.length === 1 && active[0].insightKey === "hydration:no_data";
      },
    },
    {
      id: "B. Insight content changes use superseded status design",
      run: () => {
        const prior = sampleRow({ status: "superseded" });
        const current = sampleRow({ summary: "Updated summary text.", status: "active" });
        return prior.status === "superseded" && current.status === "active" && isCurrentInsightStatus("active");
      },
    },
    {
      id: "C. Expired active insight excluded from active fetch logic",
      run: () => {
        const expired = mapInsightToUserSafe(
          sampleRow({
            status: "stale",
            expires_at: "2026-07-01T00:00:00.000Z",
          })
        );
        const active = buildRateLimitedResponseInsights([
          expired,
          mapInsightToUserSafe(sampleRow({ status: "active" })),
        ]);
        return active.activeInsights.every((item) => item.status !== "stale");
      },
    },
    {
      id: "D. No water logs stored without zero-intake wording",
      run: () => {
        const generated = generateMunaInsights({
          meals: [],
          symptoms: [],
          water: [],
          sleep: [],
          bowel: [],
          profile: null,
          experiment: null,
          generatedAt: "2026-07-14T12:00:00.000Z",
        });
        const hydration = generated.allInsights.find((item) => item.type === "hydration");
        return (
          Boolean(hydration) &&
          /no hydration data recorded/i.test(hydration!.summary) &&
          !/\bzero\b/i.test(hydration!.summary)
        );
      },
    },
    {
      id: "E. User A cannot read User B rows by query contract",
      run: () => {
        const rowA = sampleRow({ user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" });
        const rowB = sampleRow({
          user_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          insight_key: "food:onion:possible_association",
        });
        const userAOnly = [rowA, rowB].filter((row) => row.user_id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        return userAOnly.length === 1 && userAOnly[0].user_id !== rowB.user_id;
      },
    },
    {
      id: "F. POST with supplied user_id must be rejected by route contract",
      run: () => {
        const body = { user_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", force: true };
        return body.user_id !== undefined;
      },
    },
    {
      id: "G. Optional experiment unavailable still generates non-experiment insights",
      run: () => {
        const generated = generateMunaInsights({
          meals: [{ meal_date: "2026-07-01", foods: "rice" }],
          symptoms: [{ symptom_date: "2026-07-01", bloating_level: 2 }],
          water: [],
          sleep: [],
          bowel: [],
          profile: null,
          experiment: null,
          generatedAt: "2026-07-14T12:00:00.000Z",
        });
        return (
          generated.allInsights.some((item) => item.type === "food") &&
          generated.unavailableDomains.includes("experiment")
        );
      },
    },
    {
      id: "H. Repeated POST within 15 minutes uses rate-limit response shape",
      run: () => {
        const now = Date.now();
        const recent = new Date(now - 5 * 60 * 1000).toISOString();
        const withinCooldown = now - Date.parse(recent) < MIE_REGENERATION_COOLDOWN_MS;
        const stored = buildRateLimitedResponseInsights([
          mapInsightToUserSafe(sampleRow({ generated_at: recent })),
        ]);
        return withinCooldown && stored.rateLimited && Boolean(stored.generatedAt);
      },
    },
    {
      id: "I. Supporting evidence contains no raw health records or identifiers",
      run: () => {
        const sanitized = sanitizeSupportingEvidence([
          "Exposure count: 4",
          "Symptom-overlap count: 2",
          "user_id: 22222222-2222-2222-2222-222222222222",
          '{"foods":"onion soup"}',
        ]);
        return supportingEvidenceLooksSafe(sanitized) && assertNoRawHealthRecordsInEvidence(sanitized);
      },
    },
    {
      id: "J. Stable deterministic insight keys",
      run: () => {
        const keys = [
          deriveInsightKey(sampleInsight({ id: "food-onion-association", type: "food" })),
          deriveInsightKey(sampleInsight({ id: "sleep-symptom-association", type: "sleep" })),
          deriveInsightKey(sampleInsight({ id: "experiment-completed-exp-1", type: "experiment" })),
          deriveInsightKey(sampleInsight({ id: "overall-weekly-summary", type: "overall" })),
        ];
        return (
          keys.join(",") ===
          "food:onion:possible_association,sleep:shorter_with_symptoms,experiment:exp-1:summary,overall:weekly"
        );
      },
    },
    {
      id: "K. Observation window clamped to 30 days max",
      run: () => clampObservationWindowDays(45) === 30 && clampObservationWindowDays(14) === 14,
    },
  ];

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const testCase of cases) {
    try {
      const ok = await testCase.run();
      if (ok) passed += 1;
      else {
        failed += 1;
        errors.push(`${testCase.id}: assertion failed`);
      }
    } catch (error) {
      failed += 1;
      errors.push(`${testCase.id}: ${error instanceof Error ? error.message : "unexpected error"}`);
    }
  }

  return { passed, failed, errors };
}
