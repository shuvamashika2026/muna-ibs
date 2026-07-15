export const SYMPTOM_LEVEL_MIN = 0;
export const SYMPTOM_LEVEL_MAX = 10;

export type SymptomFormValues = {
  painLevel: number;
  bloatingLevel: number;
  gasLevel: number;
  stressLevel: number;
  energyLevel: number;
  mood: string;
  nausea: boolean;
  constipation: boolean;
  diarrhea: boolean;
  notes: string;
};

export type SymptomInsertPayload = {
  symptoms: string;
  severity: number;
  stress_level: number;
  pain_level: number;
  bloating_level: number;
  gas_level: number;
  energy_level: number;
  mood: string;
  logged_at: string;
  notes: string | null;
};

export type SymptomValidationResult =
  | { ok: true; payload: SymptomInsertPayload }
  | { ok: false; error: string };

function isValidLevel(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= SYMPTOM_LEVEL_MIN &&
    value <= SYMPTOM_LEVEL_MAX
  );
}

export function validateSymptomLevel(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === "") {
    return `${label} is required.`;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    return `${label} must be a whole number.`;
  }

  if (numeric < SYMPTOM_LEVEL_MIN || numeric > SYMPTOM_LEVEL_MAX) {
    return `${label} must be between ${SYMPTOM_LEVEL_MIN} and ${SYMPTOM_LEVEL_MAX}.`;
  }

  return null;
}

export function computeSymptomSeverity(
  painLevel: number,
  bloatingLevel: number,
  gasLevel: number
): number | null {
  if (!isValidLevel(painLevel) || !isValidLevel(bloatingLevel) || !isValidLevel(gasLevel)) {
    return null;
  }

  return Math.max(painLevel, bloatingLevel, gasLevel);
}

export function buildSymptomInsertPayload(values: SymptomFormValues): SymptomValidationResult {
  const levelChecks = [
    validateSymptomLevel(values.painLevel, "Pain level"),
    validateSymptomLevel(values.bloatingLevel, "Bloating level"),
    validateSymptomLevel(values.gasLevel, "Gas level"),
    validateSymptomLevel(values.stressLevel, "Stress level"),
    validateSymptomLevel(values.energyLevel, "Energy level"),
  ].filter((message): message is string => Boolean(message));

  if (levelChecks.length) {
    return { ok: false, error: levelChecks[0] };
  }

  const severity = computeSymptomSeverity(values.painLevel, values.bloatingLevel, values.gasLevel);
  if (severity === null) {
    return { ok: false, error: "Severity could not be calculated from symptom levels." };
  }

  const trimmedNotes = values.notes.trim();
  const mood = values.mood.trim() || "Okay";

  return {
    ok: true,
    payload: {
      symptoms: [
        `Pain ${values.painLevel}/10`,
        `Bloating ${values.bloatingLevel}/10`,
        `Gas ${values.gasLevel}/10`,
        values.nausea && "nausea",
        values.constipation && "constipation",
        values.diarrhea && "diarrhea",
      ]
        .filter(Boolean)
        .join(", "),
      severity,
      stress_level: values.stressLevel,
      pain_level: values.painLevel,
      bloating_level: values.bloatingLevel,
      gas_level: values.gasLevel,
      energy_level: values.energyLevel,
      mood,
      logged_at: new Date().toISOString(),
      notes: trimmedNotes.length ? trimmedNotes : null,
    },
  };
}

export function shouldBlockDuplicateSave(isSaving: boolean): boolean {
  return isSaving;
}
