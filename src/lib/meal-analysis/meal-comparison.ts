import type { SupabaseClient } from "@supabase/supabase-js";
import { matchFoodsInText } from "@/lib/meal-analysis/food-knowledge";

export type SimilarPastMeal = {
  summary: string;
  overlapIngredients: string[];
  symptomOutcome: string;
};

export async function findSimilarPastMeals(
  supabase: SupabaseClient,
  userId: string,
  currentIngredients: string[],
  currentMealText: string
): Promise<SimilarPastMeal[]> {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const { data: meals } = await supabase
    .from("meals")
    .select("foods, eaten_at, created_at")
    .eq("user_id", userId)
    .gte("eaten_at", since.toISOString())
    .order("eaten_at", { ascending: false })
    .limit(25);

  if (!meals?.length || currentIngredients.length === 0) {
    return [];
  }

  const currentSet = new Set(currentIngredients.map((name) => name.toLowerCase()));
  const { data: symptoms } = await supabase
    .from("symptoms")
    .select("severity, bloating_level, pain_level, logged_at, created_at")
    .eq("user_id", userId)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: false })
    .limit(40);

  const symptomEvents = (symptoms ?? [])
    .map((row) => ({
      at: parseTimestamp(row.logged_at ?? row.created_at),
      score: Math.max(row.severity ?? 0, row.bloating_level ?? 0, row.pain_level ?? 0),
    }))
    .filter((event) => event.at);

  const overlaps = new Map<string, { count: number; withSymptoms: number; withoutSymptoms: number }>();

  for (const meal of meals) {
    const mealText = String(meal.foods ?? "");
    if (mealText === currentMealText) continue;

    const { matched } = matchFoodsInText(mealText);
    const overlap = matched
      .map(({ record }) => record.canonicalName)
      .filter((name) => currentSet.has(name.toLowerCase()));

    if (overlap.length < 2) continue;

    const key = overlap.sort().join("|");
    const mealAt = parseTimestamp(meal.eaten_at ?? meal.created_at);
    const hadSymptoms =
      mealAt &&
      symptomEvents.some((event) => {
        if (!event.at) return false;
        const diffHours = (event.at.getTime() - mealAt.getTime()) / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours <= 24 && event.score >= 5;
      });

    const current = overlaps.get(key) ?? { count: 0, withSymptoms: 0, withoutSymptoms: 0 };
    current.count += 1;
    if (hadSymptoms) current.withSymptoms += 1;
    else current.withoutSymptoms += 1;
    overlaps.set(key, current);
  }

  return Array.from(overlaps.entries())
    .map(([key, stats]) => {
      const overlapIngredients = key.split("|");
      let symptomOutcome = "Outcomes were mixed or not clearly recorded.";
      if (stats.withSymptoms >= 2 && stats.withoutSymptoms === 0) {
        symptomOutcome = `${stats.withSymptoms} similar meal(s) were followed by higher symptom scores.`;
      } else if (stats.withoutSymptoms >= 2 && stats.withSymptoms === 0) {
        symptomOutcome = `${stats.withoutSymptoms} similar meal(s) had no recorded higher symptoms afterward.`;
      } else if (stats.withSymptoms >= 1 && stats.withoutSymptoms >= 1) {
        symptomOutcome = `${stats.withSymptoms} similar meal(s) had higher symptoms and ${stats.withoutSymptoms} did not — evidence is mixed.`;
      }

      return {
        summary: `You previously logged ${stats.count} meal(s) with overlapping ingredients (${overlapIngredients.slice(0, 4).join(", ")}).`,
        overlapIngredients,
        symptomOutcome,
      };
    })
    .sort((a, b) => b.overlapIngredients.length - a.overlapIngredients.length)
    .slice(0, 4);
}

function parseTimestamp(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
