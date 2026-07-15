import type { MiosOrchestratorResult, MiosSafetyStatus } from "@/lib/mios/types";
import type { MdreSelection, ResponseTemplate, UserSafeEvidenceSummary } from "@/lib/response-engine/types";
import { CONFIDENCE_BADGE_TEMPLATES as BADGE_TEMPLATES } from "@/lib/response-engine/types";

function isUrgentSafety(safetyStatus: MiosSafetyStatus): boolean {
  return safetyStatus === "critical" || safetyStatus === "matched";
}

export function mustUseCrisisTemplate(input: {
  intent: MdreSelection["intent"];
  safetyStatus: MiosSafetyStatus;
  crisisSafety?: boolean;
}): boolean {
  return (
    Boolean(input.crisisSafety) ||
    input.safetyStatus === "crisis" ||
    input.intent === "crisis"
  );
}

export function mustUseEmergencyTemplate(input: {
  intent: MdreSelection["intent"];
  safetyStatus: MiosSafetyStatus;
  urgentSafety?: boolean;
  crisisSafety?: boolean;
}): boolean {
  if (mustUseCrisisTemplate(input)) {
    return false;
  }

  return (
    Boolean(input.urgentSafety) ||
    isUrgentSafety(input.safetyStatus) ||
    input.intent === "emergency"
  );
}

export function selectResponseTemplate(input: {
  intent: MdreSelection["intent"];
  safetyStatus: MiosSafetyStatus;
  urgentSafety?: boolean;
  crisisSafety?: boolean;
}): ResponseTemplate {
  if (mustUseCrisisTemplate(input)) {
    return "crisis";
  }

  if (mustUseEmergencyTemplate(input)) {
    return "emergency";
  }

  const intentToTemplate: Record<MdreSelection["intent"], ResponseTemplate> = {
    crisis: "crisis",
    emergency: "emergency",
    medication: "medication",
    food: "food",
    symptoms: "symptoms",
    experiment: "experiment",
    emotional_support: "emotional_support",
    education: "education",
    bowel_habits: "bowel_habits",
    lifestyle: "lifestyle",
    general: "general",
  };

  return intentToTemplate[input.intent] ?? "general";
}

export function shouldShowConfidenceBadge(template: ResponseTemplate): boolean {
  if (template === "crisis" || template === "emergency") {
    return false;
  }
  return BADGE_TEMPLATES.includes(template);
}

export function shouldShowAssociationFooter(template: ResponseTemplate, safetyStatus: MiosSafetyStatus): boolean {
  if (safetyStatus === "crisis" || template === "crisis") {
    return false;
  }
  if (isUrgentSafety(safetyStatus) || template === "emergency") {
    return false;
  }
  return BADGE_TEMPLATES.includes(template);
}

export function buildMdreSelection(input: {
  orchestration: MiosOrchestratorResult | null;
  urgentSafety: boolean;
  crisisSafety?: boolean;
}): MdreSelection {
  const crisisDetected =
    Boolean(input.crisisSafety) ||
    input.orchestration?.detectedIntent === "crisis" ||
    input.orchestration?.responsePlan.safetyStatus === "crisis";

  if (crisisDetected) {
    return {
      intent: "crisis",
      template: "crisis",
      safetyStatus: "crisis",
      confidence: "unavailable",
      showConfidenceBadge: false,
    };
  }

  const intent = input.urgentSafety
    ? "emergency"
    : input.orchestration?.detectedIntent ?? "general";

  const safetyStatus = input.urgentSafety
    ? "critical"
    : input.orchestration?.responsePlan.safetyStatus ?? "none";

  const confidence = input.orchestration?.responsePlan.confidence ?? "limited";

  const template = selectResponseTemplate({
    intent,
    safetyStatus,
    urgentSafety: input.urgentSafety,
    crisisSafety: input.crisisSafety,
  });

  return {
    intent: template === "crisis" ? "crisis" : template === "emergency" ? "emergency" : intent,
    template,
    safetyStatus:
      template === "crisis"
        ? "crisis"
        : template === "emergency" && safetyStatus === "none"
          ? "critical"
          : safetyStatus,
    confidence,
    showConfidenceBadge: shouldShowConfidenceBadge(template),
  };
}

export function buildUserSafeEvidenceSummary(
  orchestration: MiosOrchestratorResult | null
): UserSafeEvidenceSummary {
  const empty: UserSafeEvidenceSummary = {
    personal: { available: false, label: "Personal logs" },
    verified: { available: false, label: "Reviewed guidance" },
    community: { available: false, label: "Community experience" },
    experiment: { available: false, label: "Experiment" },
  };

  if (orchestration?.detectedIntent === "crisis" || orchestration?.responsePlan.safetyStatus === "crisis") {
    return empty;
  }

  const items = orchestration?.mergedEvidence.items ?? [];

  const personalItems = items.filter((item) => item.source === "personal_history");
  const verifiedItems = items.filter((item) => item.source === "verified_guidance");
  const communityItems = items.filter((item) => item.source === "community");
  const experimentItems = items.filter((item) => item.source === "experiment");

  const joinSummaries = (summaries: string[]) => summaries.slice(0, 2).join(" ");

  return {
    personal: {
      available: personalItems.length > 0,
      label: "Personal logs",
      summary: personalItems.length ? joinSummaries(personalItems.map((item) => item.summary)) : undefined,
    },
    verified: {
      available: verifiedItems.length > 0,
      label: "Reviewed guidance",
      summary: verifiedItems.length ? joinSummaries(verifiedItems.map((item) => item.summary)) : undefined,
    },
    community: {
      available: communityItems.length > 0,
      label: "Community experience",
      summary: communityItems.length
        ? joinSummaries([
            ...(orchestration?.responsePlan.experiencesVaryNote
              ? [orchestration.responsePlan.experiencesVaryNote]
              : []),
            ...communityItems.map((item) => item.summary),
          ])
        : undefined,
    },
    experiment: {
      available: experimentItems.length > 0,
      label: "Experiment",
      summary: experimentItems.length ? joinSummaries(experimentItems.map((item) => item.summary)) : undefined,
    },
  };
}

export function buildMissingEvidence(orchestration: MiosOrchestratorResult | null): string[] {
  if (!orchestration || orchestration.detectedIntent === "crisis") {
    return [];
  }

  const unavailable = new Set(orchestration.mergedEvidence.unavailableSources);
  const summary = buildUserSafeEvidenceSummary(orchestration);
  const missing: string[] = [];

  if (!summary.personal.available) missing.push("personal logs");
  if (!summary.verified.available) missing.push("reviewed guidance");
  if (!summary.community.available) missing.push("community experience");
  if (!summary.experiment.available) missing.push("experiment observations");

  for (const source of unavailable) {
    if (source === "personal_history" && !missing.includes("personal logs")) missing.push("personal logs");
    if (source === "verified_guidance" && !missing.includes("reviewed guidance")) {
      missing.push("reviewed guidance");
    }
    if (source === "community" && !missing.includes("community experience")) {
      missing.push("community experience");
    }
    if (source === "experiment" && !missing.includes("experiment observations")) {
      missing.push("experiment observations");
    }
  }

  return [...new Set(missing)];
}

export function mapMiosConfidenceToDisplayLabel(
  confidence: MdreSelection["confidence"]
): "Limited" | "Moderate" | "Higher" {
  switch (confidence) {
    case "higher":
      return "Higher";
    case "moderate":
      return "Moderate";
    default:
      return "Limited";
  }
}
