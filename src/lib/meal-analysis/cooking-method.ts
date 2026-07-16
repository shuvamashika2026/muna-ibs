import type { MealAnalysisInput } from "@/lib/meal-analysis/types";

export function analyzeCookingMethod(input: MealAnalysisInput, ingredientNames: string[]): string[] {
  const observations: string[] = [];
  const method = input.cookingMethod.toLowerCase();
  const combined = [input.mealName, input.ingredients, input.notes, input.cookingMethod].join(" ").toLowerCase();

  if (/grilled|baked|steamed|boiled|poached/.test(method || combined)) {
    observations.push("Plain grilling, baking, steaming, or boiling may be gentler than heavy frying for some people.");
  }

  if (/fried|deep fried|deep-fried/.test(method || combined)) {
    observations.push("Deep-fried preparation may add fat load that feels heavier than grilled alternatives for some people.");
  }

  if (/garlic-infused oil|garlic infused oil|garlic oil/.test(combined)) {
    observations.push("Garlic-infused oil may carry flavour with lower fructan load than garlic pieces for some people.");
  } else if (ingredientNames.includes("garlic")) {
    observations.push("Whole garlic pieces may carry higher fructan load than garlic-infused oil for some people.");
  }

  if (/raw/.test(combined)) {
    observations.push("Raw vegetables may feel harder to digest than well-cooked versions for some people.");
  }

  if (/well cooked|well-cooked|soft cooked/.test(combined)) {
    observations.push("Well-cooked vegetables may be tolerated differently from raw versions for some people.");
  }

  if (/rinsed|canned.*rinsed|drained/.test(combined)) {
    observations.push("Rinsed canned legumes may differ from unwashed legumes for some people.");
  }

  if (/reheated|leftover|microwave/.test(combined)) {
    observations.push("Reheated starches may affect some people differently from freshly cooked starches.");
  }

  if (/curry|masala|spice-heavy|spicy sauce/.test(combined)) {
    observations.push("Spice-heavy sauces may combine fat, chilli, and hidden onion or garlic beyond plain ingredients.");
  }

  return observations.slice(0, 6);
}
