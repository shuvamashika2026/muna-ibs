import type { MealAnalysisInput } from "@/lib/meal-analysis/types";

export type NonFodmapAnalysis = {
  factors: string[];
  score: number;
};

export function analyzeNonFodmapFactors(input: MealAnalysisInput, ingredientNames: string[]): NonFodmapAnalysis {
  const combined = [
    input.mealName,
    input.ingredients,
    input.drinks,
    input.notes,
    input.cookingMethod,
    input.tags.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const factors = new Set<string>();
  let score = 0;

  const checks: Array<{ pattern: RegExp; factor: string; points: number }> = [
    { pattern: /\b(fried|deep fried|deep-fried|crispy|chips|fries)\b/i, factor: "Fried or high-fat preparation may feel heavy for some people", points: 4 },
    { pattern: /\b(cream|butter|ghee|fatty|greasy|oil heavy|oily)\b/i, factor: "Higher fat content may slow digestion for some people with IBS", points: 3 },
    { pattern: /\b(spicy|chilli|chili|hot sauce|pepper)\b/i, factor: "Spice or chilli may irritate the gut for some people", points: 3 },
    { pattern: /\b(coffee|espresso|caffeine|latte|energy drink)\b/i, factor: "Caffeine may stimulate the gut for some people", points: 4 },
    { pattern: /\b(alcohol|beer|wine|spirits)\b/i, factor: "Alcohol may affect gut motility or irritation for some people", points: 4 },
    { pattern: /\b(fizzy|carbonated|soda|sparkling|cola)\b/i, factor: "Carbonation may increase bloating for some people", points: 3 },
    { pattern: /\b(artificial sweetener|sugar-free|sorbitol|xylitol|mannitol|maltitol)\b/i, factor: "Artificial sweeteners or sugar alcohols may cause bloating for some people", points: 5 },
    { pattern: /\b(processed|ready meal|packaged|fast food|takeaway)\b/i, factor: "Highly processed or unclear meals may contain hidden triggers", points: 3 },
    { pattern: /\b(ice cream|very cold|iced)\b/i, factor: "Very cold foods or drinks may bother some people", points: 2 },
    { pattern: /\b(late night|midnight|before bed)\b/i, factor: "Late-night eating timing may affect some people's digestion", points: 2 },
    { pattern: /\b(rapid|quickly| rushed)\b/i, factor: "Rapid eating may increase swallowed air and discomfort for some people", points: 2 },
  ];

  for (const check of checks) {
    if (check.pattern.test(combined)) {
      factors.add(check.factor);
      score += check.points;
    }
  }

  for (const tag of input.tags) {
    const tagMap: Record<string, { factor: string; points: number }> = {
      spicy: { factor: "You marked this meal as spicy", points: 3 },
      dairy: { factor: "You marked dairy as a concern for this meal", points: 3 },
      gluten: { factor: "You noted gluten context — sensitivity varies by person and is not universal in IBS", points: 2 },
      caffeine: { factor: "You marked caffeine as relevant", points: 3 },
      alcohol: { factor: "You marked alcohol as relevant", points: 4 },
    };
    const mapped = tagMap[tag];
    if (mapped) {
      factors.add(mapped.factor);
      score += mapped.points;
    }
  }

  if (/large|big|double|full plate/i.test(`${input.portionSize} ${input.notes}`)) {
    factors.add("Large meal volume may feel harder to digest for some people");
    score += 3;
  }

  if (ingredientNames.includes("lactose-free milk") && combined.includes("milk")) {
    // Remove incorrect lactose concern when lactose-free specified
    factors.delete("You marked dairy as a concern for this meal");
  }

  return {
    factors: Array.from(factors).slice(0, 10),
    score: Math.min(15, score),
  };
}
