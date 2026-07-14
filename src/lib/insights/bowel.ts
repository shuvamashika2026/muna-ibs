import { trendConfidence } from "@/lib/insights/confidence";
import {
  ASSOCIATION_LIMITATION,
  averageNumbers,
  createInsight,
  filterRowsWithinWindow,
  getDateFromRow,
  numberFrom,
  textFrom,
  type MunaInsight,
  type MunaInsightsInput,
} from "@/lib/insights/types";

const MIN_BOWEL_RECORDS = 3;
const RED_FLAG_PATTERN =
  /\b(blood in stool|bloody stool|black stool|rectal bleeding|severe pain|fever|fainting|passed out)\b/i;

export function generateBowelInsights(input: MunaInsightsInput): MunaInsight[] {
  const windowDays = input.observationWindowDays ?? 14;
  const bowel = filterRowsWithinWindow(input.bowel, input.generatedAt, windowDays);

  const entries = bowel
    .map((row) => ({
      date: getDateFromRow(row),
      bristol: numberFrom(row, ["bristol_type", "type"]),
      urgency: textFrom(row, ["urgency", "urgency_level", "notes"]),
      notes: textFrom(row, ["notes"]),
    }))
    .filter((entry) => entry.date && entry.bristol !== null) as Array<{
    date: string;
    bristol: number;
    urgency: string | null;
    notes: string | null;
  }>;

  const redFlagText = bowel
    .map((row) => textFrom(row, ["notes", "description"]))
    .filter(Boolean)
    .join(" ");
  if (RED_FLAG_PATTERN.test(redFlagText)) {
    return [
      createInsight({
        id: "bowel-blocked-red-flag",
        type: "bowel",
        title: "Bowel insight blocked for safety review",
        summary:
          "A bowel log contains language that may need medical review. MUNA is not generating a routine bowel trend insight for this entry.",
        confidence: "unavailable",
        evidenceCount: entries.length,
        observationWindowDays: windowDays,
        supportingEvidence: [],
        limitations: ["Red-flag wording is not interpreted as a normal bowel pattern insight."],
        status: "blocked",
        isActionable: true,
        suggestedNextStep: "Seek prompt medical advice if you are concerned about bleeding, severe pain or sudden change.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  if (entries.length < MIN_BOWEL_RECORDS) {
    return [
      createInsight({
        id: "bowel-insufficient-data",
        type: "bowel",
        title: "Insufficient bowel data",
        summary: `Only ${entries.length} bowel record(s) are available, which is not enough for a trend observation.`,
        confidence: "unavailable",
        evidenceCount: entries.length,
        observationWindowDays: windowDays,
        supportingEvidence: [`Bowel records: ${entries.length}`],
        limitations: ["At least 3 bowel records are needed for trend language."],
        status: "insufficient_data",
        isActionable: true,
        suggestedNextStep: "Log bowel movements over several days to describe patterns more reliably.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  const bristolValues = entries.map((entry) => Math.round(entry.bristol));
  const looseCount = bristolValues.filter((value) => value >= 6).length;
  const hardCount = bristolValues.filter((value) => value <= 2).length;
  const stableCount = bristolValues.filter((value) => value >= 3 && value <= 4).length;
  const typeFiveCount = bristolValues.filter((value) => value === 5).length;
  const urgencyCount = entries.filter((entry) =>
    /\burgent|urgency|rush|immediately\b/i.test(`${entry.urgency ?? ""} ${entry.notes ?? ""}`)
  ).length;

  const confidence = trendConfidence({
    observationCount: entries.length,
    minimumRequired: MIN_BOWEL_RECORDS,
    consistentDirection: looseCount >= 2 || hardCount >= 2 || stableCount >= 2,
  });

  if (looseCount >= 2 && looseCount > hardCount) {
    return [
      createInsight({
        id: "bowel-looser-trend",
        type: "bowel",
        title: "Trend toward looser stool",
        summary: `${looseCount} of ${entries.length} logged bowel records were Bristol type 6–7. A single softer stool is not called diarrhoea here.`,
        confidence,
        evidenceCount: entries.length,
        observationWindowDays: windowDays,
        supportingEvidence: [
          `Bowel records: ${entries.length}`,
          `Bristol 6–7 records: ${looseCount}`,
        ],
        limitations: [ASSOCIATION_LIMITATION, "This is not a diagnosis."],
        status: "active",
        isActionable: true,
        suggestedNextStep: "Keep logging bowel type alongside meals, stress and hydration for context.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  if (hardCount >= 2 && hardCount > looseCount) {
    return [
      createInsight({
        id: "bowel-harder-trend",
        type: "bowel",
        title: "Trend toward harder stool",
        summary: `${hardCount} of ${entries.length} logged bowel records were Bristol type 1–2.`,
        confidence,
        evidenceCount: entries.length,
        observationWindowDays: windowDays,
        supportingEvidence: [
          `Bowel records: ${entries.length}`,
          `Bristol 1–2 records: ${hardCount}`,
        ],
        limitations: [ASSOCIATION_LIMITATION, "This is not a diagnosis."],
        status: "active",
        isActionable: true,
        suggestedNextStep: "Track hydration, movement and bowel logs together over the next few days.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  if (stableCount >= 2 && stableCount >= typeFiveCount) {
    return [
      createInsight({
        id: "bowel-stable-types-3-4",
        type: "bowel",
        title: "Bowel pattern moving toward types 3–4",
        summary: `${stableCount} of ${entries.length} logged bowel records were Bristol type 3–4.`,
        confidence,
        evidenceCount: entries.length,
        observationWindowDays: windowDays,
        supportingEvidence: [
          `Bowel records: ${entries.length}`,
          `Bristol 3–4 records: ${stableCount}`,
        ],
        limitations: [ASSOCIATION_LIMITATION],
        status: "active",
        isActionable: false,
        suggestedNextStep: null,
        generatedAt: input.generatedAt,
      }),
    ];
  }

  if (urgencyCount >= 2) {
    return [
      createInsight({
        id: "bowel-urgency",
        type: "bowel",
        title: "Increased urgency noted in logs",
        summary: `Urgency was noted in ${urgencyCount} of ${entries.length} bowel records in this window.`,
        confidence: "limited",
        evidenceCount: entries.length,
        observationWindowDays: windowDays,
        supportingEvidence: [`Urgency mentions: ${urgencyCount}`],
        limitations: [ASSOCIATION_LIMITATION],
        status: "active",
        isActionable: true,
        suggestedNextStep: "Continue logging urgency alongside stress and meal timing for personal context.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  const average = averageNumbers(bristolValues);
  return [
    createInsight({
      id: "bowel-stable-pattern",
      type: "bowel",
      title: "Stable bowel pattern",
      summary: `Your logged Bristol types vary across ${entries.length} records with an average of ${average?.toFixed(1) ?? "unknown"}. One Bristol type 5 record alone is not treated as a diarrhoea trend.`,
      confidence: "limited",
      evidenceCount: entries.length,
      observationWindowDays: windowDays,
      supportingEvidence: [
        `Bowel records: ${entries.length}`,
        `Bristol type 5 records: ${typeFiveCount}`,
      ],
      limitations: [ASSOCIATION_LIMITATION, "Single abnormal records do not create a trend."],
      status: "active",
      isActionable: false,
      suggestedNextStep: null,
      generatedAt: input.generatedAt,
    }),
  ];
}
