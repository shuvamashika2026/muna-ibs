import { pairedObservationConfidence } from "@/lib/insights/confidence";
import {
  ASSOCIATION_LIMITATION,
  createInsight,
  filterRowsWithinWindow,
  getDateFromRow,
  isSymptomHeavy,
  numberFrom,
  type MunaInsight,
  type MunaInsightsInput,
} from "@/lib/insights/types";

const MIN_STRESS_PAIRS = 4;

export function generateStressInsights(input: MunaInsightsInput): MunaInsight[] {
  const windowDays = input.observationWindowDays ?? 14;
  const symptoms = filterRowsWithinWindow(input.symptoms, input.generatedAt, windowDays);

  const paired = symptoms
    .map((row) => ({
      date: getDateFromRow(row),
      stress: numberFrom(row, ["stress_level", "stress"]),
      heavySymptoms: isSymptomHeavy(row),
    }))
    .filter((entry): entry is { date: string; stress: number; heavySymptoms: boolean } =>
      Boolean(entry.date && entry.stress !== null)
    );

  if (paired.length < MIN_STRESS_PAIRS) {
    return [
      createInsight({
        id: "stress-insufficient-data",
        type: "stress",
        title: "Insufficient stress data",
        summary:
          paired.length === 0
            ? "No paired stress and symptom records were found in this window."
            : `Only ${paired.length} paired stress and symptom record(s) are available, which is not enough for a stress pattern.`,
        confidence: "unavailable",
        evidenceCount: paired.length,
        observationWindowDays: windowDays,
        supportingEvidence: [`Paired stress/symptom records: ${paired.length}`],
        limitations: ["Stress insights are not created from invented or missing data."],
        status: "insufficient_data",
        isActionable: true,
        suggestedNextStep: "Log stress alongside symptoms on the same days to explore gut–brain patterns.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  const highStressHeavySymptoms = paired.filter((entry) => entry.stress >= 6 && entry.heavySymptoms).length;
  const lowStressCalmerDays = paired.filter((entry) => entry.stress <= 4 && !entry.heavySymptoms).length;
  const confidence = pairedObservationConfidence({
    pairedCount: paired.length,
    consistentCount: highStressHeavySymptoms,
    minimumRequired: MIN_STRESS_PAIRS,
  });

  if (highStressHeavySymptoms >= 2 && highStressHeavySymptoms >= lowStressCalmerDays) {
    return [
      createInsight({
        id: "stress-symptom-association",
        type: "stress",
        title: "Higher stress coinciding with higher symptoms",
        summary: `On ${highStressHeavySymptoms} of ${paired.length} paired records, higher stress coincided with higher symptom levels. The gut–brain connection can work both ways, and this remains an association only.`,
        confidence,
        evidenceCount: paired.length,
        observationWindowDays: windowDays,
        supportingEvidence: [
          `Paired stress/symptom records: ${paired.length}`,
          `Higher stress with higher symptoms: ${highStressHeavySymptoms}`,
        ],
        limitations: [
          ASSOCIATION_LIMITATION,
          "Symptoms are real experiences and are not described as imaginary or purely psychological.",
        ],
        status: "active",
        isActionable: true,
        suggestedNextStep: "Notice whether calming days also align with gentler symptom days in your logs.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  if (highStressHeavySymptoms >= 1 && lowStressCalmerDays >= 1) {
    return [
      createInsight({
        id: "stress-mixed-relationship",
        type: "stress",
        title: "Mixed stress–symptom relationship",
        summary: `Your logs show a mixed relationship between stress and symptoms across ${paired.length} paired records.`,
        confidence: "limited",
        evidenceCount: paired.length,
        observationWindowDays: windowDays,
        supportingEvidence: [
          `Higher stress with higher symptoms: ${highStressHeavySymptoms}`,
          `Lower stress without elevated symptoms: ${lowStressCalmerDays}`,
        ],
        limitations: [ASSOCIATION_LIMITATION],
        status: "active",
        isActionable: true,
        suggestedNextStep: "Keep logging stress and symptoms together to see whether a clearer pattern emerges.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  return [
    createInsight({
      id: "stress-no-consistent-relationship",
      type: "stress",
      title: "No consistent stress–symptom relationship",
      summary: `Across ${paired.length} paired records, your logs do not show a consistent relationship between stress and higher symptoms in this window.`,
      confidence: confidence === "unavailable" ? "limited" : confidence,
      evidenceCount: paired.length,
      observationWindowDays: windowDays,
      supportingEvidence: [`Paired stress/symptom records: ${paired.length}`],
      limitations: [ASSOCIATION_LIMITATION],
      status: "active",
      isActionable: false,
      suggestedNextStep: null,
      generatedAt: input.generatedAt,
    }),
  ];
}
