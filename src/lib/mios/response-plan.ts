import { aggregateConfidence } from "@/lib/mios/confidence";
import { primaryEvidenceSource } from "@/lib/mios/evidence";
import type {
  MiosIntent,
  MiosMergedEvidence,
  MiosProhibitedClaim,
  MiosResponsePlan,
  MiosSafetyResult,
  MiosSafetyStatus,
} from "@/lib/mios/types";
import { MIOS_DEFAULT_PROHIBITED_CLAIMS } from "@/lib/mios/types";

function resolveSafetyStatus(intent: MiosIntent, safetyResult: MiosSafetyResult): MiosSafetyStatus {
  if (intent === "emergency" || safetyResult.safetyMatched) {
    return safetyResult.safetyAction === "urgent_medical_assessment" ? "critical" : "matched";
  }
  return "none";
}

function directAnswerGoalForIntent(intent: MiosIntent): string {
  switch (intent) {
    case "emergency":
      return "Advise urgent or prompt medical assessment without routine lifestyle advice.";
    case "food":
      return "Discuss food choice using personal logs first, then general guidance, noting individual variation.";
    case "symptoms":
      return "Explain possible symptom patterns from available logs without claiming causation.";
    case "bowel_habits":
      return "Discuss bowel habit patterns and when reassessment may be needed.";
    case "medication":
      return "Avoid dosing advice and encourage clinician review for medication questions.";
    case "experiment":
      return "Summarise what the personal experiment logs show without proving causation.";
    case "lifestyle":
      return "Explain lifestyle associations in general terms and relate to logs when available.";
    case "education":
      return "Provide general educational information without diagnosing.";
    case "emotional_support":
      return "Offer supportive acknowledgement and gentle next steps without forcing medical advice.";
    case "general":
      return "Respond helpfully within general IBS education boundaries.";
  }
}

function oneNextStepForIntent(intent: MiosIntent, safetyStatus: MiosSafetyStatus): string {
  if (safetyStatus !== "none") {
    return "Seek urgent or prompt medical review for the symptoms described.";
  }

  switch (intent) {
    case "food":
      return "Continue logging meals and symptoms to notice your personal pattern.";
    case "symptoms":
      return "Log today's symptoms and any recent meals or stressors.";
    case "bowel_habits":
      return "Track bowel habit changes over the next few days.";
    case "medication":
      return "Discuss medication questions with your prescribing clinician.";
    case "experiment":
      return "Review your experiment check-ins before changing your plan.";
    case "lifestyle":
      return "Notice whether sleep, stress or routine changes align with symptoms in your logs.";
    case "education":
      return "Ask a follow-up question about the part you would like to understand better.";
    case "emotional_support":
      return "Choose one small calming step that feels manageable today.";
    case "general":
      return "Tell MUNA what you would like to understand or track next.";
    case "emergency":
      return "Seek urgent medical care now.";
  }
}

function buildEvidenceSummary(merged: MiosMergedEvidence): string {
  if (!merged.items.length) {
    return "No structured evidence was available for this question.";
  }

  return merged.items
    .slice(0, 5)
    .map((item) => `${item.sourceLabel}: ${item.title} — ${item.summary}`)
    .join(" | ");
}

function suggestedFollowUps(intent: MiosIntent): string[] {
  switch (intent) {
    case "food":
      return ["Would you like to review recent meals linked to this food?"];
    case "symptoms":
      return ["Would you like to log today's symptom severity?"];
    case "experiment":
      return ["Would you like to see your latest experiment check-ins?"];
    case "emotional_support":
      return ["Would you like a brief calming routine suggestion?"];
    default:
      return [];
  }
}

export function buildResponsePlan(input: {
  intent: MiosIntent;
  safetyResult: MiosSafetyResult;
  mergedEvidence: MiosMergedEvidence;
  prohibitedClaims?: MiosProhibitedClaim[];
}): MiosResponsePlan {
  const safetyStatus = resolveSafetyStatus(input.intent, input.safetyResult);
  const primarySource = primaryEvidenceSource(input.mergedEvidence, input.safetyResult.safetyMatched);
  const confidence = aggregateConfidence(input.mergedEvidence.items);
  const hasConflict = input.mergedEvidence.conflicts.length > 0;

  return {
    intent: input.intent,
    safetyStatus,
    directAnswerGoal: directAnswerGoalForIntent(input.intent),
    acknowledgementNeeded:
      input.intent === "emotional_support" ||
      input.intent === "symptoms" ||
      safetyStatus !== "none",
    primaryEvidenceSource: primarySource,
    evidenceSummary: buildEvidenceSummary(input.mergedEvidence),
    conflicts: input.mergedEvidence.conflicts,
    confidence,
    oneNextStep: oneNextStepForIntent(input.intent, safetyStatus),
    safetyMessage:
      safetyStatus === "none"
        ? null
        : "This may need urgent or prompt medical assessment. Do not rely on anecdotal reports or routine self-care alone.",
    prohibitedClaims: input.prohibitedClaims ?? MIOS_DEFAULT_PROHIBITED_CLAIMS,
    suggestedFollowUps: suggestedFollowUps(input.intent),
    experiencesVaryNote: hasConflict ? "Experiences vary." : null,
  };
}
