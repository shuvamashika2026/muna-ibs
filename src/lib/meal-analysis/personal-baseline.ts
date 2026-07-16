import type { SupabaseClient } from "@supabase/supabase-js";

export type PersonalBaseline = {
  ibsType: string;
  recentSymptomTrend: "Improving" | "Stable" | "Worsening" | "Insufficient data";
  recentBowelPattern: string;
  hydrationStatus: string;
  sleepStatus: string;
  relevantPersonalPatterns: string[];
  dataQuality: "Low" | "Moderate" | "High";
  vulnerabilityScore: number;
};

export async function buildPersonalBaseline(
  supabase: SupabaseClient,
  userId: string
): Promise<PersonalBaseline> {
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const [userResult, symptomsResult, bowelResult, waterResult, sleepResult] = await Promise.all([
    supabase.from("users").select("ibs_type, food_allergies").eq("id", userId).maybeSingle(),
    supabase
      .from("symptoms")
      .select("severity, bloating_level, pain_level, logged_at, created_at")
      .eq("user_id", userId)
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: false })
      .limit(14),
    supabase
      .from("bowel_movements")
      .select("bristol_type, logged_at, created_at")
      .eq("user_id", userId)
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: false })
      .limit(14),
    supabase
      .from("water_logs")
      .select("cups, logged_on")
      .eq("user_id", userId)
      .gte("logged_on", since.toISOString().slice(0, 10))
      .limit(14),
    supabase
      .from("sleep_logs")
      .select("hours, slept_on")
      .eq("user_id", userId)
      .gte("slept_on", since.toISOString().slice(0, 10))
      .limit(14),
  ]);

  const ibsType = String(userResult.data?.ibs_type ?? "Unknown");
  const allergies = String(userResult.data?.food_allergies ?? "").trim();

  const symptoms = symptomsResult.data ?? [];
  const bowel = bowelResult.data ?? [];
  const water = waterResult.data ?? [];
  const sleep = sleepResult.data ?? [];

  const symptomScores = symptoms.map((row) =>
    Math.max(row.severity ?? 0, row.bloating_level ?? 0, row.pain_level ?? 0)
  );

  const recentSymptomTrend = deriveSymptomTrend(symptomScores);
  const recentBowelPattern = deriveBowelPattern(bowel.map((row) => row.bristol_type));
  const hydrationStatus = deriveHydrationStatus(water.map((row) => row.cups ?? 0));
  const sleepStatus = deriveSleepStatus(sleep.map((row) => row.hours ?? 0));

  const relevantPersonalPatterns: string[] = [];
  if (allergies) relevantPersonalPatterns.push(`Reported allergies or intolerances: ${allergies.slice(0, 120)}`);
  if (recentSymptomTrend === "Worsening") {
    relevantPersonalPatterns.push("Recent symptom scores appear to be trending higher.");
  }

  const dataPoints = symptoms.length + bowel.length + water.length + sleep.length;
  const dataQuality: PersonalBaseline["dataQuality"] =
    dataPoints >= 10 ? "High" : dataPoints >= 4 ? "Moderate" : "Low";

  let vulnerabilityScore = 0;
  if (recentSymptomTrend === "Worsening") vulnerabilityScore += 4;
  if (hydrationStatus.includes("low")) vulnerabilityScore += 2;
  if (sleepStatus.includes("short")) vulnerabilityScore += 2;
  if (recentBowelPattern.includes("loose") || recentBowelPattern.includes("constipated")) {
    vulnerabilityScore += 2;
  }

  return {
    ibsType,
    recentSymptomTrend,
    recentBowelPattern,
    hydrationStatus,
    sleepStatus,
    relevantPersonalPatterns,
    dataQuality,
    vulnerabilityScore: Math.min(10, vulnerabilityScore),
  };
}

export function summarizeBaselineForAi(baseline: PersonalBaseline): string {
  return [
    `IBS type: ${baseline.ibsType}`,
    `Symptom trend: ${baseline.recentSymptomTrend}`,
    `Bowel pattern: ${baseline.recentBowelPattern}`,
    `Hydration: ${baseline.hydrationStatus}`,
    `Sleep: ${baseline.sleepStatus}`,
    baseline.relevantPersonalPatterns.length
      ? `Notes: ${baseline.relevantPersonalPatterns.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join(". ");
}

function deriveSymptomTrend(scores: number[]): PersonalBaseline["recentSymptomTrend"] {
  if (scores.length < 3) return "Insufficient data";
  const recent = scores.slice(0, Math.ceil(scores.length / 2));
  const older = scores.slice(Math.ceil(scores.length / 2));
  const recentAvg = average(recent);
  const olderAvg = average(older);
  if (recentAvg - olderAvg >= 1.5) return "Worsening";
  if (olderAvg - recentAvg >= 1.5) return "Improving";
  return "Stable";
}

function deriveBowelPattern(types: Array<number | null | undefined>): string {
  const valid = types.filter((value): value is number => typeof value === "number");
  if (!valid.length) return "Insufficient bowel movement data";
  const avg = average(valid);
  if (avg <= 2) return "Tendency toward firmer stools recently";
  if (avg >= 6) return "Tendency toward looser stools recently";
  return "Mostly mid-range Bristol types recently";
}

function deriveHydrationStatus(cups: number[]): string {
  if (!cups.length) return "Hydration data insufficient";
  const avg = average(cups);
  if (avg < 4) return "Recent water intake appears low";
  if (avg >= 6) return "Recent hydration appears adequate";
  return "Recent hydration appears moderate";
}

function deriveSleepStatus(hours: number[]): string {
  if (!hours.length) return "Sleep data insufficient";
  const avg = average(hours);
  if (avg < 6) return "Recent sleep appears short";
  if (avg >= 7) return "Recent sleep appears adequate";
  return "Recent sleep appears moderate";
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
