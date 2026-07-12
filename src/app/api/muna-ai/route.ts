import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const redFlagPattern =
  /\b(blood in stool|bloody stool|black stool|severe pain|fever|dehydration|fainting|passed out|unexplained weight loss|weight loss)\b/i;

const systemPrompt = `
You are MUNA AI, a warm IBS brain-gut health companion inside the MUNA IBS app.

Medical disclaimer:
MUNA AI is for general education and self-tracking support only. You do not provide medical diagnosis, prescribe medicine, claim to cure IBS, or replace a qualified doctor, gastroenterologist, dietitian, or emergency care.

Core rules:
- Never invent user information.
- Never claim causation from correlation.
- Never diagnose.
- Never prescribe or recommend stopping medication.
- Never promise symptom improvement.
- Say clearly when there is insufficient information.
- Use only one practical suggestion unless the user asks for more.
- The user should feel understood before being analysed.

How to distinguish information in your replies:
- Actual user data: only what appears in the health context as logged values.
- Missing data: say it is not logged, unavailable, or insufficient — never fill gaps with guesses.
- General educational information: clearly frame as general IBS or brain-gut education, not personal facts.
- Possible associations: use gentle language such as "may be associated with" or "appears alongside in your logs" — never state cause and effect.
- Confirmed red-flag symptoms: treat as urgent safety concerns and advise immediate medical care.

Personality and flow:
- Sound like a calm, compassionate companion talking to a friend on a difficult day.
- Never sound robotic, clinical (except for safety), guilty, blaming, or judgmental.
- Normally follow this natural flow, but adapt freely — do not force every reply into the same template:
  1. Warm acknowledgement.
  2. The most relevant observation from actual logs (if any exist).
  3. A simple explanation, including uncertainty where data is limited.
  4. One small practical next step.
  5. A gentle closing.
- Do not display headings unless they genuinely improve readability.
- Keep most responses concise and conversational.
- Use plain language and short paragraphs.

When personal data is limited, use wording similar to:
"I don't have enough logged information yet to identify a reliable personal pattern. We can still discuss general IBS information, and your future logs will help me understand your experience better."

Data use:
- Use only the user's own tracked trends when they exist in the health context.
- A personal memory profile may also be provided. Treat its "Observations" as logged facts, "Associations" as unconfirmed patterns, "User-marked" as self-reported, and "Unavailable" as missing — never upgrade these into diagnoses or certainties.
- When data confidence is Low, lean on general education and encourage logging.
- Data confidence labels (Low, Moderate, Higher) reflect logging volume only — never describe them as clinical certainty.
- Do not compute or state gut scores, flare predictions, or confidence percentages unless they appear in the health context.
- For diet ideas, frame them as general options to discuss with a qualified doctor or dietitian.

Safety:
- If the user mentions urgent red flags such as blood in stool, severe pain, fever, dehydration, black stool, fainting, or unexplained weight loss, advise urgent medical care immediately.
- If symptoms are new, worsening, persistent, or worrying, advise contacting a qualified clinician.
- End most answers with a brief, gentle reminder that MUNA is educational only and is not a diagnosis.
`;

type HealthData = {
  userId?: string;
  profile: Record<string, unknown> | null;
  meals: Record<string, unknown>[];
  water: Record<string, unknown>[];
  sleep: Record<string, unknown>[];
  symptoms: Record<string, unknown>[];
  stool: Record<string, unknown>[];
  medications: Record<string, unknown>[];
  exercise: Record<string, unknown>[];
  flareHistory: Record<string, unknown>[];
  triggerFoods: Record<string, unknown>[];
  accessNotes: string[];
};

type MemoryEntryKind = "observation" | "association" | "user_marked" | "unavailable";

type MemoryEntry = {
  kind: MemoryEntryKind;
  label: string;
  value: string;
};

type PersonalMemoryProfile = {
  version: number;
  generatedAt: string;
  hasPersonalPatterns: boolean;
  likelyTriggerFoods: MemoryEntry[];
  toleratedFoods: MemoryEntry[];
  averageSleep: MemoryEntry;
  hydrationHabits: MemoryEntry;
  stressTrends: MemoryEntry;
  bowelTrends: MemoryEntry;
  ibsSubtype: MemoryEntry;
  userPreferences: MemoryEntry[];
};

type StoredUserMemory = {
  user_id: string;
  memory_json: PersonalMemoryProfile;
  confidence_level: ConfidenceLabel;
  data_days: number;
  last_updated: string;
  version: number;
};

const MEMORY_ENGINE_VERSION = 1;
const MEMORY_TTL_MS = 24 * 60 * 60 * 1000;

type ConfidenceLabel = "Low" | "Moderate" | "Higher";

type HealthSummary = {
  authenticated: boolean;
  confidenceLabel: ConfidenceLabel;
  relevantLoggedDays: number;
  totalRecords: number;
  hasInsufficientData: boolean;
  latestPain: number | null;
  latestBloating: number | null;
  latestStress: number | null;
  latestSleepHours: number | null;
  latestBristol: number | null;
  latestWaterLiters: number | null;
  observedPositiveHabits: string[];
  possibleAssociations: string[];
  knownTriggers: string[];
};

function createSupabaseForRequest(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const authorization = request.headers.get("authorization") || "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: authorization
      ? {
          headers: {
            Authorization: authorization,
          },
        }
      : undefined,
  });
}

async function safeSelect(
  supabase: SupabaseClient,
  table: string,
  userId: string,
  limit = 20
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { rows: [], error: `${table}: ${error.message}` };
  }

  return { rows: (data || []) as Record<string, unknown>[] };
}

function numberFrom(row: Record<string, unknown> | undefined, keys: string[]): number | null {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }

  return null;
}

function textFrom(row: Record<string, unknown> | undefined, keys: string[]): string | null {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return null;
}

function getDateFromRow(row: Record<string, unknown>): string | null {
  const keys = [
    "symptom_date",
    "logged_at",
    "created_at",
    "meal_date",
    "eaten_at",
    "sleep_date",
    "slept_on",
    "log_date",
    "logged_on",
  ];

  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.length >= 10) {
      return value.slice(0, 10);
    }
  }

  return null;
}

function countRelevantLoggedDays(data: HealthData): number {
  const days = new Set<string>();
  const rows = [...data.meals, ...data.water, ...data.sleep, ...data.symptoms, ...data.stool];

  for (const row of rows) {
    const date = getDateFromRow(row);
    if (date) days.add(date);
  }

  return days.size;
}

function computeConfidenceLabel(relevantDays: number, totalRecords: number): ConfidenceLabel {
  if (relevantDays < 3 || totalRecords < 3) return "Low";
  if (relevantDays >= 14) return "Higher";
  return "Moderate";
}

function waterLitersFromRow(row: Record<string, unknown> | undefined): number | null {
  if (!row) return null;

  const amountMl = numberFrom(row, ["amount_ml"]);
  if (amountMl !== null) return amountMl / 1000;

  const cups = numberFrom(row, ["cups"]);
  if (cups !== null) return cups * 0.25;

  return null;
}

function formatLoggedValue(value: number | null, unit = ""): string {
  if (value === null) return "not logged";
  return unit ? `${value}${unit}` : String(value);
}

function buildHealthSummary(data: HealthData): HealthSummary {
  const latestSymptom = data.symptoms[0];
  const latestSleep = data.sleep[0];
  const latestStool = data.stool[0];
  const latestWater = data.water[0];

  const pain = numberFrom(latestSymptom, ["pain_level", "severity", "pain"]);
  const bloating = numberFrom(latestSymptom, ["bloating_level", "bloating"]);
  const stress = numberFrom(latestSymptom, ["stress_level", "stress"]);
  const sleepHours = numberFrom(latestSleep, ["hours", "sleep_hours"]);
  const bristol = numberFrom(latestStool, ["bristol_type", "type"]);
  const waterLiters = waterLitersFromRow(latestWater);

  const relevantLoggedDays = countRelevantLoggedDays(data);
  const totalRecords =
    data.meals.length +
    data.water.length +
    data.sleep.length +
    data.symptoms.length +
    data.stool.length +
    data.medications.length +
    data.flareHistory.length +
    data.triggerFoods.length;

  const confidenceLabel = computeConfidenceLabel(relevantLoggedDays, totalRecords);
  const authenticated = Boolean(data.userId);
  const hasInsufficientData = !authenticated || confidenceLabel === "Low";

  const observedPositiveHabits: string[] = [];
  if (sleepHours !== null && sleepHours >= 7) {
    observedPositiveHabits.push(`Slept ${sleepHours.toFixed(1)} hours (logged)`);
  }
  if (stress !== null && stress <= 4) {
    observedPositiveHabits.push(`Stress level ${stress} logged as relatively low`);
  }
  if (waterLiters !== null && waterLiters >= 1.8) {
    observedPositiveHabits.push(`Hydration ${waterLiters.toFixed(1)} L logged`);
  }
  if (data.exercise.length > 0) {
    observedPositiveHabits.push("Exercise or movement logged");
  }
  if (bristol !== null && [3, 4, 5].includes(Math.round(bristol))) {
    observedPositiveHabits.push(`Bristol type ${Math.round(bristol)} logged`);
  }

  const latestMealText = data.meals
    .slice(0, 5)
    .map((meal) => textFrom(meal, ["foods", "food_name", "meal_type", "notes", "meal_name"]))
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  const possibleAssociations: string[] = [];
  if (stress !== null && stress >= 6) {
    possibleAssociations.push(`Elevated stress (${stress}) appears in recent symptom logs`);
  }
  if (sleepHours !== null && sleepHours < 7) {
    possibleAssociations.push(`Sleep below 7 hours (${sleepHours.toFixed(1)} hrs) logged recently`);
  }
  if (waterLiters !== null && waterLiters < 1.8) {
    possibleAssociations.push(`Water intake ${waterLiters.toFixed(1)} L logged recently`);
  }
  if (latestMealText.includes("coffee")) {
    possibleAssociations.push("Coffee appears in recent meal logs");
  }
  if (latestMealText.includes("dairy") || latestMealText.includes("milk")) {
    possibleAssociations.push("Dairy appears in recent meal logs");
  }
  if (latestMealText.includes("garlic") || latestMealText.includes("onion")) {
    possibleAssociations.push("Onion or garlic appears in recent meal logs");
  }

  const knownTriggers = data.triggerFoods
    .slice(0, 5)
    .map((row) => textFrom(row, ["food_name", "name"]))
    .filter((value): value is string => Boolean(value));

  return {
    authenticated,
    confidenceLabel,
    relevantLoggedDays,
    totalRecords,
    hasInsufficientData,
    latestPain: pain,
    latestBloating: bloating,
    latestStress: stress,
    latestSleepHours: sleepHours,
    latestBristol: bristol,
    latestWaterLiters: waterLiters,
    observedPositiveHabits,
    possibleAssociations,
    knownTriggers,
  };
}

function formatLogSection(label: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return `${label}: none logged`;
  return `${label}:\n${JSON.stringify(rows.slice(0, 8))}`;
}

function buildHealthContext(data: HealthData): string {
  const summary = buildHealthSummary(data);

  const lines = [
    "MUNA retrieved tracked health data before answering.",
    "",
    `Authentication: ${summary.authenticated ? "signed in" : "not signed in"}`,
    `Data confidence (logging volume only, not clinical certainty): ${summary.confidenceLabel}`,
    `Relevant logged days: ${summary.relevantLoggedDays}`,
    `Total health records retrieved: ${summary.totalRecords}`,
    `Insufficient personal data for reliable patterns: ${summary.hasInsufficientData ? "yes" : "no"}`,
    "",
    "Data access notes:",
    data.accessNotes.length
      ? data.accessNotes.join("\n")
      : summary.authenticated
        ? "All available health tables were queried successfully."
        : "Private tracked health data could not be retrieved.",
    "",
    "Latest logged values (omitted when not logged):",
    `Pain: ${formatLoggedValue(summary.latestPain)}`,
    `Bloating: ${formatLoggedValue(summary.latestBloating)}`,
    `Stress: ${formatLoggedValue(summary.latestStress)}`,
    `Sleep hours: ${formatLoggedValue(summary.latestSleepHours)}`,
    `Bristol stool type: ${formatLoggedValue(summary.latestBristol)}`,
    `Water intake (L): ${summary.latestWaterLiters === null ? "not logged" : summary.latestWaterLiters.toFixed(1)}`,
  ];

  if (summary.observedPositiveHabits.length) {
    lines.push("", "Observed positive habits from logs:");
    summary.observedPositiveHabits.forEach((item) => lines.push(`- ${item}`));
  }

  if (summary.possibleAssociations.length) {
    lines.push("", "Possible associations in logs (not confirmed causes):");
    summary.possibleAssociations.forEach((item) => lines.push(`- ${item}`));
  }

  if (summary.knownTriggers.length) {
    lines.push("", "User-marked trigger foods:");
    summary.knownTriggers.forEach((item) => lines.push(`- ${item}`));
  }

  lines.push(
    "",
    formatLogSection("Recent meals", data.meals),
    "",
    formatLogSection("Water logs", data.water),
    "",
    formatLogSection("Sleep logs", data.sleep),
    "",
    formatLogSection("Symptoms and stress", data.symptoms),
    "",
    formatLogSection("Stool logs", data.stool),
    "",
    formatLogSection("Medication reminders", data.medications),
    "",
    formatLogSection("Exercise logs", data.exercise),
    "",
    formatLogSection("Previous flare history / reports", data.flareHistory),
    "",
    formatLogSection("Trigger foods", data.triggerFoods)
  );

  return lines.join("\n");
}

const TRIGGER_KEYWORDS = [
  "coffee",
  "milk",
  "dairy",
  "onion",
  "garlic",
  "wheat",
  "gluten",
  "fried",
  "spicy",
  "beans",
  "lentils",
] as const;

const MEAL_FLAG_KEYS = [
  "has_dairy",
  "has_onion",
  "has_garlic",
  "has_caffeine",
  "has_gluten",
] as const;

function averageNumbers(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function mealSearchText(row: Record<string, unknown>): string {
  const parts = [
    textFrom(row, ["foods", "food_name", "meal_name", "notes", "ingredients", "drinks"]),
  ].filter((value): value is string => Boolean(value));

  for (const key of MEAL_FLAG_KEYS) {
    if (row[key] === true) {
      parts.push(key.replace("has_", ""));
    }
  }

  return parts.join(" ").toLowerCase();
}

function symptomSeverity(row: Record<string, unknown>): number | null {
  const pain = numberFrom(row, ["pain_level", "severity", "pain"]);
  const bloating = numberFrom(row, ["bloating_level", "bloating"]);
  const values = [pain, bloating].filter((value): value is number => value !== null);

  if (!values.length) return null;
  return Math.max(...values);
}

function getSymptomHeavyDates(symptoms: Record<string, unknown>[]): Set<string> {
  const dates = new Set<string>();

  for (const row of symptoms) {
    const severity = symptomSeverity(row);
    if (severity === null || severity < 4) continue;

    const date = getDateFromRow(row);
    if (date) dates.add(date);
  }

  return dates;
}

function collectFoodTokens(text: string): string[] {
  const tokens = new Set<string>();

  for (const keyword of TRIGGER_KEYWORDS) {
    if (text.includes(keyword)) tokens.add(keyword);
  }

  return Array.from(tokens);
}

function buildLikelyTriggerFoodEntries(
  meals: Record<string, unknown>[],
  symptoms: Record<string, unknown>[],
  triggerFoods: Record<string, unknown>[]
): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const symptomHeavyDates = getSymptomHeavyDates(symptoms);
  const associationCounts = new Map<string, number>();

  if (symptomHeavyDates.size >= 2) {
    for (const meal of meals) {
      const mealDate = getDateFromRow(meal);
      if (!mealDate || !symptomHeavyDates.has(mealDate)) continue;

      for (const token of collectFoodTokens(mealSearchText(meal))) {
        associationCounts.set(token, (associationCounts.get(token) ?? 0) + 1);
      }
    }
  }

  const repeatedAssociations = Array.from(associationCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [food, count] of repeatedAssociations) {
    entries.push({
      kind: "association",
      label: "Likely trigger food",
      value: `${food} appeared in ${count} meal logs on days with elevated symptoms (association only, not confirmed)`,
    });
  }

  for (const row of triggerFoods.slice(0, 5)) {
    const food = textFrom(row, ["food_name", "name"]);
    if (!food) continue;

    entries.push({
      kind: "user_marked",
      label: "User-marked trigger food",
      value: food,
    });
  }

  if (!entries.length) {
    entries.push({
      kind: "unavailable",
      label: "Likely trigger foods",
      value: "insufficient repeated associations in logs",
    });
  }

  return entries;
}

function buildToleratedFoodEntries(
  meals: Record<string, unknown>[],
  symptoms: Record<string, unknown>[]
): MemoryEntry[] {
  const symptomHeavyDates = getSymptomHeavyDates(symptoms);
  const toleratedCounts = new Map<string, number>();

  for (const meal of meals) {
    const mealDate = getDateFromRow(meal);
    if (!mealDate || symptomHeavyDates.has(mealDate)) continue;

    for (const token of collectFoodTokens(mealSearchText(meal))) {
      toleratedCounts.set(token, (toleratedCounts.get(token) ?? 0) + 1);
    }
  }

  const toleratedFoods = Array.from(toleratedCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!toleratedFoods.length) {
    return [
      {
        kind: "unavailable",
        label: "Commonly tolerated foods",
        value: "insufficient repeated meal logs without elevated symptoms",
      },
    ];
  }

  return toleratedFoods.map(([food, count]) => ({
    kind: "observation",
    label: "Commonly tolerated food",
    value: `${food} logged ${count} times on days without elevated symptoms`,
  }));
}

function buildAverageSleepEntry(sleep: Record<string, unknown>[]): MemoryEntry {
  const values = sleep
    .map((row) => numberFrom(row, ["hours", "sleep_hours"]))
    .filter((value): value is number => value !== null);

  const average = averageNumbers(values);
  if (average === null) {
    return {
      kind: "unavailable",
      label: "Average sleep",
      value: "not logged",
    };
  }

  return {
    kind: "observation",
    label: "Average sleep",
    value: `${average.toFixed(1)} hours across ${values.length} logged entries`,
  };
}

function buildHydrationHabitsEntry(water: Record<string, unknown>[]): MemoryEntry {
  const dailyTotals = new Map<string, number>();

  for (const row of water) {
    const date = getDateFromRow(row);
    const liters = waterLitersFromRow(row);
    if (!date || liters === null) continue;

    dailyTotals.set(date, (dailyTotals.get(date) ?? 0) + liters);
  }

  const dailyValues = Array.from(dailyTotals.values());
  const average = averageNumbers(dailyValues);

  if (average === null) {
    return {
      kind: "unavailable",
      label: "Hydration habits",
      value: "not logged",
    };
  }

  const belowTargetDays = dailyValues.filter((value) => value < 1.8).length;
  const trend =
    belowTargetDays === dailyValues.length
      ? "often below 1.8 L on logged days"
      : belowTargetDays === 0
        ? "usually at or above 1.8 L on logged days"
        : `mixed pattern (${belowTargetDays} of ${dailyValues.length} logged days below 1.8 L)`;

  return {
    kind: "observation",
    label: "Hydration habits",
    value: `average ${average.toFixed(1)} L per logged day; ${trend}`,
  };
}

function buildStressTrendEntry(symptoms: Record<string, unknown>[]): MemoryEntry {
  const stressReadings = symptoms
    .map((row) => ({
      date: getDateFromRow(row),
      stress: numberFrom(row, ["stress_level", "stress"]),
    }))
    .filter((item): item is { date: string | null; stress: number } => item.stress !== null);

  if (stressReadings.length < 2) {
    return {
      kind: "unavailable",
      label: "Stress trends",
      value: "insufficient stress logs",
    };
  }

  const average = averageNumbers(stressReadings.map((item) => item.stress));
  const chronological = [...stressReadings].reverse();
  const midpoint = Math.ceil(chronological.length / 2);
  const earlier = averageNumbers(chronological.slice(0, midpoint).map((item) => item.stress));
  const recent = averageNumbers(chronological.slice(midpoint).map((item) => item.stress));

  let direction = "stable in recent logs";
  if (earlier !== null && recent !== null) {
    if (recent - earlier >= 1) direction = "higher in more recent logs";
    else if (earlier - recent >= 1) direction = "lower in more recent logs";
  }

  return {
    kind: "observation",
    label: "Stress trends",
    value: `average stress ${average?.toFixed(1)} across ${stressReadings.length} logs; ${direction}`,
  };
}

function buildBowelTrendEntry(stool: Record<string, unknown>[]): MemoryEntry {
  const bristolValues = stool
    .map((row) => numberFrom(row, ["bristol_type", "type"]))
    .filter((value): value is number => value !== null)
    .map((value) => Math.round(value));

  if (!bristolValues.length) {
    return {
      kind: "unavailable",
      label: "Bowel movement trends",
      value: "not logged",
    };
  }

  const average = averageNumbers(bristolValues);
  const looseDays = bristolValues.filter((value) => value >= 6).length;
  const hardDays = bristolValues.filter((value) => value <= 2).length;
  const stableDays = bristolValues.filter((value) => value >= 3 && value <= 5).length;

  let pattern = "mixed Bristol types in logs";
  if (looseDays > hardDays && looseDays > stableDays) {
    pattern = "more frequent looser types (Bristol 6-7) in logs";
  } else if (hardDays > looseDays && hardDays > stableDays) {
    pattern = "more frequent harder types (Bristol 1-2) in logs";
  } else if (stableDays >= looseDays && stableDays >= hardDays) {
    pattern = "mostly Bristol types 3-5 in logs";
  }

  return {
    kind: "observation",
    label: "Bowel movement trends",
    value: `average Bristol type ${average?.toFixed(1)} across ${bristolValues.length} logs; ${pattern}`,
  };
}

function buildIbsSubtypeEntry(profile: Record<string, unknown> | null): MemoryEntry {
  const subtype = profile
    ? textFrom(profile, ["ibs_type", "ibs_subtype", "subtype", "diagnosis_type"])
    : null;

  if (!subtype) {
    return {
      kind: "unavailable",
      label: "IBS subtype",
      value: "not logged",
    };
  }

  return {
    kind: "user_marked",
    label: "IBS subtype",
    value: subtype,
  };
}

function buildUserPreferenceEntries(
  profile: Record<string, unknown> | null,
  medications: Record<string, unknown>[]
): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const preferenceFields = [
    ["dietary_preferences", "Dietary preference"],
    ["food_preferences", "Food preference"],
    ["preferences", "Preference"],
    ["goals", "Goal"],
    ["notes", "Note"],
  ] as const;

  if (profile) {
    for (const [field, label] of preferenceFields) {
      const value = textFrom(profile, [field]);
      if (!value) continue;

      entries.push({
        kind: "user_marked",
        label,
        value,
      });
    }
  }

  const medicationNames = medications
    .map((row) => textFrom(row, ["medication_name", "name", "title"]))
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);

  if (medicationNames.length) {
    entries.push({
      kind: "observation",
      label: "Tracked medications",
      value: medicationNames.join(", "),
    });
  }

  if (!entries.length) {
    entries.push({
      kind: "unavailable",
      label: "User preferences",
      value: "not logged",
    });
  }

  return entries;
}

function buildPersonalMemoryJson(data: HealthData): PersonalMemoryProfile {
  const likelyTriggerFoods = buildLikelyTriggerFoodEntries(data.meals, data.symptoms, data.triggerFoods);
  const toleratedFoods = buildToleratedFoodEntries(data.meals, data.symptoms);

  const profile: PersonalMemoryProfile = {
    version: MEMORY_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    hasPersonalPatterns: false,
    likelyTriggerFoods,
    toleratedFoods,
    averageSleep: buildAverageSleepEntry(data.sleep),
    hydrationHabits: buildHydrationHabitsEntry(data.water),
    stressTrends: buildStressTrendEntry(data.symptoms),
    bowelTrends: buildBowelTrendEntry(data.stool),
    ibsSubtype: buildIbsSubtypeEntry(data.profile),
    userPreferences: buildUserPreferenceEntries(data.profile, data.medications),
  };

  profile.hasPersonalPatterns = [
    ...profile.likelyTriggerFoods,
    ...profile.toleratedFoods,
    profile.averageSleep,
    profile.hydrationHabits,
    profile.stressTrends,
    profile.bowelTrends,
    profile.ibsSubtype,
    ...profile.userPreferences,
  ].some((entry) => entry.kind !== "unavailable");

  return profile;
}

function collectMemoryEntries(profile: PersonalMemoryProfile): MemoryEntry[] {
  return [
    ...profile.likelyTriggerFoods,
    ...profile.toleratedFoods,
    profile.averageSleep,
    profile.hydrationHabits,
    profile.stressTrends,
    profile.bowelTrends,
    profile.ibsSubtype,
    ...profile.userPreferences,
  ];
}

function isValidMemoryJson(value: unknown): value is PersonalMemoryProfile {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.version === "number" &&
    typeof record.generatedAt === "string" &&
    typeof record.hasPersonalPatterns === "boolean" &&
    Array.isArray(record.likelyTriggerFoods) &&
    Array.isArray(record.toleratedFoods) &&
    Array.isArray(record.userPreferences)
  );
}

function isMemoryFresh(lastUpdated: string): boolean {
  const updatedAt = Date.parse(lastUpdated);
  if (!Number.isFinite(updatedAt)) return false;
  return Date.now() - updatedAt < MEMORY_TTL_MS;
}

function formatMemoryEntry(entry: MemoryEntry): string {
  const prefix =
    entry.kind === "observation"
      ? "Observation"
      : entry.kind === "association"
        ? "Association"
        : entry.kind === "user_marked"
          ? "User-marked"
          : "Unavailable";

  return `- ${prefix} | ${entry.label}: ${entry.value}`;
}

function buildPersonalMemoryContext(profile: PersonalMemoryProfile): string {
  const grouped = {
    observation: [] as string[],
    association: [] as string[],
    user_marked: [] as string[],
    unavailable: [] as string[],
  };

  for (const entry of collectMemoryEntries(profile)) {
    grouped[entry.kind].push(formatMemoryEntry(entry));
  }

  const lines = [
    "Personal memory profile (derived from logged Supabase data only):",
    "Observations are logged facts. Associations are repeated patterns, not confirmed causes. User-marked items are self-reported. Unavailable means not enough data.",
    `Memory version: ${profile.version}`,
    `Generated at: ${profile.generatedAt}`,
    `Personal patterns available: ${profile.hasPersonalPatterns ? "yes" : "no"}`,
  ];

  if (grouped.observation.length) {
    lines.push("", "Observations:", ...grouped.observation);
  }

  if (grouped.association.length) {
    lines.push("", "Associations:", ...grouped.association);
  }

  if (grouped.user_marked.length) {
    lines.push("", "User-marked:", ...grouped.user_marked);
  }

  if (grouped.unavailable.length) {
    lines.push("", "Unavailable:", ...grouped.unavailable);
  }

  return lines.join("\n");
}

async function loadUserMemory(
  supabase: SupabaseClient,
  userId: string
): Promise<{ row: StoredUserMemory | null; error?: string }> {
  const { data, error } = await supabase
    .from("user_memory")
    .select("user_id, memory_json, confidence_level, data_days, last_updated, version")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { row: null, error: `user_memory: ${error.message}` };
  }

  if (!data) {
    return { row: null };
  }

  const memoryJson = data.memory_json;
  if (!isValidMemoryJson(memoryJson)) {
    return { row: null, error: "user_memory: stored memory_json is invalid" };
  }

  return {
    row: {
      user_id: data.user_id as string,
      memory_json: memoryJson,
      confidence_level: data.confidence_level as ConfidenceLabel,
      data_days: Number(data.data_days) || 0,
      last_updated: data.last_updated as string,
      version: Number(data.version) || MEMORY_ENGINE_VERSION,
    },
  };
}

async function saveUserMemory(
  supabase: SupabaseClient,
  userId: string,
  memoryJson: PersonalMemoryProfile,
  data: HealthData
): Promise<boolean> {
  const relevantLoggedDays = countRelevantLoggedDays(data);
  const totalRecords =
    data.meals.length +
    data.water.length +
    data.sleep.length +
    data.symptoms.length +
    data.stool.length +
    data.medications.length +
    data.flareHistory.length +
    data.triggerFoods.length;

  const { error } = await supabase.from("user_memory").upsert(
    {
      user_id: userId,
      memory_json: memoryJson,
      confidence_level: computeConfidenceLabel(relevantLoggedDays, totalRecords),
      data_days: relevantLoggedDays,
      last_updated: new Date().toISOString(),
      version: MEMORY_ENGINE_VERSION,
    },
    { onConflict: "user_id" }
  );

  return !error;
}

async function resolvePersonalMemory(
  supabase: SupabaseClient | null,
  healthData: HealthData,
  preloaded?: { row: StoredUserMemory | null; error?: string }
): Promise<{ profile: PersonalMemoryProfile; source: "cache" | "regenerated"; accessNotes: string[] }> {
  const accessNotes: string[] = [];
  const regenerated = buildPersonalMemoryJson(healthData);

  if (preloaded?.error) {
    accessNotes.push(preloaded.error);
  }

  if (!supabase || !healthData.userId) {
    return { profile: regenerated, source: "regenerated", accessNotes };
  }

  const cachedRow = preloaded?.row ?? null;

  if (cachedRow && isMemoryFresh(cachedRow.last_updated)) {
    return { profile: cachedRow.memory_json, source: "cache", accessNotes };
  }

  const saved = await saveUserMemory(supabase, healthData.userId, regenerated, healthData);
  if (!saved) {
    accessNotes.push("user_memory: regeneration succeeded but persistence failed; previous memory was not overwritten");
    if (cachedRow) {
      return { profile: cachedRow.memory_json, source: "cache", accessNotes };
    }
  }

  return { profile: regenerated, source: "regenerated", accessNotes };
}

async function safeProfileSelect(
  supabase: SupabaseClient,
  userId: string
): Promise<{ row: Record<string, unknown> | null; error?: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { row: null, error: `profiles: ${error.message}` };
  }

  return { row: (data as Record<string, unknown> | null) ?? null };
}

async function retrieveHealthData(request: Request): Promise<HealthData> {
  const supabase = createSupabaseForRequest(request);
  const empty: HealthData = {
    profile: null,
    meals: [],
    water: [],
    sleep: [],
    symptoms: [],
    stool: [],
    medications: [],
    exercise: [],
    flareHistory: [],
    triggerFoods: [],
    accessNotes: [],
  };

  if (!supabase) {
    return {
      ...empty,
      accessNotes: ["Supabase is not configured, so only general IBS guidance is available."],
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (userError || !userId) {
    return {
      ...empty,
      accessNotes: ["No signed-in user token was provided, so private tracked health data could not be retrieved."],
    };
  }

  const [
    profile,
    meals,
    water,
    sleep,
    symptoms,
    stool,
    medicationReminders,
    weeklyReports,
    triggerFoods,
  ] = await Promise.all([
    safeProfileSelect(supabase, userId),
    safeSelect(supabase, "meals", userId, 50),
    safeSelect(supabase, "water_logs", userId, 50),
    safeSelect(supabase, "sleep_logs", userId, 50),
    safeSelect(supabase, "symptoms", userId, 50),
    safeSelect(supabase, "bowel_movements", userId, 50),
    safeSelect(supabase, "medication_reminders", userId, 20),
    safeSelect(supabase, "weekly_reports", userId, 20),
    safeSelect(supabase, "trigger_foods", userId, 20),
  ]);

  const accessNotes = [
    profile.error,
    meals.error,
    water.error,
    sleep.error,
    symptoms.error,
    stool.error,
    medicationReminders.error,
    weeklyReports.error,
    triggerFoods.error,
  ].filter((item): item is string => Boolean(item));

  return {
    userId,
    profile: profile.row,
    meals: meals.rows,
    water: water.rows,
    sleep: sleep.rows,
    symptoms: symptoms.rows,
    stool: stool.rows,
    medications: medicationReminders.rows,
    exercise: [],
    flareHistory: weeklyReports.rows,
    triggerFoods: triggerFoods.rows,
    accessNotes,
  };
}

function isQuotaOrRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("billing") ||
    message.includes("insufficient")
  );
}

function isModelAvailabilityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("model") || message.includes("not found");
}

function openAIUserMessage(error: unknown): string {
  if (isQuotaOrRateLimitError(error)) {
    return "MUNA AI is temporarily unavailable due to service limits. Please try again later.";
  }

  return "MUNA AI could not respond right now. Please try again in a moment.";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "MUNA AI is not configured on the server. Please try again later." },
        { status: 500 }
      );
    }

    let body: { message?: unknown; history?: unknown };

    try {
      body = (await request.json()) as { message?: unknown; history?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

    if (!message) {
      return NextResponse.json({ error: "Please enter a question for MUNA AI." }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Please keep your question under 2,000 characters." },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey });
    const supabase = createSupabaseForRequest(request);

    let preloadedMemory: { row: StoredUserMemory | null; error?: string } = { row: null };
    if (supabase) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user?.id) {
        preloadedMemory = await loadUserMemory(supabase, authData.user.id);
      }
    }

    const healthData = await retrieveHealthData(request);
    const memoryResult = await resolvePersonalMemory(supabase, healthData, preloadedMemory);

    if (memoryResult.accessNotes.length) {
      healthData.accessNotes.push(...memoryResult.accessNotes);
    }

    const healthContext = buildHealthContext(healthData);
    const memoryContext = buildPersonalMemoryContext(memoryResult.profile);
    const redFlagContext = redFlagPattern.test(message)
      ? "\nUrgent safety context: The user's message may contain confirmed red-flag symptoms. Start by advising urgent medical care immediately. Keep the rest brief and safety-focused."
      : "";

    const conversationContext = history
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          "role" in item &&
          "content" in item &&
          typeof item.role === "string" &&
          typeof item.content === "string"
        ) {
          return `${item.role}: ${item.content.slice(0, 700)}`;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");

    const requestPayload = {
      instructions: `${systemPrompt}${redFlagContext}`,
      input: `
Health context:
${healthContext}

Personal memory profile:
${memoryContext}

Recent conversation:
${conversationContext || "No previous conversation in this session."}

User question:
${message}
`,
      temperature: 0.4,
      max_output_tokens: 650,
    };

    let response;

    try {
      response = await client.responses.create({
        model: "gpt-4.1-mini",
        ...requestPayload,
      });
    } catch (primaryError) {
      if (isQuotaOrRateLimitError(primaryError)) {
        return NextResponse.json({ error: openAIUserMessage(primaryError) }, { status: 503 });
      }

      if (!isModelAvailabilityError(primaryError)) {
        return NextResponse.json({ error: openAIUserMessage(primaryError) }, { status: 502 });
      }

      try {
        response = await client.responses.create({
          model: "gpt-4o-mini",
          ...requestPayload,
        });
      } catch (fallbackError) {
        return NextResponse.json({ error: openAIUserMessage(fallbackError) }, { status: 502 });
      }
    }

    const answer = response.output_text?.trim();

    if (!answer) {
      return NextResponse.json(
        { error: "MUNA AI returned an empty response. Please try again in a moment." },
        { status: 502 }
      );
    }

    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json(
      { error: "MUNA AI could not respond right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
