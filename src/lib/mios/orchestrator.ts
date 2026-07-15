import { detectIntent } from "@/lib/mios/intent";
import { mergeEvidence } from "@/lib/mios/evidence";
import { buildResponsePlan } from "@/lib/mios/response-plan";
import type {
  MiosInternalDecisionSummary,
  MiosOrchestratorInput,
  MiosOrchestratorResult,
  MiosIntent,
  MiosSafetyStatus,
} from "@/lib/mios/types";

function resolveDetectedIntent(input: MiosOrchestratorInput): MiosIntent {
  const intent = detectIntent(input.currentQuestion);
  if (intent === "crisis") {
    return "crisis";
  }
  if (intent === "emergency" || input.safetyResult.safetyMatched) {
    return "emergency";
  }
  return intent;
}

function resolveSafetyStatusFromInput(input: MiosOrchestratorInput, intent: MiosIntent): MiosSafetyStatus {
  if (intent === "crisis") {
    return "crisis";
  }
  if (intent === "emergency" || input.safetyResult.safetyMatched) {
    return input.safetyResult.safetyAction === "urgent_medical_assessment" ? "critical" : "matched";
  }
  return "none";
}

export function orchestrateMios(input: MiosOrchestratorInput): MiosOrchestratorResult {
  const detectedIntent = resolveDetectedIntent(input);

  const mergedEvidence = mergeEvidence({
    safetyResult: input.safetyResult,
    personalEvidence: input.personalEvidence,
    experimentEvidence: input.experimentEvidence,
    verifiedGuidanceEvidence: input.verifiedGuidanceEvidence,
    communityEvidence:
      detectedIntent === "crisis" || detectedIntent === "emergency"
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
    safetyStatus: resolveSafetyStatusFromInput(input, detectedIntent),
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
