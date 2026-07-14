import { detectIntent } from "@/lib/mios/intent";
import { mergeEvidence } from "@/lib/mios/evidence";
import { buildResponsePlan } from "@/lib/mios/response-plan";
import type {
  MiosInternalDecisionSummary,
  MiosOrchestratorInput,
  MiosOrchestratorResult,
  MiosSafetyStatus,
} from "@/lib/mios/types";

function resolveSafetyStatusFromInput(input: MiosOrchestratorInput): MiosSafetyStatus {
  const intent = detectIntent(input.currentQuestion);
  if (intent === "emergency" || input.safetyResult.safetyMatched) {
    return input.safetyResult.safetyAction === "urgent_medical_assessment" ? "critical" : "matched";
  }
  return "none";
}

export function orchestrateMios(input: MiosOrchestratorInput): MiosOrchestratorResult {
  const detectedIntent =
    input.safetyResult.safetyMatched || detectIntent(input.currentQuestion) === "emergency"
      ? "emergency"
      : detectIntent(input.currentQuestion);

  const mergedEvidence = mergeEvidence({
    safetyResult: input.safetyResult,
    personalEvidence: input.personalEvidence,
    experimentEvidence: input.experimentEvidence,
    verifiedGuidanceEvidence: input.verifiedGuidanceEvidence,
    communityEvidence:
      detectedIntent === "emergency"
        ? input.communityEvidence.filter((item) => item.source === "safety")
        : input.communityEvidence,
  });

  const responsePlan = buildResponsePlan({
    intent: detectedIntent,
    safetyResult: input.safetyResult,
    mergedEvidence,
  });

  const evidenceSourcesUsed = [...new Set(mergedEvidence.items.map((item) => item.source))];

  const decisionSummary: MiosInternalDecisionSummary = {
    intent: detectedIntent,
    safetyStatus: resolveSafetyStatusFromInput(input),
    evidenceSourcesUsed,
    confidence: responsePlan.confidence,
    conflictCount: mergedEvidence.conflicts.length,
    unavailableEvidenceSources: mergedEvidence.unavailableSources,
  };

  return {
    detectedIntent,
    mergedEvidence,
    responsePlan,
    decisionSummary,
  };
}
