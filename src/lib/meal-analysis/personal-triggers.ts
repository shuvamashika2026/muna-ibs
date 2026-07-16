import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPersonalIntelligence,
  matchIngredientsToPersonalData,
  ingredientMentionedInText,
  type SymptomTimingAssociation,
} from "@/lib/meal-analysis/symptom-timing";

export type PersonalTriggerMatch = SymptomTimingAssociation & {
  statement: string;
};

export type PersonalTriggerResult = {
  patterns: PersonalTriggerMatch[];
  summary: string;
};

export async function buildPersonalTriggerPatterns(
  supabase: SupabaseClient,
  userId: string
): Promise<PersonalTriggerResult> {
  const result = await buildPersonalIntelligence(supabase, userId);

  return {
    patterns: result.timingAssociations.map((item) => ({
      ...item,
      statement:
        item.associationStrength === "Repeated"
          ? `${item.ingredient} has appeared in several meals followed by ${item.symptom} within ${item.typicalDelay}. This may be worth discussing with a clinician, but it is not proof of causation.`
          : item.observationCount >= 3
            ? `${item.ingredient} appeared near ${item.symptom} a few times — a possible pattern, not confirmed causation.`
            : `${item.ingredient} appeared near higher symptom scores a few times, which is not enough to call it a confirmed personal trigger.`,
    })),
    summary: result.summary,
  };
}

export function matchCurrentMealToPersonalPatterns(inputText: string, patterns: PersonalTriggerMatch[]) {
  const lower = inputText.toLowerCase();
  return patterns.filter((pattern) => lower.includes(pattern.ingredient.toLowerCase()));
}

export { matchIngredientsToPersonalData, ingredientMentionedInText };
