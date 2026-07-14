import { mapApprovedVerifiedGuidanceToEvidence } from "@/lib/mios/adapters/verified";
import { prepareMiosForRoute } from "@/lib/mios/prepare-orchestration";
import { orchestrateMios } from "@/lib/mios/orchestrator";
import type { MiosEvidenceItem } from "@/lib/mios/types";
import { MIOS_SOURCE_LABELS } from "@/lib/mios/types";
import type { VerifiedGuidanceItem } from "@/lib/verified-guidance/types";

function item(
  partial: Omit<MiosEvidenceItem, "sourceLabel"> & { source: MiosEvidenceItem["source"] }
): MiosEvidenceItem {
  return { ...partial, sourceLabel: MIOS_SOURCE_LABELS[partial.source] };
}

function emptyProfile() {
  const unavailable = { kind: "unavailable" as const, label: "Unavailable", value: "none logged" };
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    hasPersonalPatterns: false,
    generalFodmapFoods: [],
    likelyTriggerFoods: [],
    userMarkedTriggerFoods: [],
    toleratedFoods: [],
    averageSleep: unavailable,
    hydrationHabits: unavailable,
    stressTrends: unavailable,
    bowelTrends: unavailable,
    ibsSubtype: unavailable,
    userPreferences: [],
  };
}

function emptySummary() {
  return {
    authenticated: true,
    confidenceLabel: "Low",
    relevantLoggedDays: 0,
    totalRecords: 0,
    hasInsufficientData: true,
    latestPain: null,
    latestBloating: null,
    latestStress: null,
    latestSleepHours: null,
    latestBristol: null,
    latestWaterLiters: null,
    observedPositiveHabits: [],
    possibleAssociations: [],
    knownTriggers: [],
  };
}

type Case = { id: string; run: () => boolean | Promise<boolean> };

export async function runMiosRouteIntegrationVerification(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  const cases: Case[] = [
    {
      id: "A. Garlic question with personal tolerance and conflicting community reports",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "Can I eat garlic?",
          personalEvidence: [
            item({
              id: "p1",
              source: "personal_history",
              title: "Garlic tolerance",
              summary: "Garlic logged on days without elevated symptoms; tolerated in your logs.",
              confidence: "moderate",
              relevance: "high",
              limitations: [],
              isAvailable: true,
              topics: ["garlic"],
            }),
          ],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [],
          communityEvidence: [
            item({
              id: "c1",
              source: "community",
              title: "Garlic reports",
              summary: "Some community members report garlic as a possible trigger for bloating.",
              confidence: "limited",
              relevance: "moderate",
              limitations: [],
              isAvailable: true,
              topics: ["garlic", "bloating"],
            }),
          ],
          safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
        });
        return (
          result.detectedIntent === "food" &&
          result.responsePlan.primaryEvidenceSource === "personal_history" &&
          result.responsePlan.experiencesVaryNote === "Experiences vary."
        );
      },
    },
    {
      id: "B. Bloating with insufficient personal data",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "Why am I bloated?",
          personalEvidence: [],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [],
          communityEvidence: [
            item({
              id: "c1",
              source: "community",
              title: "Bloating",
              summary: "Variable bloating experiences reported.",
              confidence: "limited",
              relevance: "moderate",
              limitations: [],
              isAvailable: true,
            }),
          ],
          safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
        });
        return result.detectedIntent === "symptoms" && result.responsePlan.confidence === "limited";
      },
    },
    {
      id: "C. Blood in stool and weakness",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "There is blood in the toilet and I feel weak",
          personalEvidence: [],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [],
          communityEvidence: [
            item({
              id: "c1",
              source: "community",
              title: "Routine tips",
              summary: "Peppermint mentioned",
              confidence: "limited",
              relevance: "low",
              limitations: [],
              isAvailable: true,
            }),
          ],
          safetyResult: {
            safetyMatched: true,
            safetyAction: "urgent_medical_assessment",
            matchedThemes: ["rectal_bleeding_or_black_stool"],
          },
        });
        return (
          result.detectedIntent === "emergency" &&
          result.responsePlan.safetyStatus === "critical" &&
          !result.mergedEvidence.items.some((entry) => entry.source === "community")
        );
      },
    },
    {
      id: "D. Medication dose request",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "How many mg of loperamide should I take?",
          personalEvidence: [],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [],
          communityEvidence: [],
          safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
        });
        return (
          result.detectedIntent === "medication" &&
          result.responsePlan.prohibitedClaims.includes("medication_dosing")
        );
      },
    },
    {
      id: "E. Completed experiment",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "Did my onion experiment help?",
          personalEvidence: [],
          experimentEvidence: [
            item({
              id: "e1",
              source: "experiment",
              title: "Onion experiment",
              summary: "Completed observation with moderate logging volume; does not establish causation.",
              confidence: "moderate",
              relevance: "high",
              limitations: ["No causation claim."],
              isAvailable: true,
            }),
          ],
          verifiedGuidanceEvidence: [],
          communityEvidence: [],
          safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
        });
        return (
          result.detectedIntent === "experiment" &&
          result.responsePlan.primaryEvidenceSource === "experiment" &&
          result.responsePlan.prohibitedClaims.includes("causation")
        );
      },
    },
    {
      id: "F. Draft verified guidance available locally",
      run: () => {
        const draftItem: VerifiedGuidanceItem = {
          external_id: "VG001",
          title: "Draft guidance",
          source_organisation: "NICE",
          source_type: "national_guideline",
          published_on: "2017-02-23",
          last_reviewed_on: null,
          topic: "ibs_overview",
          evidence_type: "guideline",
          summary: "Draft only",
          recommendation: "Draft only",
          contraindications: [],
          red_flags: [],
          citation_url: "https://www.nice.org.uk/guidance/cg61",
          citation_title: "NICE CG61",
          review_status: "draft",
          reviewer_note: "Draft",
          version: "1.0.0",
          is_active: true,
        };
        return mapApprovedVerifiedGuidanceToEvidence([draftItem]).length === 0;
      },
    },
    {
      id: "G. MIOS failure fallback",
      run: async () => {
        const preparation = await prepareMiosForRoute({
          message: "Can I eat garlic?",
          supabase: null,
          userId: undefined,
          memoryProfile: emptyProfile(),
          healthSummary: emptySummary(),
          routeRedFlagMatched: false,
          orchestrate: () => {
            throw new Error("simulated failure");
          },
        });

        return (
          preparation.usedMios === false &&
          preparation.reasoningContext === "" &&
          typeof preparation.legacyCommunityContextBlock === "string"
        );
      },
    },
  ];

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const testCase of cases) {
    try {
      const ok = await testCase.run();
      if (ok) {
        passed += 1;
      } else {
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
