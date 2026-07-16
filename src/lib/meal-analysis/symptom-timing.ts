import type { SupabaseClient } from "@supabase/supabase-js";
import { lookupFoodKnowledge, matchFoodsInText } from "@/lib/meal-analysis/food-knowledge";

export type SymptomTimingWindow = {
  label: string;
  minHours: number;
  maxHours: number;
};

export const SYMPTOM_TIMING_WINDOWS: SymptomTimingWindow[] = [
  { label: "0–2 hours", minHours: 0, maxHours: 2 },
  { label: "2–6 hours", minHours: 2, maxHours: 6 },
  { label: "6–12 hours", minHours: 6, maxHours: 12 },
  { label: "12–24 hours", minHours: 12, maxHours: 24 },
  { label: "24–48 hours", minHours: 24, maxHours: 48 },
];

export type SymptomTimingAssociation = {
  ingredient: string;
  symptom: string;
  observationCount: number;
  typicalDelay: string;
  associationStrength: "Weak" | "Possible" | "Repeated";
  confidence: "Low" | "Moderate" | "Higher";
};

export type ToleranceSignal = {
  ingredient: string;
  state: "Possibly well tolerated" | "Mixed response" | "Possible trigger pattern" | "Insufficient data";
  observationCount: number;
  positiveSymptomCount: number;
  symptomFreeCount: number;
  summary: string;
  personalPatternScore: number;
};

type MealRow = {
  id?: string;
  foods: string | null;
  eaten_at: string | null;
  created_at: string | null;
};

type SymptomRow = {
  symptoms: string | null;
  severity: number | null;
  bloating_level?: number | null;
  pain_level?: number | null;
  logged_at: string | null;
  created_at: string | null;
};

const MEAL_LIMIT = 40;
const SYMPTOM_LIMIT = 40;
const HIGH_SYMPTOM_THRESHOLD = 5;

export async function buildPersonalIntelligence(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  timingAssociations: SymptomTimingAssociation[];
  toleranceSignals: ToleranceSignal[];
  summary: string;
}> {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [mealsResult, symptomsResult] = await Promise.all([
    supabase
      .from("meals")
      .select("id, foods, eaten_at, created_at")
      .eq("user_id", userId)
      .gte("eaten_at", since.toISOString())
      .order("eaten_at", { ascending: false })
      .limit(MEAL_LIMIT),
    supabase
      .from("symptoms")
      .select("symptoms, severity, bloating_level, pain_level, logged_at, created_at")
      .eq("user_id", userId)
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: false })
      .limit(SYMPTOM_LIMIT),
  ]);

  const meals = (mealsResult.data ?? []) as MealRow[];
  const symptoms = (symptomsResult.data ?? []) as SymptomRow[];

  if (!meals.length) {
    return {
      timingAssociations: [],
      toleranceSignals: [],
      summary: "Not enough personal meal history yet for timing or tolerance patterns.",
    };
  }

  const symptomEvents = symptoms
    .map((row) => ({
      row,
      at: parseTimestamp(row.logged_at ?? row.created_at),
      score: Math.max(row.severity ?? 0, row.bloating_level ?? 0, row.pain_level ?? 0),
      label: String(row.symptoms ?? "symptoms").slice(0, 80),
    }))
    .filter((event) => event.at);

  const ingredientStats = new Map<
    string,
    {
      symptomAfter: number;
      symptomFree: number;
      delays: number[];
      symptomLabels: Set<string>;
    }
  >();

  for (const meal of meals) {
    const mealAt = parseTimestamp(meal.eaten_at ?? meal.created_at);
    if (!mealAt) continue;

    const { matched } = matchFoodsInText(String(meal.foods ?? ""));
    if (!matched.length) continue;

    const followingSymptoms = symptomEvents.filter((event) => {
      if (!event.at) return false;
      const diffHours = (event.at.getTime() - mealAt.getTime()) / (1000 * 60 * 60);
      return diffHours >= 0 && diffHours <= 48;
    });

    const highSymptom = followingSymptoms.find((event) => event.score >= HIGH_SYMPTOM_THRESHOLD);

    for (const { record } of matched) {
      const key = record.canonicalName;
      const stats = ingredientStats.get(key) ?? {
        symptomAfter: 0,
        symptomFree: 0,
        delays: [],
        symptomLabels: new Set<string>(),
      };

      if (highSymptom?.at) {
        stats.symptomAfter += 1;
        const delayHours = (highSymptom.at.getTime() - mealAt.getTime()) / (1000 * 60 * 60);
        stats.delays.push(delayHours);
        stats.symptomLabels.add(highSymptom.label);
      } else if (followingSymptoms.length === 0 || followingSymptoms.every((e) => e.score < HIGH_SYMPTOM_THRESHOLD)) {
        stats.symptomFree += 1;
      }

      ingredientStats.set(key, stats);
    }
  }

  const timingAssociations: SymptomTimingAssociation[] = [];
  const toleranceSignals: ToleranceSignal[] = [];

  for (const [ingredient, stats] of ingredientStats.entries()) {
    const typicalDelay = deriveTypicalDelay(stats.delays);
    const symptom = Array.from(stats.symptomLabels)[0] ?? "higher symptom scores";

    if (stats.symptomAfter >= 1) {
      timingAssociations.push({
        ingredient,
        symptom,
        observationCount: stats.symptomAfter,
        typicalDelay,
        associationStrength: deriveAssociationStrength(stats.symptomAfter),
        confidence: deriveTimingConfidence(stats.symptomAfter),
      });
    }

    toleranceSignals.push(buildToleranceSignal(ingredient, stats));
  }

  timingAssociations.sort((a, b) => b.observationCount - a.observationCount);
  toleranceSignals.sort((a, b) => b.observationCount - a.observationCount);

  const repeated = timingAssociations.filter((item) => item.associationStrength === "Repeated");
  const summary =
    repeated.length > 0
      ? repeated
          .slice(0, 3)
          .map(
            (item) =>
              `${item.ingredient} has repeatedly appeared before ${item.symptom} within ${item.typicalDelay}. This is an association, not proof of causation.`
          )
          .join(" ")
      : "No repeated personal ingredient–symptom associations were found in your recent logs.";

  return {
    timingAssociations: timingAssociations.slice(0, 8),
    toleranceSignals: toleranceSignals.slice(0, 10),
    summary,
  };
}

function buildToleranceSignal(
  ingredient: string,
  stats: { symptomAfter: number; symptomFree: number; delays: number[]; symptomLabels: Set<string> }
): ToleranceSignal {
  const observationCount = stats.symptomAfter + stats.symptomFree;
  let state: ToleranceSignal["state"] = "Insufficient data";
  let summary = `${ingredient}: insufficient personal evidence so far.`;
  let personalPatternScore = 0;

  if (observationCount <= 2) {
    state = "Insufficient data";
    summary = `${ingredient}: only ${observationCount} relevant observation(s) — not enough for a personal pattern.`;
  } else if (stats.symptomAfter >= 6 && stats.symptomFree <= 1) {
    state = "Possible trigger pattern";
    personalPatternScore = Math.min(20, 12 + stats.symptomAfter);
    summary = `${ingredient} has appeared before higher symptoms in ${stats.symptomAfter} similar windows. This may be worth exploring, but it is not confirmed causation.`;
  } else if (stats.symptomAfter >= 3 && stats.symptomAfter > stats.symptomFree) {
    state = "Possible trigger pattern";
    personalPatternScore = Math.min(16, 8 + stats.symptomAfter);
    summary = `${ingredient} may be associated with symptoms in your logs, but evidence is still limited.`;
  } else if (stats.symptomFree >= 3 && stats.symptomAfter <= 1) {
    state = "Possibly well tolerated";
    personalPatternScore = 0;
    summary = `${ingredient} has appeared in several meals without recorded higher symptoms in your logs.`;
  } else if (stats.symptomAfter >= 1 && stats.symptomFree >= 1) {
    state = "Mixed response";
    personalPatternScore = Math.min(8, stats.symptomAfter * 2);
    summary = `${ingredient} shows mixed outcomes in your history — some meals followed by symptoms, others not.`;
  }

  return {
    ingredient,
    state,
    observationCount,
    positiveSymptomCount: stats.symptomAfter,
    symptomFreeCount: stats.symptomFree,
    summary,
    personalPatternScore,
  };
}

function deriveTypicalDelay(delays: number[]) {
  if (!delays.length) return "Unknown delay";
  const avg = delays.reduce((sum, value) => sum + value, 0) / delays.length;
  const window = SYMPTOM_TIMING_WINDOWS.find((item) => avg >= item.minHours && avg < item.maxHours);
  return window?.label ?? "variable window";
}

function deriveAssociationStrength(count: number): SymptomTimingAssociation["associationStrength"] {
  if (count >= 6) return "Repeated";
  if (count >= 3) return "Possible";
  return "Weak";
}

function deriveTimingConfidence(count: number): SymptomTimingAssociation["confidence"] {
  if (count >= 6) return "Higher";
  if (count >= 3) return "Moderate";
  return "Low";
}

export function matchIngredientsToPersonalData(
  ingredientNames: string[],
  timingAssociations: SymptomTimingAssociation[],
  toleranceSignals: ToleranceSignal[]
) {
  const names = new Set(ingredientNames.map((name) => name.toLowerCase()));
  return {
    matchedTiming: timingAssociations.filter((item) => names.has(item.ingredient.toLowerCase())),
    matchedTolerance: toleranceSignals.filter((item) => names.has(item.ingredient.toLowerCase())),
  };
}

export function ingredientMentionedInText(text: string, ingredient: string) {
  const record = lookupFoodKnowledge(ingredient);
  const normalized = text.toLowerCase();
  if (!record) return normalized.includes(ingredient.toLowerCase());
  return [record.canonicalName, ...record.aliases].some((alias) => normalized.includes(alias.toLowerCase()));
}

function parseTimestamp(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
