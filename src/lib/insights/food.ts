import { classifyFoodItem, splitMealText } from "@/lib/food-intelligence";
import { foodInsightConfidence } from "@/lib/insights/confidence";
import {
  ASSOCIATION_LIMITATION,
  addDaysToDate,
  createInsight,
  filterRowsWithinWindow,
  getDateFromRow,
  isSymptomHeavy,
  numberFrom,
  symptomSeverity,
  textFrom,
  type MunaInsight,
  type MunaInsightsInput,
} from "@/lib/insights/types";

const MEAL_FLAG_KEYS = [
  "has_dairy",
  "has_onion",
  "has_garlic",
  "has_caffeine",
  "has_gluten",
] as const;

type FoodStats = {
  food: string;
  exposureCount: number;
  overlapCount: number;
  symptomFreeCount: number;
  symptomNotes: string[];
};

function capitalizeFood(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function mealFoodText(row: Record<string, unknown>): string | null {
  const parts = [
    textFrom(row, ["foods", "food_name", "meal_name", "notes", "ingredients", "drinks"]),
  ].filter((value): value is string => Boolean(value));
  for (const key of MEAL_FLAG_KEYS) {
    if (row[key] === true) parts.push(key.replace("has_", ""));
  }
  return parts.join(", ").trim() || null;
}

function extractCanonicalFoodsFromMeal(row: Record<string, unknown>): string[] {
  const text = mealFoodText(row);
  if (!text) return [];
  const foods = new Set<string>();
  for (const item of splitMealText(text)) {
    const classified = classifyFoodItem(item);
    if (classified.matched && classified.canonicalName) foods.add(classified.canonicalName);
  }
  return Array.from(foods);
}

function getSymptomHeavyDays(symptoms: Record<string, unknown>[]): Map<string, string> {
  const heavyDays = new Map<string, string>();
  for (const row of symptoms) {
    if (!isSymptomHeavy(row)) continue;
    const date = getDateFromRow(row);
    if (!date) continue;
    const bloating = numberFrom(row, ["bloating_level", "bloating"]);
    const pain = numberFrom(row, ["pain_level", "severity", "pain"]);
    const descriptors: string[] = [];
    if (bloating !== null && bloating >= 4) descriptors.push("higher bloating");
    if (pain !== null && pain >= 4) descriptors.push("elevated pain");
    if (!descriptors.length) descriptors.push("elevated symptoms");
    heavyDays.set(date, descriptors.join(" and "));
  }
  return heavyDays;
}

function getTimestampMsFromRow(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function symptomHeavyOnDayAfterMeal(
  meal: Record<string, unknown>,
  mealDate: string,
  symptomHeavyDays: Map<string, string>,
  symptoms: Record<string, unknown>[]
): { linked: boolean; symptomNote?: string } {
  const nextDay = addDaysToDate(mealDate, 1);
  if (nextDay && symptomHeavyDays.has(nextDay)) {
    return { linked: true, symptomNote: symptomHeavyDays.get(nextDay) };
  }
  if (!symptomHeavyDays.has(mealDate)) return { linked: false };

  const mealTimestamp = getTimestampMsFromRow(meal, ["eaten_at", "meal_date", "logged_at", "created_at"]);
  for (const symptom of symptoms.filter((row) => getDateFromRow(row) === mealDate)) {
    if (symptomSeverity(symptom) === null || symptomSeverity(symptom)! < 4) continue;
    const symptomTimestamp = getTimestampMsFromRow(symptom, ["logged_at", "symptom_date", "created_at"]);
    if (mealTimestamp !== null && symptomTimestamp !== null && mealTimestamp < symptomTimestamp) {
      return { linked: true, symptomNote: symptomHeavyDays.get(mealDate) };
    }
  }
  return { linked: false };
}

function buildFoodStats(meals: Record<string, unknown>[], symptoms: Record<string, unknown>[]): Map<string, FoodStats> {
  const symptomHeavyDays = getSymptomHeavyDays(symptoms);
  const stats = new Map<string, FoodStats>();

  for (const meal of meals) {
    const mealDate = getDateFromRow(meal);
    if (!mealDate) continue;
    const foods = extractCanonicalFoodsFromMeal(meal);
    if (!foods.length) continue;

    const link = symptomHeavyOnDayAfterMeal(meal, mealDate, symptomHeavyDays, symptoms);
    const nextDay = addDaysToDate(mealDate, 1);
    const symptomFree =
      !link.linked && !symptomHeavyDays.has(mealDate) && !(nextDay && symptomHeavyDays.has(nextDay));

    for (const food of foods) {
      const current = stats.get(food) ?? {
        food,
        exposureCount: 0,
        overlapCount: 0,
        symptomFreeCount: 0,
        symptomNotes: [],
      };
      current.exposureCount += 1;
      if (link.linked) {
        current.overlapCount += 1;
        if (link.symptomNote) current.symptomNotes.push(link.symptomNote);
      } else if (symptomFree) {
        current.symptomFreeCount += 1;
      }
      stats.set(food, current);
    }
  }

  return stats;
}

export function generateFoodInsights(input: MunaInsightsInput): MunaInsight[] {
  const windowDays = input.observationWindowDays ?? 14;
  const meals = filterRowsWithinWindow(input.meals, input.generatedAt, windowDays);
  const symptoms = filterRowsWithinWindow(input.symptoms, input.generatedAt, windowDays);
  const stats = buildFoodStats(meals, symptoms);
  const insights: MunaInsight[] = [];

  if (!meals.length) {
    insights.push(
      createInsight({
        id: "food-insufficient-data",
        type: "food",
        title: "Insufficient meal data",
        summary: "There are not enough dated meal logs in the current window to generate food observations.",
        confidence: "unavailable",
        evidenceCount: 0,
        observationWindowDays: windowDays,
        supportingEvidence: [],
        limitations: ["No meal entries were available for analysis."],
        status: "insufficient_data",
        isActionable: false,
        suggestedNextStep: "Log meals consistently for a few days to help MUNA look for possible patterns.",
        generatedAt: input.generatedAt,
      })
    );
    return insights;
  }

  for (const item of Array.from(stats.values()).sort(
    (a, b) => b.overlapCount - a.overlapCount || b.exposureCount - a.exposureCount
  )) {
    const mixedResponse = item.overlapCount >= 1 && item.symptomFreeCount >= 1;
    const confidence = foodInsightConfidence({
      exposureCount: item.exposureCount,
      overlapCount: item.overlapCount,
      symptomFreeCount: item.symptomFreeCount,
      mixedResponse,
    });

    if (item.exposureCount < 3) {
      insights.push(
        createInsight({
          id: `food-${item.food}-insufficient`,
          type: "food",
          title: `${capitalizeFood(item.food)}: insufficient evidence`,
          summary: `${capitalizeFood(item.food)} appears in ${item.exposureCount} logged meal(s), which is not enough to identify a reliable pattern.`,
          confidence: "unavailable",
          evidenceCount: item.exposureCount,
          observationWindowDays: windowDays,
          supportingEvidence: [
            `Exposure count: ${item.exposureCount}`,
            `Symptom-overlap count: ${item.overlapCount}`,
            `Symptom-free count: ${item.symptomFreeCount}`,
          ],
          limitations: [
            "Fewer than 3 logged exposures are not enough for a food observation.",
            "Absence of symptoms in a small number of logs does not mean a food is safe for you.",
          ],
          status: "insufficient_data",
          isActionable: false,
          suggestedNextStep: `Continue logging meals that include ${item.food} alongside symptoms.`,
          generatedAt: input.generatedAt,
        })
      );
      continue;
    }

    if (item.overlapCount >= 2) {
      insights.push(
        createInsight({
          id: `food-${item.food}-association`,
          type: "food",
          title: `Possible association: ${capitalizeFood(item.food)}`,
          summary: `Your current logs suggest a possible association between ${item.food} and higher symptom periods on ${item.overlapCount} of ${item.exposureCount} logged exposures.`,
          confidence,
          evidenceCount: item.exposureCount,
          observationWindowDays: windowDays,
          supportingEvidence: [
            `Exposure count: ${item.exposureCount}`,
            `Symptom-overlap count: ${item.overlapCount}`,
            `Symptom-free count: ${item.symptomFreeCount}`,
          ],
          limitations: [
            ASSOCIATION_LIMITATION,
            "Other meals, stress, sleep or hydration on the same days may also be involved.",
          ],
          status: "active",
          isActionable: true,
          suggestedNextStep: `Keep logging ${item.food} alongside symptoms to see whether the pattern stays consistent.`,
          generatedAt: input.generatedAt,
        })
      );
      continue;
    }

    if (mixedResponse) {
      insights.push(
        createInsight({
          id: `food-${item.food}-mixed`,
          type: "food",
          title: `Mixed response: ${capitalizeFood(item.food)}`,
          summary: `Your logs show a mixed response to ${item.food}: ${item.overlapCount} exposure(s) overlapped with higher symptoms and ${item.symptomFreeCount} did not.`,
          confidence,
          evidenceCount: item.exposureCount,
          observationWindowDays: windowDays,
          supportingEvidence: [
            `Exposure count: ${item.exposureCount}`,
            `Symptom-overlap count: ${item.overlapCount}`,
            `Symptom-free count: ${item.symptomFreeCount}`,
          ],
          limitations: [ASSOCIATION_LIMITATION, "Experiences may vary day to day."],
          status: "active",
          isActionable: true,
          suggestedNextStep: `Note portion size, timing and surrounding meals when you log ${item.food}.`,
          generatedAt: input.generatedAt,
        })
      );
      continue;
    }

    if (item.symptomFreeCount >= 2 && item.overlapCount === 0) {
      insights.push(
        createInsight({
          id: `food-${item.food}-tolerated`,
          type: "food",
          title: `Frequently tolerated in logs: ${capitalizeFood(item.food)}`,
          summary: `${capitalizeFood(item.food)} was logged ${item.symptomFreeCount} times on days without elevated symptoms in your current records.`,
          confidence,
          evidenceCount: item.exposureCount,
          observationWindowDays: windowDays,
          supportingEvidence: [
            `Exposure count: ${item.exposureCount}`,
            `Symptom-free count: ${item.symptomFreeCount}`,
          ],
          limitations: [
            "This only reflects logged days without elevated symptoms.",
            "It does not guarantee tolerance in every situation.",
          ],
          status: "active",
          isActionable: false,
          suggestedNextStep: null,
          generatedAt: input.generatedAt,
        })
      );
    }
  }

  if (!insights.length) {
    insights.push(
      createInsight({
        id: "food-no-patterns",
        type: "food",
        title: "No clear food pattern yet",
        summary: "Your current meal and symptom logs do not yet show a repeatable food pattern in this window.",
        confidence: "unavailable",
        evidenceCount: meals.length,
        observationWindowDays: windowDays,
        supportingEvidence: [`Meals logged: ${meals.length}`],
        limitations: ["More paired meal and symptom logs are needed."],
        status: "insufficient_data",
        isActionable: false,
        suggestedNextStep: "Log meals and symptoms on the same days for clearer observations.",
        generatedAt: input.generatedAt,
      })
    );
  }

  return insights.slice(0, 6);
}
