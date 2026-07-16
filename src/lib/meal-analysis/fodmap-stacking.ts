import { lookupFoodKnowledge } from "@/lib/meal-analysis/food-knowledge";

export type FodmapStackingResult = {
  fodmapLoad: "Low" | "Moderate" | "High" | "Unknown";
  fodmapGroupsPresent: string[];
  stackingConcern: string;
  confidence: "Low" | "Moderate" | "High";
  stackingScore: number;
  flags: Array<{ ingredient: string; fodmapGroup: string; reason: string }>;
};

const FODMAP_GROUP_ALIASES: Record<string, string> = {
  fructans: "Fructans",
  gos: "GOS",
  lactose: "Lactose",
  fructose: "Excess fructose",
  polyols: "Polyols",
};

export function analyzeFodmapStacking(ingredientNames: string[]): FodmapStackingResult {
  const groupCounts = new Map<string, Set<string>>();
  const flags: FodmapStackingResult["flags"] = [];

  for (const name of ingredientNames) {
    const record = lookupFoodKnowledge(name);
    if (!record) continue;

    for (const group of record.fodmapGroups) {
      const normalized = FODMAP_GROUP_ALIASES[group.toLowerCase()] ?? group;
      const set = groupCounts.get(normalized) ?? new Set<string>();
      set.add(record.canonicalName);
      groupCounts.set(normalized, set);
    }

    if (record.fodmapLevel === "High" || record.fodmapLevel === "Moderate") {
      flags.push({
        ingredient: record.canonicalName,
        fodmapGroup: record.fodmapGroups.join(", ") || "General IBS guidance",
        reason: record.commonConcerns[0] ?? record.notes,
      });
    }
  }

  const groupsPresent = Array.from(groupCounts.keys());
  const multiGroupStack = groupsPresent.length >= 2;
  const fructanIngredients = groupCounts.get("Fructans");
  const hasFructanStack = (fructanIngredients?.size ?? 0) >= 2;

  let fodmapLoad: FodmapStackingResult["fodmapLoad"] = "Low";
  let stackingScore = 0;
  let stackingConcern = "";

  if (groupsPresent.length === 0) {
    fodmapLoad = "Low";
    stackingConcern = "No major FODMAP groups were identified in recognised ingredients.";
  } else if (hasFructanStack || multiGroupStack) {
    fodmapLoad = hasFructanStack && multiGroupStack ? "High" : "Moderate";
    stackingScore = hasFructanStack && multiGroupStack ? 15 : hasFructanStack ? 12 : 8;
    stackingConcern = buildStackingMessage(groupCounts);
  } else {
    fodmapLoad = "Moderate";
    stackingScore = 4;
    stackingConcern = `FODMAP groups present: ${groupsPresent.join(", ")}. Stacking across groups was limited in recognised ingredients.`;
  }

  const confidence: FodmapStackingResult["confidence"] =
    ingredientNames.length >= 3 ? "Moderate" : ingredientNames.length >= 1 ? "Low" : "Low";

  return {
    fodmapLoad,
    fodmapGroupsPresent: groupsPresent,
    stackingConcern,
    confidence,
    stackingScore,
    flags: dedupeFlags(flags).slice(0, 12),
  };
}

function buildStackingMessage(groupCounts: Map<string, Set<string>>) {
  const parts: string[] = [];
  for (const [group, ingredients] of groupCounts.entries()) {
    if (ingredients.size >= 2) {
      parts.push(
        `Multiple ${group.toLowerCase()} sources (${Array.from(ingredients).join(", ")}) may increase cumulative exposure for some people.`
      );
    }
  }

  if (parts.length === 0) {
    return "Several FODMAP groups appear together, which may increase cumulative load for some people. This is not proof of symptoms.";
  }

  return `${parts.join(" ")} Stacking is a possible concern, not a confirmed trigger.`;
}

function dedupeFlags(flags: FodmapStackingResult["flags"]) {
  const map = new Map<string, (typeof flags)[number]>();
  for (const flag of flags) {
    map.set(flag.ingredient.toLowerCase(), flag);
  }
  return Array.from(map.values());
}
