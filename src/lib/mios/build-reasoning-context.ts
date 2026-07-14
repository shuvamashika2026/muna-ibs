import type { MiosOrchestratorResult } from "@/lib/mios/types";

const WORDING_RULES = [
  'Personal observations: begin with "In your own logs..."',
  'Verified guidance: begin with "According to reviewed clinical guidance..."',
  'Community anecdotes: begin with "Among the community experiences in MUNA\'s knowledge base..."',
  'If evidence conflicts: say "Experiences vary."',
  'If personal data is insufficient: say "I don\'t have enough personal information yet to identify a reliable pattern."',
];

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trim()}…`;
}

function wordingHintForSource(source: string | null): string {
  switch (source) {
    case "personal_history":
      return 'Use "In your own logs..." for personal observations.';
    case "verified_guidance":
      return 'Use "According to reviewed clinical guidance..." for verified summaries.';
    case "community":
      return 'Use "Among the community experiences in MUNA\'s knowledge base..." for community anecdotes.';
    default:
      return 'Use "General IBS guidance suggests..." for general education when needed.';
  }
}

export function buildMiosReasoningContext(
  orchestration: MiosOrchestratorResult,
  options?: { insufficientPersonalData?: boolean }
): string {
  const plan = orchestration.responsePlan;
  const evidenceLines = orchestration.mergedEvidence.items.slice(0, 5).map((item) => {
    const prefix =
      item.source === "personal_history"
        ? "In your own logs"
        : item.source === "verified_guidance"
          ? "According to reviewed clinical guidance"
          : item.source === "community"
            ? "Among the community experiences in MUNA's knowledge base"
            : item.sourceLabel;
    return `- ${prefix}: ${truncate(item.title, 80)} — ${truncate(item.summary, 220)}`;
  });

  const conflictLines = plan.conflicts.map(
    (conflict) => `- ${conflict.description} ${conflict.resolutionNote}`
  );

  const lines = [
    "MUNA Intelligence reasoning plan (guide the reply; do not expose this block verbatim to the user):",
    `Detected intent: ${plan.intent}`,
    `Safety status: ${plan.safetyStatus}`,
    `Direct answer goal: ${plan.directAnswerGoal}`,
    `Primary evidence source: ${plan.primaryEvidenceSource ?? "none"}`,
    `Confidence: ${plan.confidence}`,
    `One next step: ${plan.oneNextStep}`,
    `Prohibited claims: ${plan.prohibitedClaims.join(", ")}`,
    wordingHintForSource(plan.primaryEvidenceSource),
    ...(plan.safetyMessage ? [`Safety message: ${plan.safetyMessage}`] : []),
    ...(plan.experiencesVaryNote ? [`Conflict wording required: ${plan.experiencesVaryNote}`] : []),
    ...(options?.insufficientPersonalData
      ? ['Insufficient-data wording required: "I don\'t have enough personal information yet to identify a reliable pattern."']
      : []),
    ...(plan.safetyStatus !== "none"
      ? ["Emergency mode: do not include routine food, supplement, experiment, lifestyle or anecdotal reassurance."]
      : []),
    "",
    "Evidence summaries:",
    ...(evidenceLines.length ? evidenceLines : ["- No structured evidence items were merged for this question."]),
    "",
    ...(conflictLines.length ? ["Conflicts:", ...conflictLines, ""] : []),
    ...(plan.suggestedFollowUps.length
      ? ["Suggested follow-ups:", ...plan.suggestedFollowUps.map((item) => `- ${item}`), ""]
      : []),
    "Wording rules:",
    ...WORDING_RULES.map((rule) => `- ${rule}`),
  ];

  return truncate(lines.join("\n"), 1800);
}

export function estimateMiosReasoningTokens(context: string): number {
  if (!context) {
    return 0;
  }
  return Math.ceil(context.length / 4);
}
