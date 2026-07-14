import { evaluateExperiment } from "@/lib/experiment-engine";
import { mapExperimentConfidence } from "@/lib/insights/confidence";
import { ASSOCIATION_LIMITATION, createInsight, type MunaInsight, type MunaInsightsInput } from "@/lib/insights/types";

export function generateExperimentInsights(input: MunaInsightsInput): MunaInsight[] {
  const windowDays = input.observationWindowDays ?? 14;
  const experimentData = input.experiment;

  if (!experimentData) {
    return [
      createInsight({
        id: "experiment-none",
        type: "experiment",
        title: "No experiment data",
        summary: "No active or completed experiment was supplied for insight generation.",
        confidence: "unavailable",
        evidenceCount: 0,
        observationWindowDays: windowDays,
        supportingEvidence: [],
        limitations: ["Experiment insights require an experiment record."],
        status: "insufficient_data",
        isActionable: false,
        suggestedNextStep: null,
        generatedAt: input.generatedAt,
      }),
    ];
  }

  const { experiment, checkins } = experimentData;
  const evaluation = evaluateExperiment({ experiment, checkins });

  if (evaluation.evaluationBlocked) {
    return [
      createInsight({
        id: `experiment-blocked-${experiment.id}`,
        type: "experiment",
        title: "Experiment insight blocked",
        summary:
          evaluation.blockReason ??
          "This experiment could not be interpreted safely because urgent symptom language was detected.",
        confidence: "unavailable",
        evidenceCount: checkins.length,
        observationWindowDays: windowDays,
        supportingEvidence: evaluation.observations.slice(0, 3),
        limitations: ["Blocked experiment evaluations remain blocked."],
        status: "blocked",
        isActionable: true,
        suggestedNextStep: "Seek medical advice before continuing the experiment if symptoms are concerning.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  const confidence = mapExperimentConfidence(evaluation.confidence);
  const checkInCount = evaluation.metrics.completedCheckIns;
  const usableCheckIns = evaluation.metrics.usableCheckIns;

  if (!evaluation.dataSufficient || usableCheckIns === 0) {
    return [
      createInsight({
        id: `experiment-insufficient-${experiment.id}`,
        type: "experiment",
        title: `${experiment.target_label} experiment: insufficient check-ins`,
        summary:
          experiment.status === "active"
            ? `Your ${experiment.target_label} experiment is active with ${checkInCount} check-in(s) so far.`
            : `Your ${experiment.target_label} experiment has insufficient check-ins for a reliable observation.`,
        confidence: "unavailable",
        evidenceCount: checkInCount,
        observationWindowDays: windowDays,
        supportingEvidence: evaluation.observations.slice(0, 4),
        limitations: [evaluation.interpretation],
        status: "insufficient_data",
        isActionable: true,
        suggestedNextStep: "Complete more experiment check-ins before changing your plan.",
        generatedAt: input.generatedAt,
      }),
    ];
  }

  const isMixed =
    evaluation.observations.some((line) => /varied|mixed|harder to interpret/i.test(line)) ||
    (evaluation.metrics.averageSymptomSeverity !== null &&
      evaluation.metrics.averageBloatingSeverity !== null &&
      Math.abs(evaluation.metrics.averageSymptomSeverity - evaluation.metrics.averageBloatingSeverity) >= 2);

  const title =
    experiment.status === "active"
      ? `${experiment.target_label} experiment in progress`
      : `${experiment.target_label} experiment completed`;

  return [
    createInsight({
      id: `experiment-${experiment.id}`,
      type: "experiment",
      title,
      summary: isMixed
        ? `${title}. Your ${checkInCount} logged check-in(s) show mixed observations and do not establish causation.`
        : `${title}. Your logs include ${checkInCount} check-in(s) with ${usableCheckIns} usable observation(s). No causation is established.`,
      confidence,
      evidenceCount: checkInCount,
      observationWindowDays: windowDays,
      supportingEvidence: evaluation.observations.slice(0, 5),
      limitations: [
        ASSOCIATION_LIMITATION,
        evaluation.interpretation,
        "Experiment confidence is never upgraded beyond the deterministic engine result.",
      ],
      status: "active",
      isActionable: experiment.status === "active",
      suggestedNextStep:
        experiment.status === "active"
          ? "Continue daily check-ins before deciding whether to change your experiment."
          : "Review your check-ins and discuss meaningful next steps with a qualified clinician if needed.",
      generatedAt: input.generatedAt,
    }),
  ];
}
