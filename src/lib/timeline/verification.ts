import { generateMunaInsights } from "@/lib/insights/orchestrator";
import { createInsight } from "@/lib/insights/types";
import { dedupeTimelineEventsByKey } from "@/lib/timeline/events";
import { generateTimelineEvents } from "@/lib/timeline/orchestrator";
import { applySupersedeToInMemoryEvents } from "@/lib/timeline/storage";
import {
  containsCausationLanguage,
  containsDiagnosisLanguage,
  containsRawLogLanguage,
} from "@/lib/timeline/types";

function meal(date: string, foods: string): Record<string, unknown> {
  return {
    meal_date: date,
    foods,
    has_onion: foods.toLowerCase().includes("onion"),
  };
}

function symptom(date: string, bloating: number): Record<string, unknown> {
  return { symptom_date: date, bloating_level: bloating };
}

function water(date: string, liters: number): Record<string, unknown> {
  return { log_date: date, amount_ml: liters * 1000 };
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

function allEventsSafe(events: ReturnType<typeof generateTimelineEvents>["allEvents"]): boolean {
  return events.every(
    (event) =>
      event.linkedInsightKey.length > 0 &&
      !containsCausationLanguage(`${event.title} ${event.summary}`) &&
      !containsDiagnosisLanguage(`${event.title} ${event.summary}`) &&
      !containsRawLogLanguage(`${event.title} ${event.summary}`)
  );
}

type Case = { id: string; run: () => boolean };

export function runTimelineVerification(): {
  passed: number;
  failed: number;
  errors: string[];
} {
  const cases: Case[] = [
    {
      id: "Duplicate prevention keeps one active event per key",
      run: () => {
        const mie = generateMunaInsights(
          baseInput({
            profile: { water_goal_liters: 2 },
            water: [
              water("2026-07-01", 1),
              water("2026-07-02", 1.1),
              water("2026-07-03", 1.2),
              water("2026-07-04", 1),
              water("2026-07-05", 1.1),
            ],
          })
        );
        const first = generateTimelineEvents({ insights: mie.allInsights });
        const second = generateTimelineEvents({ insights: mie.allInsights });
        const merged = dedupeTimelineEventsByKey([...first.allEvents, ...second.allEvents]);
        const keys = merged.map((event) => event.eventKey);
        return keys.length === new Set(keys).size;
      },
    },
    {
      id: "Supersede preserves prior rows in memory history",
      run: () => {
        const mie = generateMunaInsights(
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
        const initial = generateTimelineEvents({ insights: mie.allInsights });
        const updatedInsights = mie.allInsights.map((insight) =>
          insight.id.includes("onion")
            ? { ...insight, summary: `${insight.summary} Updated observation wording.` }
            : insight
        );
        const next = generateTimelineEvents({ insights: updatedInsights });
        const { nextActive, preservedHistory } = applySupersedeToInMemoryEvents(initial.allEvents, next.allEvents);
        return (
          preservedHistory.some((event) => event.status === "superseded") &&
          nextActive.every((event) => event.status === "active") &&
          preservedHistory.length >= nextActive.length
        );
      },
    },
    {
      id: "Blocked insight is ignored",
      run: () => {
        const blocked = createInsight({
          id: "bowel-blocked-red-flag",
          type: "bowel",
          title: "Bowel insight blocked for safety",
          summary: "Urgent symptom language was detected in bowel logs.",
          confidence: "unavailable",
          evidenceCount: 1,
          observationWindowDays: 14,
          supportingEvidence: ["Safety block applied."],
          limitations: ["Blocked insights are not promoted to timeline events."],
          status: "blocked",
          isActionable: false,
          suggestedNextStep: null,
          generatedAt: "2026-07-14T12:00:00.000Z",
        });
        const timeline = generateTimelineEvents({ insights: [blocked] });
        return timeline.allEvents.length === 0;
      },
    },
    {
      id: "No causation wording in generated events",
      run: () => {
        const mie = generateMunaInsights(
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
        const timeline = generateTimelineEvents({ insights: mie.allInsights });
        return allEventsSafe(timeline.allEvents);
      },
    },
    {
      id: "No diagnosis wording in generated events",
      run: () => {
        const mie = generateMunaInsights(
          baseInput({
            bowel: [
              { logged_at: "2026-07-01", bristol_type: 6 },
              { logged_at: "2026-07-02", bristol_type: 7 },
              { logged_at: "2026-07-03", bristol_type: 4 },
            ],
          })
        );
        const timeline = generateTimelineEvents({ insights: mie.allInsights });
        return timeline.allEvents.every(
          (event) => !containsDiagnosisLanguage(`${event.title} ${event.summary}`)
        );
      },
    },
    {
      id: "No raw personal logs in generated events",
      run: () => {
        const mie = generateMunaInsights(
          baseInput({
            meals: [meal("2026-07-01", "rice"), meal("2026-07-02", "toast"), meal("2026-07-03", "oats")],
            symptoms: [symptom("2026-07-01", 2), symptom("2026-07-02", 2), symptom("2026-07-03", 3)],
            water: [water("2026-07-01", 2.1), water("2026-07-02", 2.2), water("2026-07-03", 2.0)],
          })
        );
        const timeline = generateTimelineEvents({ insights: mie.allInsights });
        return timeline.allEvents.every(
          (event) => !containsRawLogLanguage(`${event.title} ${event.summary}`)
        );
      },
    },
    {
      id: "Food association maps to food_pattern",
      run: () => {
        const mie = generateMunaInsights(
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
        const timeline = generateTimelineEvents({ insights: mie.allInsights });
        const foodEvent = timeline.allEvents.find((event) => event.eventType === "food_pattern");
        const onionInsight = mie.allInsights.find((insight) => insight.id.includes("onion"));
        return (
          Boolean(foodEvent) &&
          Boolean(onionInsight) &&
          foodEvent!.linkedInsightKey.includes("onion") &&
          foodEvent!.linkedInsightKey.length > 0
        );
      },
    },
    {
      id: "Completed experiment maps to experiment_completed",
      run: () => {
        const mie = generateMunaInsights(
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
                {
                  experiment_id: "exp-onion",
                  user_id: "user-1",
                  checkin_date: "2026-07-01",
                  symptom_severity: 6,
                  bloating_severity: 3,
                  adhered: true,
                },
                {
                  experiment_id: "exp-onion",
                  user_id: "user-1",
                  checkin_date: "2026-07-02",
                  symptom_severity: 4,
                  bloating_severity: 6,
                  adhered: true,
                },
                {
                  experiment_id: "exp-onion",
                  user_id: "user-1",
                  checkin_date: "2026-07-03",
                  symptom_severity: 5,
                  bloating_severity: 5,
                  adhered: true,
                },
                {
                  experiment_id: "exp-onion",
                  user_id: "user-1",
                  checkin_date: "2026-07-04",
                  symptom_severity: 4,
                  bloating_severity: 4,
                  adhered: false,
                },
              ],
            },
          })
        );
        const timeline = generateTimelineEvents({ insights: mie.allInsights });
        return timeline.allEvents.some((event) => event.eventType === "experiment_completed");
      },
    },
    {
      id: "Overall improvement maps from overall insight direction",
      run: () => {
        const overall = createInsight({
          id: "overall-weekly-summary",
          type: "overall",
          title: "Weekly-style insight summary",
          summary:
            "Based on your strongest available observations: Hydration goal met on several days with stable patterns and relatively low stress logged.",
          confidence: "moderate",
          evidenceCount: 2,
          observationWindowDays: 14,
          supportingEvidence: ["hydration: Goal met", "stress: Relatively low"],
          limitations: ["This summary combines logged observations only."],
          status: "active",
          isActionable: true,
          suggestedNextStep: "Keep logging consistently.",
          generatedAt: "2026-07-14T12:00:00.000Z",
        });
        const timeline = generateTimelineEvents({ insights: [overall] });
        return (
          timeline.allEvents.some((event) => event.eventType === "overall_improvement") &&
          timeline.allEvents.some((event) => event.eventType === "weekly_summary")
        );
      },
    },
    {
      id: "Every event references an originating insight key",
      run: () => {
        const mie = generateMunaInsights(
          baseInput({
            profile: { water_goal_liters: 2 },
            water: [
              water("2026-07-01", 1),
              water("2026-07-02", 1.1),
              water("2026-07-03", 1.2),
              water("2026-07-04", 1),
              water("2026-07-05", 1.1),
            ],
          })
        );
        const timeline = generateTimelineEvents({ insights: mie.allInsights });
        return timeline.allEvents.every((event) => event.linkedInsightKey.length > 0);
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
