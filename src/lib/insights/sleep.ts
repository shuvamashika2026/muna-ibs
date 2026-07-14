import { pairedObservationConfidence, trendConfidence } from "@/lib/insights/confidence";
import {
  ASSOCIATION_LIMITATION,
  addDaysToDate,
  averageNumbers,
  createInsight,
  filterRowsWithinWindow,
  getDateFromRow,
  isSymptomHeavy,
  numberFrom,
  type MunaInsight,
  type MunaInsightsInput,
} from "@/lib/insights/types";

const MIN_SLEEP_NIGHTS = 4;

export function generateSleepInsights(input: MunaInsightsInput): MunaInsight[] {
  const windowDays = input.observationWindowDays ?? 14;
  const sleep = filterRowsWithinWindow(input.sleep, input.generatedAt, windowDays);
  const symptoms = filterRowsWithinWindow(input.symptoms, input.generatedAt, windowDays);

  const sleepEntries = sleep
    .map((row) => ({
      date: getDateFromRow(row),
      hours: numberFrom(row, ["hours", "sleep_hours"]),
      quality: numberFrom(row, ["quality", "sleep_quality"]),
    }))
    .filter((entry) => entry.date && entry.hours !== null) as Array<{
    date: string;
    hours: number;
    quality: number | null;
  }>;

  if (sleepEntries.length < MIN_SLEEP_NIGHTS) {
    return [
      createInsight({
        id: "sleep-insufficient-data",
        type: "sleep",
        title: "Insufficient sleep data",
        summary: `Only ${sleepEntries.length} logged night(s) are available, which is not enough for sleep trend analysis.`,
        confidence: "unavailable",
        evidenceCount: sleepEntries.length,
        observationWindowDays: windowDays,
        supportingEvidence: [`Logged nights: ${sleepEntries.length}`],
        limitations: ["At least 4 logged nights are needed for trend language."],
        status: "insufficient_data",
        isActionable: true,
        suggestedNextStep: "Log sleep on more nights to help MUNA describe any patterns.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  const insights: MunaInsight[] = [];
  const chronological = [...sleepEntries].sort((a, b) => a.date.localeCompare(b.date));
  const midpoint = Math.ceil(chronological.length / 2);
  const earlierHours = averageNumbers(chronological.slice(0, midpoint).map((entry) => entry.hours));
  const recentHours = averageNumbers(chronological.slice(midpoint).map((entry) => entry.hours));

  let trendTitle = "Stable sleep hours";
  let trendSummary = `Sleep hours have stayed relatively stable across ${sleepEntries.length} logged nights.`;
  let consistentDirection = false;

  if (earlierHours !== null && recentHours !== null) {
    if (recentHours - earlierHours >= 0.75) {
      trendTitle = "Sleep hours improving";
      trendSummary = `Recent logged sleep averages ${recentHours.toFixed(1)} hours compared with ${earlierHours.toFixed(1)} hours earlier in the window.`;
      consistentDirection = true;
    } else if (earlierHours - recentHours >= 0.75) {
      trendTitle = "Sleep hours shortening";
      trendSummary = `Recent logged sleep averages ${recentHours.toFixed(1)} hours compared with ${earlierHours.toFixed(1)} hours earlier in the window.`;
      consistentDirection = true;
    }
  }

  const trendConf = trendConfidence({
    observationCount: sleepEntries.length,
    minimumRequired: MIN_SLEEP_NIGHTS,
    consistentDirection,
  });

  insights.push(
    createInsight({
      id: "sleep-trend",
      type: "sleep",
      title: trendTitle,
      summary: trendSummary,
      confidence: trendConf,
      evidenceCount: sleepEntries.length,
      observationWindowDays: windowDays,
      supportingEvidence: [`Logged nights: ${sleepEntries.length}`],
      limitations: [
        "Sleep hours and sleep quality are kept separate; quality is not inferred from hours alone.",
        ASSOCIATION_LIMITATION,
      ],
      status: "active",
      isActionable: false,
      suggestedNextStep: null,
      generatedAt: input.generatedAt,
    })
  );

  const paired: Array<{ shortSleep: boolean; heavySymptoms: boolean }> = [];
  for (const entry of sleepEntries) {
    const sameDaySymptoms = symptoms.filter((row) => getDateFromRow(row) === entry.date);
    const nextDay = addDaysToDate(entry.date, 1);
    const nextDaySymptoms = nextDay ? symptoms.filter((row) => getDateFromRow(row) === nextDay) : [];
    const heavySameDay = sameDaySymptoms.some(isSymptomHeavy);
    const heavyNextDay = nextDaySymptoms.some(isSymptomHeavy);
    paired.push({ shortSleep: entry.hours < 7, heavySymptoms: heavySameDay || heavyNextDay });
  }

  const pairedCount = paired.length;
  const consistentCount = paired.filter((row) => row.shortSleep && row.heavySymptoms).length;
  const associationConfidence = pairedObservationConfidence({
    pairedCount,
    consistentCount,
    minimumRequired: MIN_SLEEP_NIGHTS,
  });

  if (associationConfidence !== "unavailable" && consistentCount >= 2) {
    insights.push(
      createInsight({
        id: "sleep-symptom-association",
        type: "sleep",
        title: "Shorter sleep coinciding with higher symptoms",
        summary: `On ${consistentCount} of ${pairedCount} paired sleep and symptom records, shorter sleep (< 7 hours) coincided with higher symptom levels. This is an association only.`,
        confidence: associationConfidence,
        evidenceCount: pairedCount,
        observationWindowDays: windowDays,
        supportingEvidence: [
          `Paired sleep/symptom records: ${pairedCount}`,
          `Shorter sleep with higher symptoms: ${consistentCount}`,
        ],
        limitations: [
          ASSOCIATION_LIMITATION,
          "Stress, meals and hydration may also be involved on the same days.",
        ],
        status: "active",
        isActionable: true,
        suggestedNextStep: "Notice whether better-sleep nights also align with calmer symptom days in your logs.",
        generatedAt: input.generatedAt,
      })
    );
  }

  return insights;
}
