export type FodmapLevel = "low" | "moderate" | "high" | "unknown";

export type FodmapCategory =
  | "fructans"
  | "lactose"
  | "gos"
  | "excess_fructose"
  | "polyols"
  | "unknown";

export type FoodClassification = {
  canonicalName: string;
  aliases: string[];
  fodmapLevel: FodmapLevel;
  fodmapCategory: FodmapCategory;
  note: string;
};

export type FoodMatchResult = {
  input: string;
  normalizedInput: string;
  matched: boolean;
  canonicalName: string | null;
  fodmapLevel: FodmapLevel;
  fodmapCategory: FodmapCategory | null;
  note: string | null;
};

export type MealSummary = {
  items: FoodMatchResult[];
  knownCount: number;
  unknownCount: number;
  lowCount: number;
  moderateCount: number;
  highCount: number;
  summaryNotes: string[];
};

const UNKNOWN_NOTE =
  "This item is not in the MUNA beta food list yet. Portion and individual tolerance may matter.";

const FOOD_DATASET: FoodClassification[] = [
  {
    canonicalName: "onion",
    aliases: ["onion", "onions", "brown onion", "white onion", "red onion", "spring onion", "scallion"],
    fodmapLevel: "high",
    fodmapCategory: "fructans",
    note: "Often considered higher in FODMAPs (fructans). Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "garlic",
    aliases: ["garlic", "garlic clove", "garlic cloves", "garlic powder"],
    fodmapLevel: "high",
    fodmapCategory: "fructans",
    note: "Often considered higher in FODMAPs (fructans). Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "wheat bread",
    aliases: ["wheat bread", "bread", "white bread", "whole wheat bread", "wholemeal bread", "toast"],
    fodmapLevel: "high",
    fodmapCategory: "fructans",
    note: "Often considered higher in FODMAPs when wheat-based. Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "chapati",
    aliases: ["chapati", "chapatti", "roti", "phulka", "atta roti"],
    fodmapLevel: "moderate",
    fodmapCategory: "fructans",
    note: "Often considered moderate when made from wheat flour. Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "rice",
    aliases: ["rice", "white rice", "brown rice", "basmati", "jasmine rice", "steamed rice"],
    fodmapLevel: "low",
    fodmapCategory: "unknown",
    note: "Often considered lower in FODMAPs at a standard cooked portion. Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "oats",
    aliases: ["oats", "oatmeal", "rolled oats", "porridge oats"],
    fodmapLevel: "low",
    fodmapCategory: "unknown",
    note: "Often considered lower in FODMAPs at a modest portion. Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "milk",
    aliases: ["milk", "cow milk", "whole milk", "semi skimmed milk", "skim milk"],
    fodmapLevel: "high",
    fodmapCategory: "lactose",
    note: "Often considered higher in FODMAPs due to lactose unless lactose-free. Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "yoghurt",
    aliases: ["yoghurt", "yogurt", "greek yogurt", "greek yoghurt", "plain yoghurt"],
    fodmapLevel: "high",
    fodmapCategory: "lactose",
    note: "Often considered higher in FODMAPs due to lactose unless lactose-free. Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "apple",
    aliases: ["apple", "apples", "green apple", "red apple"],
    fodmapLevel: "high",
    fodmapCategory: "polyols",
    note: "Often considered higher in FODMAPs (polyols/fructose-related). Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "banana",
    aliases: ["banana", "bananas", "ripe banana", "unripe banana"],
    fodmapLevel: "moderate",
    fodmapCategory: "unknown",
    note: "Often considered lower when unripe and moderate when riper. Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "chicken",
    aliases: ["chicken", "chicken breast", "roast chicken", "grilled chicken"],
    fodmapLevel: "low",
    fodmapCategory: "unknown",
    note: "Often considered lower in FODMAPs when plain and without high-FODMAP sauces. Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "egg",
    aliases: ["egg", "eggs", "boiled egg", "fried egg", "scrambled egg"],
    fodmapLevel: "low",
    fodmapCategory: "unknown",
    note: "Often considered lower in FODMAPs. Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "potato",
    aliases: ["potato", "potatoes", "boiled potato", "mashed potato", "jacket potato"],
    fodmapLevel: "low",
    fodmapCategory: "unknown",
    note: "Often considered lower in FODMAPs at a standard portion. Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "tomato",
    aliases: ["tomato", "tomatoes", "cherry tomato", "cherry tomatoes"],
    fodmapLevel: "low",
    fodmapCategory: "unknown",
    note: "Often considered lower in FODMAPs at a modest portion. Portion and individual tolerance may matter.",
  },
  {
    canonicalName: "lentils",
    aliases: ["lentils", "lentil", "red lentils", "green lentils", "dal", "dhal"],
    fodmapLevel: "high",
    fodmapCategory: "gos",
    note: "Often considered higher in FODMAPs (GOS). Portion, preparation, and individual tolerance may matter.",
  },
  {
    canonicalName: "chickpeas",
    aliases: ["chickpeas", "chickpea", "garbanzo beans", "chana", "hummus"],
    fodmapLevel: "high",
    fodmapCategory: "gos",
    note: "Often considered higher in FODMAPs (GOS). Portion, preparation, and individual tolerance may matter.",
  },
];

const aliasIndex = buildAliasIndex(FOOD_DATASET);

function buildAliasIndex(dataset: FoodClassification[]) {
  const index = new Map<string, FoodClassification>();

  for (const food of dataset) {
    for (const alias of food.aliases) {
      index.set(normalizeFoodName(alias), food);
    }

    index.set(normalizeFoodName(food.canonicalName), food);
  }

  return index;
}

export function normalizeFoodName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitMealText(mealText: string): string[] {
  return mealText
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function findFoodClassification(query: string): FoodClassification | null {
  const normalized = normalizeFoodName(query);
  if (!normalized) return null;

  const direct = aliasIndex.get(normalized);
  if (direct) return direct;

  for (const [alias, food] of aliasIndex.entries()) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return food;
    }
  }

  return null;
}

export function classifyFoodItem(item: string): FoodMatchResult {
  const normalizedInput = normalizeFoodName(item);
  const match = findFoodClassification(item);

  if (!match) {
    return {
      input: item,
      normalizedInput,
      matched: false,
      canonicalName: null,
      fodmapLevel: "unknown",
      fodmapCategory: null,
      note: UNKNOWN_NOTE,
    };
  }

  return {
    input: item,
    normalizedInput,
    matched: true,
    canonicalName: match.canonicalName,
    fodmapLevel: match.fodmapLevel,
    fodmapCategory: match.fodmapCategory === "unknown" ? null : match.fodmapCategory,
    note: match.note,
  };
}

export type MealOverallLabel =
  | "Mostly low-FODMAP items"
  | "Contains some potentially higher-FODMAP items"
  | "Several items could be higher-FODMAP"
  | "Not enough recognised information";

export function getMealOverallLabel(summary: MealSummary): MealOverallLabel {
  if (!summary.items.length || summary.knownCount === 0) {
    return "Not enough recognised information";
  }

  if (summary.highCount >= 2 || (summary.highCount >= 1 && summary.moderateCount >= 1)) {
    return "Several items could be higher-FODMAP";
  }

  if (summary.highCount >= 1 || summary.moderateCount >= 1) {
    return "Contains some potentially higher-FODMAP items";
  }

  return "Mostly low-FODMAP items";
}

export function formatFodmapLevelLabel(level: FodmapLevel): string {
  if (level === "unknown") return "Not classified yet";

  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function formatFodmapCategoryLabel(category: FodmapCategory | null): string | null {
  if (!category || category === "unknown") return null;

  const labels: Record<Exclude<FodmapCategory, "unknown">, string> = {
    fructans: "Fructans",
    lactose: "Lactose",
    gos: "GOS",
    excess_fructose: "Excess fructose",
    polyols: "Polyols",
  };

  return labels[category];
}

export function summarizeMeal(mealText: string): MealSummary {
  const items = splitMealText(mealText).map(classifyFoodItem);

  const lowCount = items.filter((item) => item.fodmapLevel === "low").length;
  const moderateCount = items.filter((item) => item.fodmapLevel === "moderate").length;
  const highCount = items.filter((item) => item.fodmapLevel === "high").length;
  const unknownCount = items.filter((item) => item.fodmapLevel === "unknown").length;
  const knownCount = items.length - unknownCount;

  const summaryNotes: string[] = [];

  if (!items.length) {
    summaryNotes.push("No food items were detected in this meal text.");
    return {
      items,
      knownCount: 0,
      unknownCount: 0,
      lowCount: 0,
      moderateCount: 0,
      highCount: 0,
      summaryNotes,
    };
  }

  if (knownCount) {
    summaryNotes.push(
      `${knownCount} item(s) matched the MUNA beta food list. Classifications are educational only.`
    );
  }

  if (unknownCount) {
    summaryNotes.push(
      `${unknownCount} item(s) are not in the beta list yet. Portion and individual tolerance may matter.`
    );
  }

  if (highCount) {
    summaryNotes.push(
      `${highCount} matched item(s) are often considered higher in FODMAPs for some people.`
    );
  }

  if (moderateCount) {
    summaryNotes.push(
      `${moderateCount} matched item(s) are often considered moderate in FODMAPs depending on portion.`
    );
  }

  if (lowCount) {
    summaryNotes.push(
      `${lowCount} matched item(s) are often considered lower in FODMAPs at modest portions.`
    );
  }

  summaryNotes.push("This summary is not a diagnosis and does not replace advice from a qualified clinician or dietitian.");

  return {
    items,
    knownCount,
    unknownCount,
    lowCount,
    moderateCount,
    highCount,
    summaryNotes,
  };
}

export function getFoodDataset(): readonly FoodClassification[] {
  return FOOD_DATASET;
}

export type MealLogRow = {
  foods?: string | null;
  notes?: string | null;
  meal_type?: string | null;
  eaten_at?: string | null;
  created_at?: string | null;
};

export type SymptomLogRow = {
  symptoms?: string | null;
  severity?: number | null;
  stress_level?: number | null;
  bloating_level?: number | null;
  pain_level?: number | null;
  logged_at?: string | null;
  created_at?: string | null;
};

export type FoodAssociationConfidence = "Limited" | "Moderate" | "Higher";

export type DashboardFoodInsight = {
  hasPattern: boolean;
  observation: string;
  limitation: string;
  experiment: string;
  linkHref: string;
  linkLabel: string;
};

const INSUFFICIENT_DASHBOARD_INSIGHT: DashboardFoodInsight = {
  hasPattern: false,
  observation:
    "Keep logging meals and symptoms. MUNA needs repeated observations before it can identify a meaningful personal pattern.",
  limitation: "",
  experiment: "",
  linkHref: "/add-meal",
  linkLabel: "Log a meal",
};

type FoodExposureStats = {
  totalMeals: number;
  linkedMeals: number;
  symptomNotes: string[];
};

function capitalizeFoodLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getLogDate(row: { eaten_at?: string | null; logged_at?: string | null; created_at?: string | null }): string | null {
  for (const value of [row.eaten_at, row.logged_at, row.created_at]) {
    if (typeof value === "string" && value.length >= 10) {
      return value.slice(0, 10);
    }
  }

  return null;
}

function getLogTimestampMs(row: {
  eaten_at?: string | null;
  logged_at?: string | null;
  created_at?: string | null;
}): number | null {
  for (const value of [row.eaten_at, row.logged_at, row.created_at]) {
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function addDaysToIsoDate(date: string, days: number): string | null {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return null;

  const next = new Date(parsed);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function symptomSeverityValue(row: SymptomLogRow): number | null {
  const pain = row.pain_level ?? row.severity ?? null;
  const bloating = row.bloating_level ?? null;
  const values = [pain, bloating].filter((value): value is number => value !== null && Number.isFinite(value));

  if (!values.length) return null;
  return Math.max(...values);
}

function symptomDescriptor(row: SymptomLogRow): string {
  const text = `${row.symptoms ?? ""}`.toLowerCase();
  const bloating = row.bloating_level;
  const pain = row.pain_level ?? row.severity;

  if ((bloating !== null && bloating !== undefined && bloating >= 4) || /bloating/i.test(text)) {
    return "higher bloating";
  }

  if ((pain !== null && pain !== undefined && pain >= 4) || /pain|cramp/i.test(text)) {
    return "elevated pain";
  }

  return "elevated symptoms";
}

function mealFoodTextFromRow(row: MealLogRow): string | null {
  const parts = [row.foods, row.notes, row.meal_type].filter((value): value is string => Boolean(value?.trim()));
  const combined = parts.join(", ").trim();
  return combined || null;
}

function extractCanonicalFoodsFromMealRow(row: MealLogRow): string[] {
  const text = mealFoodTextFromRow(row);
  if (!text) return [];

  const foods = new Set<string>();
  for (const item of splitMealText(text)) {
    const classified = classifyFoodItem(item);
    if (classified.matched && classified.canonicalName) {
      foods.add(classified.canonicalName);
    }
  }

  return Array.from(foods);
}

function getSymptomHeavyDays(symptoms: SymptomLogRow[]): Map<string, string> {
  const heavyDays = new Map<string, string>();

  for (const row of symptoms) {
    const date = getLogDate(row);
    if (!date) continue;

    const severity = symptomSeverityValue(row);
    if (severity === null || severity < 4) continue;

    heavyDays.set(date, symptomDescriptor(row));
  }

  return heavyDays;
}

function symptomFollowsMeal(
  meal: MealLogRow,
  mealDate: string,
  symptomHeavyDays: Map<string, string>,
  symptoms: SymptomLogRow[]
): { linked: boolean; symptomNote?: string } {
  const nextDay = addDaysToIsoDate(mealDate, 1);
  if (nextDay && symptomHeavyDays.has(nextDay)) {
    return { linked: true, symptomNote: symptomHeavyDays.get(nextDay) };
  }

  if (!symptomHeavyDays.has(mealDate)) {
    return { linked: false };
  }

  const mealTimestamp = getLogTimestampMs(meal);
  const sameDaySymptoms = symptoms.filter((row) => getLogDate(row) === mealDate);

  for (const symptom of sameDaySymptoms) {
    const severity = symptomSeverityValue(symptom);
    if (severity === null || severity < 4) continue;

    const symptomTimestamp = getLogTimestampMs(symptom);
    if (mealTimestamp !== null && symptomTimestamp !== null && mealTimestamp < symptomTimestamp) {
      return { linked: true, symptomNote: symptomHeavyDays.get(mealDate) };
    }
  }

  return { linked: false };
}

function associationConfidenceLabel(
  totalExposures: number,
  linkedMeals: number
): FoodAssociationConfidence | null {
  if (totalExposures < 2 || linkedMeals < 1) return null;
  if (totalExposures >= 3 && linkedMeals >= 2 && totalExposures >= 7) return "Higher";
  if (totalExposures >= 3 && linkedMeals >= 2) return "Moderate";
  return "Limited";
}

function dominantSymptomNote(notes: string[]): string {
  const counts = new Map<string, number>();
  for (const note of notes) {
    counts.set(note, (counts.get(note) ?? 0) + 1);
  }

  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? "elevated symptoms";
}

function buildFoodExperiment(food: string): string {
  return `Consider observing one comparable ${food}-free meal rather than removing several foods at once.`;
}

export function buildDashboardFoodInsight(
  meals: MealLogRow[],
  symptoms: SymptomLogRow[]
): DashboardFoodInsight {
  if (!meals.length || !symptoms.length) {
    return INSUFFICIENT_DASHBOARD_INSIGHT;
  }

  const symptomHeavyDays = getSymptomHeavyDays(symptoms);
  if (!symptomHeavyDays.size) {
    return INSUFFICIENT_DASHBOARD_INSIGHT;
  }

  const stats = new Map<string, FoodExposureStats>();

  for (const meal of meals) {
    const mealDate = getLogDate(meal);
    if (!mealDate) continue;

    const foods = extractCanonicalFoodsFromMealRow(meal);
    if (!foods.length) continue;

    const link = symptomFollowsMeal(meal, mealDate, symptomHeavyDays, symptoms);

    for (const food of foods) {
      const current = stats.get(food) ?? { totalMeals: 0, linkedMeals: 0, symptomNotes: [] };
      current.totalMeals += 1;
      if (link.linked && link.symptomNote) {
        current.linkedMeals += 1;
        current.symptomNotes.push(link.symptomNote);
      }
      stats.set(food, current);
    }
  }

  if (!stats.size) {
    return INSUFFICIENT_DASHBOARD_INSIGHT;
  }

  const ranked = Array.from(stats.entries())
    .map(([food, value]) => ({
      food,
      ...value,
      confidence: associationConfidenceLabel(value.totalMeals, value.linkedMeals),
    }))
    .filter((item) => item.linkedMeals >= 1)
    .sort((a, b) => b.linkedMeals - a.linkedMeals || b.totalMeals - a.totalMeals);

  const best = ranked[0];
  if (!best || best.confidence === null) {
    return INSUFFICIENT_DASHBOARD_INSIGHT;
  }

  const foodLabel = capitalizeFoodLabel(best.food);
  const symptomText = dominantSymptomNote(best.symptomNotes);
  const recordLabel = best.linkedMeals === 1 ? "record" : "records";

  const observation = `${foodLabel} appeared before ${symptomText} in ${best.linkedMeals} recent ${recordLabel}.`;

  const limitation =
    best.confidence === "Higher"
      ? "Association confidence is higher based on logging volume, not medical certainty."
      : best.confidence === "Moderate"
        ? "Evidence is moderate based on your logs, not proof of cause."
        : "Evidence is still limited.";

  return {
    hasPattern: true,
    observation,
    limitation,
    experiment: buildFoodExperiment(best.food),
    linkHref: "/analytics",
    linkLabel: "View analytics",
  };
}

type SelfTestCase = {
  name: string;
  run: () => boolean;
};

export function runFoodIntelligenceSelfTest(): {
  passed: number;
  failed: number;
  errors: string[];
} {
  const cases: SelfTestCase[] = [
    {
      name: "normalises food names",
      run: () => normalizeFoodName("  Onion, ") === "onion",
    },
    {
      name: "splits comma-separated meals",
      run: () => splitMealText("rice, chicken, onion").length === 3,
    },
    {
      name: "matches onion alias",
      run: () => classifyFoodItem("red onion").matched && classifyFoodItem("red onion").fodmapLevel === "high",
    },
    {
      name: "matches chapati alias",
      run: () => classifyFoodItem("roti").canonicalName === "chapati",
    },
    {
      name: "unknown food stays unknown",
      run: () => {
        const result = classifyFoodItem("mango");
        return result.fodmapLevel === "unknown" && result.fodmapCategory === null && result.note === UNKNOWN_NOTE;
      },
    },
    {
      name: "unknown food has no invented triggers",
      run: () => {
        const result = classifyFoodItem("mystery spice");
        return !result.matched && Boolean(result.note?.includes("not in the MUNA beta food list"));
      },
    },
    {
      name: "summarises mixed meal",
      run: () => {
        const summary = summarizeMeal("rice\nonion\nmystery food");
        return summary.items.length === 3 && summary.knownCount === 2 && summary.unknownCount === 1;
      },
    },
    {
      name: "notes use cautious wording",
      run: () => FOOD_DATASET.every((food) => food.note.toLowerCase().includes("often considered")),
    },
    {
      name: "dataset includes required beta foods",
      run: () => {
        const required = [
          "onion",
          "garlic",
          "wheat bread",
          "chapati",
          "rice",
          "oats",
          "milk",
          "yoghurt",
          "apple",
          "banana",
          "chicken",
          "egg",
          "potato",
          "tomato",
          "lentils",
          "chickpeas",
        ];
        const canonical = new Set(FOOD_DATASET.map((food) => food.canonicalName));
        return required.every((name) => canonical.has(name));
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
        errors.push(`${testCase.name}: assertion failed`);
      }
    } catch (error) {
      failed += 1;
      errors.push(`${testCase.name}: ${error instanceof Error ? error.message : "unexpected error"}`);
    }
  }

  return { passed, failed, errors };
}
