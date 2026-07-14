import { generateMunaInsights } from "@/lib/insights/orchestrator";
import { containsCausationLanguage } from "@/lib/insights/types";

function meal(date: string, foods: string): Record<string, unknown> {
  return {
    meal_date: date,
    foods,
    has_onion: foods.toLowerCase().includes("onion"),
    has_garlic: foods.toLowerCase().includes("garlic"),
  };
}

function symptom(date: string, bloating: number, stress?: number): Record<string, unknown> {
  return {
    symptom_date: date,
    bloating_level: bloating,
    ...(stress !== undefined ? { stress_level: stress } : {}),
  };
}

function water(date: string, liters: number): Record<string, unknown> {
  return { log_date: date, amount_ml: liters * 1000 };
}

function sleepLog(date: string, hours: number): Record<string, unknown> {
  return { sleep_date: date, hours };
}

function bowel(date: string, bristol: number, notes = ""): Record<string, unknown> {
  return { logged_at: date, bristol_type: bristol, notes };
}

function baseInput(
  overrides: Partial<Parameters<typeof generateMunaInsights>[0]> = {}
): Parameters<typeof generateMunaInsights>[0] {
  return {
    meals: [],
    symptoms: [],
    water: [],
    sleep: [],
    bowel: [],
    profile: null,
    experiment: null,
    generatedAt: "2026-07-14T12:00:00.000Z",
    observationWindowDays: 14,
    ...overrides,
  };
}

type Case = { id: string; run: () => boolean };

export function runMunaInsightsVerification(): {
  passed: number;
  failed: number;
  errors: string[];
} {
  const cases: Case[] = [
    {
      id: "A. Onion appears in 2 of 4 higher-bloating meals",
      run: () => {
        const result = generateMunaInsights(
          baseInput({
            meals: [
              meal("2026-07-01", "onion soup"),
              meal("2026-07-02", "onion salad"),
              meal("2026-07-03", "onion pasta"),
              meal("2026-07-04", "onion rice"),
            ],
            symptoms: [symptom("2026-07-02", 6), symptom("2026-07-05", 5)],
          })
        );
        const onion = result.allInsights.find((insight) => insight.id.includes("onion"));
        return (
          Boolean(onion) &&
          onion!.summary.toLowerCase().includes("possible association") &&
          ["limited", "moderate"].includes(onion!.confidence) &&
          !containsCausationLanguage(onion!.summary)
        );
      },
    },
    {
      id: "B. Garlic logged twice without symptoms",
      run: () => {
        const result = generateMunaInsights(
          baseInput({
            meals: [meal("2026-07-01", "garlic bread"), meal("2026-07-03", "garlic chicken")],
            symptoms: [symptom("2026-07-02", 2)],
          })
        );
        const garlic = result.allInsights.find((insight) => insight.id.includes("garlic"));
        return (
          Boolean(garlic) &&
          garlic!.status === "insufficient_data" &&
          !garlic!.summary.toLowerCase().includes("safe")
        );
      },
    },
    {
      id: "C. No water entries",
      run: () => {
        const result = generateMunaInsights(baseInput({ water: [] }));
        const hydration = result.allInsights.find((insight) => insight.type === "hydration");
        return (
          Boolean(hydration) &&
          /no hydration data recorded/i.test(hydration!.summary) &&
          !/\bzero\b/i.test(hydration!.summary)
        );
      },
    },
    {
      id: "D. Five below-goal water days",
      run: () => {
        const result = generateMunaInsights(
          baseInput({
            profile: { water_goal_liters: 2 },
            water: [
              water("2026-07-01", 1),
              water("2026-07-02", 1.2),
              water("2026-07-03", 1.1),
              water("2026-07-04", 1.3),
              water("2026-07-05", 1),
            ],
          })
        );
        const hydration = result.allInsights.find((insight) => insight.type === "hydration");
        return (
          Boolean(hydration) &&
          hydration!.summary.toLowerCase().includes("below") &&
          !containsCausationLanguage(hydration!.summary)
        );
      },
    },
    {
      id: "E. Poor sleep and higher symptoms across repeated paired records",
      run: () => {
        const result = generateMunaInsights(
          baseInput({
            sleep: [
              sleepLog("2026-07-01", 5.5),
              sleepLog("2026-07-02", 5),
              sleepLog("2026-07-03", 6),
              sleepLog("2026-07-04", 5.5),
            ],
            symptoms: [
              symptom("2026-07-01", 5),
              symptom("2026-07-02", 6),
              symptom("2026-07-03", 5),
              symptom("2026-07-04", 6),
            ],
          })
        );
        const sleepAssociation = result.allInsights.find((insight) => insight.id === "sleep-symptom-association");
        return (
          Boolean(sleepAssociation) &&
          sleepAssociation!.summary.toLowerCase().includes("association") &&
          !containsCausationLanguage(sleepAssociation!.summary)
        );
      },
    },
    {
      id: "F. Bristol type 5 once",
      run: () => {
        const result = generateMunaInsights(
          baseInput({
            bowel: [bowel("2026-07-01", 5), bowel("2026-07-02", 4), bowel("2026-07-03", 4)],
          })
        );
        const bowelInsight = result.allInsights.find((insight) => insight.type === "bowel");
        return (
          Boolean(bowelInsight) &&
          !bowelInsight!.summary.toLowerCase().includes("diarrhoea") &&
          !bowelInsight!.title.toLowerCase().includes("looser")
        );
      },
    },
    {
      id: "G. Multiple Bristol 6–7 records",
      run: () => {
        const result = generateMunaInsights(
          baseInput({
            bowel: [
              bowel("2026-07-01", 6),
              bowel("2026-07-02", 7),
              bowel("2026-07-03", 4),
            ],
          })
        );
        const bowelInsight = result.allInsights.find((insight) => insight.id === "bowel-looser-trend");
        return (
          Boolean(bowelInsight) &&
          bowelInsight!.summary.toLowerCase().includes("6") &&
          !bowelInsight!.summary.toLowerCase().includes("diagnosis")
        );
      },
    },
    {
      id: "H. Completed onion experiment with mixed outcome",
      run: () => {
        const result = generateMunaInsights(
          baseInput({
            experiment: {
              experiment: {
                id: "exp-onion",
                user_id: "user-1",
                target_label: "onion",
                target_type: "food_reduction",
                start_date: "2026-07-01",
                duration_days: 5,
                status: "completed",
              },
              checkins: [
                { experiment_id: "exp-onion", user_id: "user-1", checkin_date: "2026-07-01", symptom_severity: 6, bloating_severity: 3, adhered: true },
                { experiment_id: "exp-onion", user_id: "user-1", checkin_date: "2026-07-02", symptom_severity: 4, bloating_severity: 6, adhered: true },
                { experiment_id: "exp-onion", user_id: "user-1", checkin_date: "2026-07-03", symptom_severity: 5, bloating_severity: 5, adhered: true },
                { experiment_id: "exp-onion", user_id: "user-1", checkin_date: "2026-07-04", symptom_severity: 4, bloating_severity: 4, adhered: false },
              ],
            },
          })
        );
        const experimentInsight = result.allInsights.find((insight) => insight.type === "experiment");
        return (
          Boolean(experimentInsight) &&
          experimentInsight!.summary.includes("4") &&
          !experimentInsight!.summary.toLowerCase().includes("proved") &&
          !containsCausationLanguage(experimentInsight!.summary)
        );
      },
    },
    {
      id: "I. Missing stress data",
      run: () => {
        const result = generateMunaInsights(
          baseInput({
            symptoms: [symptom("2026-07-01", 3), symptom("2026-07-02", 4)],
          })
        );
        return (
          result.unavailableDomains.includes("stress") &&
          !result.allInsights.some(
            (insight) => insight.type === "stress" && insight.status === "active" && insight.confidence !== "unavailable"
          )
        );
      },
    },
    {
      id: "J. Overall summary",
      run: () => {
        const result = generateMunaInsights(
          baseInput({
            water: [
              water("2026-07-01", 1),
              water("2026-07-02", 1.2),
              water("2026-07-03", 1.1),
            ],
            meals: [meal("2026-07-01", "rice"), meal("2026-07-02", "toast"), meal("2026-07-03", "oats")],
            symptoms: [symptom("2026-07-01", 2), symptom("2026-07-02", 2), symptom("2026-07-03", 3)],
          })
        );
        const overall = result.overallInsight;
        return (
          Boolean(overall) &&
          overall!.supportingEvidence.length <= 5 &&
          Boolean(overall!.suggestedNextStep) &&
          result.unavailableDomains.length > 0 &&
          overall!.summary.toLowerCase().includes("missing domains")
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
