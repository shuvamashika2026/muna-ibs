import { hydrationTrendConfidence } from "@/lib/insights/confidence";
import {
  ASSOCIATION_LIMITATION,
  createInsight,
  filterRowsWithinWindow,
  getDateFromRow,
  waterGoalFromProfile,
  waterLitersFromRow,
  type MunaInsight,
  type MunaInsightsInput,
} from "@/lib/insights/types";

function dailyWaterTotals(water: Record<string, unknown>[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of water) {
    const date = getDateFromRow(row);
    const liters = waterLitersFromRow(row);
    if (!date || liters === null) continue;
    totals.set(date, (totals.get(date) ?? 0) + liters);
  }
  return totals;
}

export function generateHydrationInsights(input: MunaInsightsInput): MunaInsight[] {
  const windowDays = input.observationWindowDays ?? 14;
  const water = filterRowsWithinWindow(input.water, input.generatedAt, windowDays);
  const goalLiters = waterGoalFromProfile(input.profile);
  const dailyTotals = dailyWaterTotals(water);
  const loggedDays = dailyTotals.size;

  if (loggedDays === 0) {
    return [
      createInsight({
        id: "hydration-no-data",
        type: "hydration",
        title: "No hydration data recorded",
        summary: "No hydration data recorded in your current logs for this window.",
        confidence: "unavailable",
        evidenceCount: 0,
        observationWindowDays: windowDays,
        supportingEvidence: ["No water entries were found."],
        limitations: ["Missing logs are not treated as zero intake."],
        status: "insufficient_data",
        isActionable: true,
        suggestedNextStep: "Log water when you can so MUNA can describe hydration patterns over time.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  if (loggedDays < 3) {
    return [
      createInsight({
        id: "hydration-incomplete-logging",
        type: "hydration",
        title: "Incomplete hydration logging",
        summary: `Hydration was recorded on ${loggedDays} day(s), which is not yet enough for a trend observation.`,
        confidence: "unavailable",
        evidenceCount: loggedDays,
        observationWindowDays: windowDays,
        supportingEvidence: [`Logged hydration days: ${loggedDays}`, `Daily goal used: ${goalLiters.toFixed(1)} L`],
        limitations: ["Days without entries are not counted as zero intake."],
        status: "insufficient_data",
        isActionable: true,
        suggestedNextStep: "Log water on more days this week to build a clearer hydration picture.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  const dailyValues = Array.from(dailyTotals.values());
  const belowGoalDays = dailyValues.filter((value) => value < goalLiters).length;
  const metGoalDays = dailyValues.filter((value) => value >= goalLiters).length;
  const confidence = hydrationTrendConfidence(loggedDays, belowGoalDays);

  if (belowGoalDays >= 3 && belowGoalDays >= metGoalDays) {
    return [
      createInsight({
        id: "hydration-below-goal",
        type: "hydration",
        title: "Hydration often below your goal",
        summary: `On ${belowGoalDays} of ${loggedDays} logged day(s), water intake was below your ${goalLiters.toFixed(1)} L goal. This is a tracking observation only.`,
        confidence,
        evidenceCount: loggedDays,
        observationWindowDays: windowDays,
        supportingEvidence: [
          `Logged hydration days: ${loggedDays}`,
          `Days below goal: ${belowGoalDays}`,
          `Days at or above goal: ${metGoalDays}`,
        ],
        limitations: [
          ASSOCIATION_LIMITATION,
          "This does not prove hydration caused symptoms.",
          "Days without water entries are excluded, not treated as zero intake.",
        ],
        status: "active",
        isActionable: true,
        suggestedNextStep: "Try logging water at regular intervals to see whether intake stays closer to your goal.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  if (metGoalDays >= 3 && metGoalDays > belowGoalDays) {
    return [
      createInsight({
        id: "hydration-goal-met",
        type: "hydration",
        title: "Hydration goal often met",
        summary: `On ${metGoalDays} of ${loggedDays} logged day(s), water intake met or exceeded your ${goalLiters.toFixed(1)} L goal.`,
        confidence,
        evidenceCount: loggedDays,
        observationWindowDays: windowDays,
        supportingEvidence: [
          `Logged hydration days: ${loggedDays}`,
          `Days at or above goal: ${metGoalDays}`,
        ],
        limitations: ["This reflects logged intake only, not every calendar day."],
        status: "active",
        isActionable: false,
        suggestedNextStep: null,
        generatedAt: input.generatedAt,
      }),
    ];
  }

  return [
    createInsight({
      id: "hydration-mixed",
      type: "hydration",
      title: "Mixed hydration pattern",
      summary: `Your logged hydration pattern is mixed across ${loggedDays} day(s) relative to your ${goalLiters.toFixed(1)} L goal.`,
      confidence: "limited",
      evidenceCount: loggedDays,
      observationWindowDays: windowDays,
      supportingEvidence: [
        `Days below goal: ${belowGoalDays}`,
        `Days at or above goal: ${metGoalDays}`,
      ],
      limitations: [ASSOCIATION_LIMITATION, "Missing days are not treated as zero intake."],
      status: "active",
      isActionable: true,
      suggestedNextStep: "Keep logging water daily to clarify whether the pattern stabilises.",
      generatedAt: input.generatedAt,
    }),
  ];
}
