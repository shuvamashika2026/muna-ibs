import { orchestrateMios } from "@/lib/mios/orchestrator";
import { detectIntent } from "@/lib/mios/intent";
import type { MiosEvidenceItem, MiosOrchestratorInput, MiosSafetyResult } from "@/lib/mios/types";
import { MIOS_SOURCE_LABELS } from "@/lib/mios/types";

function item(
  partial: Omit<MiosEvidenceItem, "sourceLabel"> & { source: MiosEvidenceItem["source"] }
): MiosEvidenceItem {
  return {
    ...partial,
    sourceLabel: MIOS_SOURCE_LABELS[partial.source],
  };
}

function emptySafety(): MiosSafetyResult {
  return { safetyMatched: false, safetyAction: null, matchedThemes: [] };
}

type VerificationCase = {
  id: string;
  run: () => boolean;
};

export function runMiosVerification(): {
  passed: number;
  failed: number;
  errors: string[];
} {
  const cases: VerificationCase[] = [
    {
      id: "A. Garlic question with personal tolerance and conflicting community reports",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "Can I eat garlic?",
          personalEvidence: [
            item({
              id: "personal-garlic",
              source: "personal_history",
              title: "Garlic tolerance in logs",
              summary: "Garlic logged 4 times on days without elevated symptoms; tolerated in your logs.",
              confidence: "moderate",
              relevance: "high",
              limitations: ["Association only, not proof of tolerance."],
              isAvailable: true,
              topics: ["garlic"],
            }),
          ],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [
            item({
              id: "verified-fodmap",
              source: "verified_guidance",
              title: "Low-FODMAP personalisation",
              summary: "Official guidance supports identifying personal food tolerance rather than permanent restriction.",
              confidence: "moderate",
              relevance: "moderate",
              limitations: ["General guidance only."],
              citationUrl: "https://www.monashfodmap.com/ibs-central/i-have-ibs/starting-the-low-fodmap-diet/",
              isAvailable: true,
            }),
          ],
          communityEvidence: [
            item({
              id: "community-garlic",
              source: "community",
              title: "Garlic and bloating reports",
              summary: "Some community members report garlic as a possible trigger for bloating.",
              confidence: "limited",
              relevance: "moderate",
              limitations: ["Anecdotal only."],
              isAvailable: true,
              topics: ["garlic", "bloating"],
            }),
          ],
          safetyResult: emptySafety(),
        });

        return (
          result.detectedIntent === "food" &&
          result.responsePlan.primaryEvidenceSource === "personal_history" &&
          result.mergedEvidence.conflicts.length > 0 &&
          result.responsePlan.experiencesVaryNote === "Experiences vary." &&
          result.mergedEvidence.items.some((entry) => entry.source === "personal_history")
        );
      },
    },
    {
      id: "B. Bloating question with limited personal data",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "Why am I bloated?",
          personalEvidence: [],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [],
          communityEvidence: [
            item({
              id: "community-bloat",
              source: "community",
              title: "Bloating experiences",
              summary: "Community reports describe variable bloating triggers.",
              confidence: "limited",
              relevance: "moderate",
              limitations: ["Anecdotal only."],
              isAvailable: true,
            }),
          ],
          safetyResult: emptySafety(),
        });

        return (
          result.detectedIntent === "symptoms" &&
          result.responsePlan.confidence === "limited" &&
          result.decisionSummary.unavailableEvidenceSources.includes("personal_history")
        );
      },
    },
    {
      id: "C. Blood in stool",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "There is blood in the toilet",
          personalEvidence: [],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [],
          communityEvidence: [
            item({
              id: "community-bloat-routine",
              source: "community",
              title: "Routine bloating tips",
              summary: "Peppermint and ginger are commonly mentioned.",
              confidence: "limited",
              relevance: "low",
              limitations: ["Not for emergency use."],
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
          result.responsePlan.safetyMessage !== null &&
          !result.mergedEvidence.items.some((entry) => entry.source === "community")
        );
      },
    },
    {
      id: "D. Medication dose question",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "How much loperamide should I take in mg?",
          personalEvidence: [],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [],
          communityEvidence: [],
          safetyResult: emptySafety(),
        });

        return (
          result.detectedIntent === "medication" &&
          result.responsePlan.prohibitedClaims.includes("medication_dosing") &&
          result.responsePlan.directAnswerGoal.includes("Avoid dosing advice")
        );
      },
    },
    {
      id: "E. Completed experiment with moderate evidence",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "Did my onion experiment help?",
          personalEvidence: [],
          experimentEvidence: [
            item({
              id: "experiment-onion",
              source: "experiment",
              title: "Onion reduction experiment",
              summary: "Completed 5-day observation with moderate logging volume; bloating scores varied without proving causation.",
              confidence: "moderate",
              relevance: "high",
              limitations: ["Does not establish causation."],
              isAvailable: true,
            }),
          ],
          verifiedGuidanceEvidence: [],
          communityEvidence: [],
          safetyResult: emptySafety(),
        });

        return (
          result.detectedIntent === "experiment" &&
          result.responsePlan.primaryEvidenceSource === "experiment" &&
          result.responsePlan.prohibitedClaims.includes("causation")
        );
      },
    },
    {
      id: "F. Emotional-support request with no request for medical advice",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "I feel hopeless today",
          personalEvidence: [],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [],
          communityEvidence: [],
          safetyResult: emptySafety(),
        });

        return (
          result.detectedIntent === "emotional_support" &&
          result.responsePlan.acknowledgementNeeded &&
          result.responsePlan.safetyStatus === "none"
        );
      },
    },
    {
      id: "G. General unrelated conversation",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "What is the weather like on Mars?",
          personalEvidence: [],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [],
          communityEvidence: [],
          safetyResult: emptySafety(),
        });

        return (
          result.detectedIntent === "general" &&
          result.responsePlan.confidence === "unavailable" &&
          result.mergedEvidence.items.length === 0
        );
      },
    },
    {
      id: "H. Tablets for diarrhoea → medication before bowel_habits",
      run: () => detectIntent("How many tablets should I take for diarrhoea?") === "medication",
    },
    {
      id: "I. Imodium tablet count → medication",
      run: () => detectIntent("Can I take two Imodium tablets?") === "medication",
    },
    {
      id: "J. Increase constipation medicine → medication",
      run: () => detectIntent("Should I increase my constipation medicine?") === "medication",
    },
    {
      id: "K. Overdose with faint → emergency",
      run: () => detectIntent("I took too many tablets and feel faint") === "emergency",
    },
    {
      id: "L. Diarrhoea with blood → emergency",
      run: () => detectIntent("I have diarrhoea and blood in the toilet") === "emergency",
    },
    {
      id: "M. Stool type question → bowel_habits",
      run: () => detectIntent("Why is my stool type 5?") === "bowel_habits",
    },
    {
      id: "N. Diarrhoea today → bowel_habits or symptoms",
      run: () => {
        const intent = detectIntent("I have diarrhoea today");
        return intent === "bowel_habits" || intent === "symptoms";
      },
    },
    {
      id: "O. Hopelessness without self-harm → emotional_support",
      run: () => detectIntent("I feel hopeless today") === "emotional_support",
    },
    {
      id: "P. Explicit suicide intent → crisis",
      run: () => detectIntent("I want to die") === "crisis",
    },
    {
      id: "Q. Self-harm intent → crisis",
      run: () => detectIntent("I might hurt myself tonight") === "crisis",
    },
    {
      id: "R. Accidental overdose with faint → emergency not crisis",
      run: () => detectIntent("I took too many pills by accident and feel faint") === "emergency",
    },
    {
      id: "S. Intentional overdose → crisis",
      run: () => detectIntent("I plan to overdose on purpose") === "crisis",
    },
    {
      id: "T. Crisis orchestration uses crisis safety status",
      run: () => {
        const result = orchestrateMios({
          currentQuestion: "I want to die",
          personalEvidence: [],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [],
          communityEvidence: [],
          safetyResult: emptySafety(),
        });
        return (
          result.detectedIntent === "crisis" &&
          result.responsePlan.safetyStatus === "crisis" &&
          result.responsePlan.suggestedFollowUps.length === 0
        );
      },
    },
  ];

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const testCase of cases) {
    try {
      if (testCase.run()) {
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

export function createDefaultOrchestratorInput(
  overrides: Partial<MiosOrchestratorInput> & Pick<MiosOrchestratorInput, "currentQuestion">
): MiosOrchestratorInput {
  return {
    personalEvidence: [],
    experimentEvidence: [],
    verifiedGuidanceEvidence: [],
    communityEvidence: [],
    safetyResult: emptySafety(),
    ...overrides,
  };
}
