export type ExperimentTargetType = "food_reduction" | "food_reintroduction" | "habit";

export type ExperimentStatus = "draft" | "active" | "completed" | "stopped";

export type ExperimentConfidence = "Limited" | "Moderate" | "Higher";

export type Experiment = {
  id: string;
  user_id: string;
  target_label: string;
  target_type: ExperimentTargetType;
  hypothesis?: string | null;
  start_date: string;
  duration_days: 3 | 5 | 7;
  status: ExperimentStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ExperimentCheckin = {
  id?: string;
  experiment_id: string;
  user_id: string;
  checkin_date: string;
  adhered?: boolean | null;
  symptom_severity?: number | null;
  bloating_severity?: number | null;
  stress_level?: number | null;
  notes?: string | null;
  created_at?: string;
};

export type VerifiedBaselineData = {
  checkins: ExperimentCheckin[];
  verified: true;
};

export type ExperimentMetrics = {
  plannedDays: number;
  completedCheckIns: number;
  usableCheckIns: number;
  adherenceDays: number;
  adherenceRate: number | null;
  averageSymptomSeverity: number | null;
  averageBloatingSeverity: number | null;
  averageStressLevel: number | null;
  missingCheckInCount: number;
  missingSymptomSeverityCount: number;
  missingBloatingSeverityCount: number;
  missingStressLevelCount: number;
  missingAdherenceCount: number;
};

export type ExperimentEvaluation = {
  evaluationBlocked: boolean;
  medicalReviewRecommended: boolean;
  dataSufficient: boolean;
  confidence: ExperimentConfidence | null;
  metrics: ExperimentMetrics;
  observations: string[];
  interpretation: string;
  blockReason?: string;
};

const SAFE_INTERPRETATION =
  "The available observations are limited and do not establish that the tested item caused or reduced symptoms.";

const RED_FLAG_PATTERN =
  /\b(blood in stool|bloody stool|black stool|severe pain|fever|persistent vomiting|unexplained weight loss|weight loss|dehydration|fainting|passed out)\b/i;

type NumericField = "symptom_severity" | "bloating_severity" | "stress_level";

function isFiniteSeverity(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundAverage(values: number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
}

function averageField(checkins: ExperimentCheckin[], field: NumericField): number | null {
  const values = checkins.map((row) => row[field]).filter(isFiniteSeverity);
  if (!values.length) return null;
  return roundAverage(values);
}

function countMissingField(checkins: ExperimentCheckin[], field: NumericField): number {
  return checkins.filter((row) => !isFiniteSeverity(row[field])).length;
}

export function containsExperimentRedFlags(...texts: Array<string | null | undefined>): boolean {
  return texts.some((text) => typeof text === "string" && RED_FLAG_PATTERN.test(text));
}

export function isUsableCheckin(checkin: ExperimentCheckin): boolean {
  return (
    isFiniteSeverity(checkin.symptom_severity) ||
    isFiniteSeverity(checkin.bloating_severity) ||
    isFiniteSeverity(checkin.stress_level) ||
    checkin.adhered !== null && checkin.adhered !== undefined
  );
}

function computeConfidence(usableCheckIns: number): ExperimentConfidence | null {
  if (usableCheckIns <= 0) return null;
  if (usableCheckIns < 3) return "Limited";
  if (usableCheckIns <= 5) return "Moderate";
  return "Higher";
}

function buildStressVariabilityObservation(checkins: ExperimentCheckin[]): string | null {
  const stressValues = checkins.map((row) => row.stress_level).filter(isFiniteSeverity);
  if (stressValues.length < 2) return null;

  const min = Math.min(...stressValues);
  const max = Math.max(...stressValues);
  if (max - min >= 3) {
    return "Stress varied considerably, which may make the result harder to interpret.";
  }

  return null;
}

function buildMissingValueObservations(metrics: ExperimentMetrics): string[] {
  const notes: string[] = [];

  if (metrics.missingCheckInCount > 0) {
    notes.push(`${metrics.missingCheckInCount} planned check-in day(s) have no recorded entry.`);
  }

  if (metrics.completedCheckIns > 0 && metrics.missingSymptomSeverityCount > 0) {
    notes.push(
      `Symptom severity was not logged on ${metrics.missingSymptomSeverityCount} check-in(s).`
    );
  }

  if (metrics.completedCheckIns > 0 && metrics.missingBloatingSeverityCount > 0) {
    notes.push(
      `Bloating severity was not logged on ${metrics.missingBloatingSeverityCount} check-in(s).`
    );
  }

  if (metrics.completedCheckIns > 0 && metrics.missingStressLevelCount > 0) {
    notes.push(`Stress level was not logged on ${metrics.missingStressLevelCount} check-in(s).`);
  }

  if (metrics.completedCheckIns > 0 && metrics.missingAdherenceCount > 0) {
    notes.push(`Adherence was not recorded on ${metrics.missingAdherenceCount} check-in(s).`);
  }

  return notes;
}

function computeMetrics(experiment: Experiment, checkins: ExperimentCheckin[]): ExperimentMetrics {
  const plannedDays = experiment.duration_days;
  const completedCheckIns = checkins.length;
  const usableCheckIns = checkins.filter(isUsableCheckin).length;
  const adherenceDays = checkins.filter((row) => row.adhered === true).length;
  const adherenceAnswered = checkins.filter((row) => row.adhered !== null && row.adhered !== undefined);
  const adherenceRate =
    adherenceAnswered.length > 0 ? Math.round((adherenceDays / adherenceAnswered.length) * 100) / 100 : null;

  return {
    plannedDays,
    completedCheckIns,
    usableCheckIns,
    adherenceDays,
    adherenceRate,
    averageSymptomSeverity: averageField(checkins, "symptom_severity"),
    averageBloatingSeverity: averageField(checkins, "bloating_severity"),
    averageStressLevel: averageField(checkins, "stress_level"),
    missingCheckInCount: Math.max(0, plannedDays - completedCheckIns),
    missingSymptomSeverityCount: countMissingField(checkins, "symptom_severity"),
    missingBloatingSeverityCount: countMissingField(checkins, "bloating_severity"),
    missingStressLevelCount: countMissingField(checkins, "stress_level"),
    missingAdherenceCount: checkins.filter((row) => row.adhered === null || row.adhered === undefined).length,
  };
}

function buildBlockedEvaluation(reason: string): ExperimentEvaluation {
  return {
    evaluationBlocked: true,
    medicalReviewRecommended: true,
    dataSufficient: false,
    confidence: null,
    metrics: {
      plannedDays: 0,
      completedCheckIns: 0,
      usableCheckIns: 0,
      adherenceDays: 0,
      adherenceRate: null,
      averageSymptomSeverity: null,
      averageBloatingSeverity: null,
      averageStressLevel: null,
      missingCheckInCount: 0,
      missingSymptomSeverityCount: 0,
      missingBloatingSeverityCount: 0,
      missingStressLevelCount: 0,
      missingAdherenceCount: 0,
    },
    observations: [],
    interpretation: SAFE_INTERPRETATION,
    blockReason: reason,
  };
}

function buildInsufficientEvaluation(experiment: Experiment): ExperimentEvaluation {
  const metrics = computeMetrics(experiment, []);

  return {
    evaluationBlocked: false,
    medicalReviewRecommended: false,
    dataSufficient: false,
    confidence: null,
    metrics,
    observations: ["No check-ins were recorded for this experiment yet."],
    interpretation: SAFE_INTERPRETATION,
  };
}

export type EvaluateExperimentInput = {
  experiment: Experiment;
  checkins: ExperimentCheckin[];
  baseline?: VerifiedBaselineData;
};

export function evaluateExperiment({
  experiment,
  checkins,
  baseline,
}: EvaluateExperimentInput): ExperimentEvaluation {
  const redFlagTexts = [
    experiment.notes,
    experiment.hypothesis,
    ...checkins.map((row) => row.notes),
  ];

  if (containsExperimentRedFlags(...redFlagTexts)) {
    return buildBlockedEvaluation(
      "Urgent symptom language was detected in experiment notes. Medical review is recommended before continuing interpretation."
    );
  }

  if (checkins.length === 0) {
    return buildInsufficientEvaluation(experiment);
  }

  const metrics = computeMetrics(experiment, checkins);
  const confidence = computeConfidence(metrics.usableCheckIns);
  const dataSufficient = metrics.usableCheckIns > 0;

  const observations: string[] = [
    `You completed ${metrics.completedCheckIns} of ${metrics.plannedDays} check-ins.`,
  ];

  if (metrics.adherenceRate !== null) {
    observations.push(
      `You reported adhering on ${metrics.adherenceDays} of ${metrics.completedCheckIns - metrics.missingAdherenceCount} logged day(s) with adherence recorded.`
    );
  }

  if (metrics.averageSymptomSeverity !== null) {
    observations.push(
      `Average symptom severity during the experiment was ${metrics.averageSymptomSeverity} out of 10.`
    );
  }

  if (metrics.averageBloatingSeverity !== null) {
    observations.push(
      `Average bloating during the experiment was ${metrics.averageBloatingSeverity} out of 10.`
    );
  }

  if (metrics.averageStressLevel !== null) {
    observations.push(
      `Average stress level during the experiment was ${metrics.averageStressLevel} out of 10.`
    );
  }

  const stressObservation = buildStressVariabilityObservation(checkins);
  if (stressObservation) observations.push(stressObservation);

  observations.push(...buildMissingValueObservations(metrics));

  if (baseline?.verified && baseline.checkins.length > 0) {
    const baselineMetrics = computeMetrics(experiment, baseline.checkins);
    if (baselineMetrics.averageSymptomSeverity !== null && metrics.averageSymptomSeverity !== null) {
      observations.push(
        `Verified baseline average symptom severity was ${baselineMetrics.averageSymptomSeverity} out of 10 compared with ${metrics.averageSymptomSeverity} during the experiment. This is a descriptive comparison only.`
      );
    }
  }

  let interpretation = SAFE_INTERPRETATION;
  if (confidence === "Higher") {
    interpretation = `${SAFE_INTERPRETATION} Higher confidence here reflects more logged check-ins, not clinical certainty.`;
  } else if (confidence === "Moderate") {
    interpretation = `${SAFE_INTERPRETATION} Moderate confidence reflects a growing but still limited number of check-ins.`;
  }

  return {
    evaluationBlocked: false,
    medicalReviewRecommended: false,
    dataSufficient,
    confidence,
    metrics,
    observations,
    interpretation,
  };
}

type SelfTestCase = {
  name: string;
  run: () => boolean;
};

const sampleExperiment: Experiment = {
  id: "exp-1",
  user_id: "user-1",
  target_label: "onion",
  target_type: "food_reduction",
  start_date: "2026-07-01",
  duration_days: 5,
  status: "active",
};

export function runExperimentEngineSelfTest(): {
  passed: number;
  failed: number;
  errors: string[];
} {
  const cases: SelfTestCase[] = [
    {
      name: "detects red-flag language",
      run: () => containsExperimentRedFlags("I noticed blood in stool today"),
    },
    {
      name: "ignores non-red-flag symptom notes",
      run: () => !containsExperimentRedFlags("mild bloating after lunch"),
    },
    {
      name: "never evaluates from zero check-ins",
      run: () => {
        const result = evaluateExperiment({ experiment: sampleExperiment, checkins: [] });
        return !result.dataSufficient && result.confidence === null && result.metrics.completedCheckIns === 0;
      },
    },
    {
      name: "blocks evaluation when red flag is present",
      run: () => {
        const result = evaluateExperiment({
          experiment: sampleExperiment,
          checkins: [{ experiment_id: "exp-1", user_id: "user-1", checkin_date: "2026-07-01", notes: "severe pain and fever" }],
        });
        return result.evaluationBlocked && result.medicalReviewRecommended;
      },
    },
    {
      name: "does not treat missing severity as zero",
      run: () => {
        const result = evaluateExperiment({
          experiment: sampleExperiment,
          checkins: [
            { experiment_id: "exp-1", user_id: "user-1", checkin_date: "2026-07-01", bloating_severity: 6, adhered: true },
            { experiment_id: "exp-1", user_id: "user-1", checkin_date: "2026-07-02", adhered: true },
          ],
        });
        return result.metrics.averageSymptomSeverity === null && result.metrics.averageBloatingSeverity === 6;
      },
    },
    {
      name: "assigns Limited confidence below three usable check-ins",
      run: () => {
        const checkins = [1, 2].map((day) => ({
          experiment_id: "exp-1",
          user_id: "user-1",
          checkin_date: `2026-07-0${day}`,
          symptom_severity: 4,
          adhered: true,
        }));
        return evaluateExperiment({ experiment: sampleExperiment, checkins }).confidence === "Limited";
      },
    },
    {
      name: "assigns Moderate confidence for three to five usable check-ins",
      run: () => {
        const checkins = [1, 2, 3, 4].map((day) => ({
          experiment_id: "exp-1",
          user_id: "user-1",
          checkin_date: `2026-07-0${day}`,
          symptom_severity: 5,
          adhered: true,
        }));
        return evaluateExperiment({ experiment: sampleExperiment, checkins }).confidence === "Moderate";
      },
    },
    {
      name: "assigns Higher confidence for six or more usable check-ins",
      run: () => {
        const experiment: Experiment = { ...sampleExperiment, duration_days: 7 };
        const checkins = [1, 2, 3, 4, 5, 6].map((day) => ({
          experiment_id: "exp-1",
          user_id: "user-1",
          checkin_date: `2026-07-0${day}`,
          symptom_severity: 4,
          adhered: true,
        }));
        const result = evaluateExperiment({ experiment, checkins });
        return result.confidence === "Higher" && result.interpretation.includes("not clinical certainty");
      },
    },
    {
      name: "reports completed check-ins observation",
      run: () => {
        const result = evaluateExperiment({
          experiment: sampleExperiment,
          checkins: [
            { experiment_id: "exp-1", user_id: "user-1", checkin_date: "2026-07-01", symptom_severity: 3, adhered: true },
            { experiment_id: "exp-1", user_id: "user-1", checkin_date: "2026-07-02", symptom_severity: 4, adhered: false },
            { experiment_id: "exp-1", user_id: "user-1", checkin_date: "2026-07-03", symptom_severity: 5, adhered: true },
            { experiment_id: "exp-1", user_id: "user-1", checkin_date: "2026-07-04", symptom_severity: 4, adhered: true },
          ],
        });
        return result.observations.some((line) => line === "You completed 4 of 5 check-ins.");
      },
    },
    {
      name: "includes safe non-causal interpretation",
      run: () => {
        const result = evaluateExperiment({
          experiment: sampleExperiment,
          checkins: [
            { experiment_id: "exp-1", user_id: "user-1", checkin_date: "2026-07-01", bloating_severity: 5, adhered: true },
            { experiment_id: "exp-1", user_id: "user-1", checkin_date: "2026-07-02", bloating_severity: 6, adhered: true },
            { experiment_id: "exp-1", user_id: "user-1", checkin_date: "2026-07-03", bloating_severity: 4, adhered: true },
          ],
        });
        return result.interpretation.includes("do not establish that the tested item caused or reduced symptoms");
      },
    },
    {
      name: "skips baseline comparison unless verified baseline is supplied",
      run: () => {
        const checkins = [1, 2, 3].map((day) => ({
          experiment_id: "exp-1",
          user_id: "user-1",
          checkin_date: `2026-07-0${day}`,
          symptom_severity: 5,
          adhered: true,
        }));
        const withoutBaseline = evaluateExperiment({ experiment: sampleExperiment, checkins });
        const withBaseline = evaluateExperiment({
          experiment: sampleExperiment,
          checkins,
          baseline: {
            verified: true,
            checkins: [
              { experiment_id: "base", user_id: "user-1", checkin_date: "2026-06-28", symptom_severity: 3, adhered: true },
            ],
          },
        });
        return (
          !withoutBaseline.observations.some((line) => line.includes("baseline")) &&
          withBaseline.observations.some((line) => line.includes("Verified baseline"))
        );
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
