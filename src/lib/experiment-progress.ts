import type { Experiment, ExperimentCheckin } from "@/lib/experiment-engine";

export type ExperimentProgress = {
  currentDay: number;
  daysRemaining: number;
  completedCheckIns: number;
  plannedDays: number;
  progressPercent: number;
  periodEnded: boolean;
};

function parseIsoDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getExperimentProgress(
  experiment: Experiment,
  checkins: ExperimentCheckin[],
  referenceDate = new Date()
): ExperimentProgress {
  const plannedDays = experiment.duration_days;
  const start = parseIsoDate(experiment.start_date);
  const today = parseIsoDate(toIsoDate(referenceDate));
  const elapsedMs = today.getTime() - start.getTime();
  const elapsedDays = Math.max(0, Math.floor(elapsedMs / (24 * 60 * 60 * 1000)));
  const currentDay = Math.min(plannedDays, Math.max(1, elapsedDays + 1));
  const daysRemaining = Math.max(0, plannedDays - currentDay);
  const endDate = new Date(start);
  endDate.setUTCDate(endDate.getUTCDate() + plannedDays - 1);
  const periodEnded = today.getTime() > endDate.getTime();

  return {
    currentDay,
    daysRemaining: periodEnded ? 0 : daysRemaining,
    completedCheckIns: checkins.length,
    plannedDays,
    progressPercent: Math.round((checkins.length / plannedDays) * 100),
    periodEnded,
  };
}
