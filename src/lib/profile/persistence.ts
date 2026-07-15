export type ProfileFormState = {
  full_name: string;
  age: string;
  date_of_birth: string;
  gender: string;
  country: string;
  ibs_type: string;
  diagnosis_year: string;
  height_cm: string;
  weight_kg: string;
  food_allergies: string;
  current_medication: string;
  dietary_preference: string;
  preferred_units: string;
  water_goal: string;
  sleep_goal: string;
  emergency_contact: string;
};

export type ProfileUpsertRow = {
  id: string;
  full_name: string | null;
  age: number | null;
  date_of_birth: string | null;
  gender: string | null;
  country: string | null;
  ibs_type: string | null;
  diagnosis_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  food_allergies: string | null;
  current_medication: string | null;
  dietary_preference: string | null;
  preferred_units: string;
  daily_water_goal: number;
  sleep_goal: number | null;
  emergency_contact: string | null;
};

export type ProfileValidationResult =
  | { ok: true; row: ProfileUpsertRow }
  | { ok: false; error: string };

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseOptionalInteger(
  value: string,
  label: string,
  min: number,
  max: number
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (!value.trim()) {
    return { ok: true, value: null };
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    return { ok: false, error: `${label} must be a whole number.` };
  }

  if (numeric < min || numeric > max) {
    return { ok: false, error: `${label} must be between ${min} and ${max}.` };
  }

  return { ok: true, value: numeric };
}

function parseOptionalDecimal(
  value: string,
  label: string,
  min: number,
  max: number
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (!value.trim()) {
    return { ok: true, value: null };
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return { ok: false, error: `${label} must be a number.` };
  }

  if (numeric < min || numeric > max) {
    return { ok: false, error: `${label} must be between ${min} and ${max}.` };
  }

  return { ok: true, value: numeric };
}

export function mapUsersRowToProfileForm(row: Record<string, unknown>): ProfileFormState {
  const dailyWaterGoalCups = row.daily_water_goal;
  const waterGoalMl =
    typeof dailyWaterGoalCups === "number" && Number.isFinite(dailyWaterGoalCups) && dailyWaterGoalCups > 0
      ? String(Math.round(dailyWaterGoalCups * 250))
      : "2500";

  return {
    full_name: typeof row.full_name === "string" ? row.full_name : "",
    age: row.age === null || row.age === undefined ? "" : String(row.age),
    date_of_birth: typeof row.date_of_birth === "string" ? row.date_of_birth.slice(0, 10) : "",
    gender: typeof row.gender === "string" ? row.gender : "",
    country: typeof row.country === "string" ? row.country : "",
    ibs_type: typeof row.ibs_type === "string" ? row.ibs_type : "",
    diagnosis_year:
      row.diagnosis_year === null || row.diagnosis_year === undefined ? "" : String(row.diagnosis_year),
    height_cm: row.height_cm === null || row.height_cm === undefined ? "" : String(row.height_cm),
    weight_kg: row.weight_kg === null || row.weight_kg === undefined ? "" : String(row.weight_kg),
    food_allergies: typeof row.food_allergies === "string" ? row.food_allergies : "",
    current_medication: typeof row.current_medication === "string" ? row.current_medication : "",
    dietary_preference: typeof row.dietary_preference === "string" ? row.dietary_preference : "",
    preferred_units: typeof row.preferred_units === "string" ? row.preferred_units : "metric",
    water_goal: waterGoalMl,
    sleep_goal: row.sleep_goal === null || row.sleep_goal === undefined ? "7.5" : String(row.sleep_goal),
    emergency_contact: typeof row.emergency_contact === "string" ? row.emergency_contact : "",
  };
}

export function buildProfileUpsertRow(userId: string, form: ProfileFormState): ProfileValidationResult {
  const age = parseOptionalInteger(form.age, "Age", 0, 120);
  if (!age.ok) return age;

  const diagnosisYear = parseOptionalInteger(form.diagnosis_year, "Diagnosis year", 1900, 2100);
  if (!diagnosisYear.ok) return diagnosisYear;

  const heightCm = parseOptionalDecimal(form.height_cm, "Height", 50, 250);
  if (!heightCm.ok) return heightCm;

  const weightKg = parseOptionalDecimal(form.weight_kg, "Weight", 20, 300);
  if (!weightKg.ok) return weightKg;

  const sleepGoal = parseOptionalDecimal(form.sleep_goal, "Sleep goal", 0, 24);
  if (!sleepGoal.ok) return sleepGoal;

  const waterGoalMl = parseOptionalDecimal(form.water_goal, "Water goal", 250, 10000);
  if (!waterGoalMl.ok) return waterGoalMl;

  const resolvedWaterGoalMl = waterGoalMl.value ?? 2500;
  const dailyWaterGoalCups = Math.max(1, Math.round(resolvedWaterGoalMl / 250));

  const preferredUnits = form.preferred_units === "imperial" ? "imperial" : "metric";

  return {
    ok: true,
    row: {
      id: userId,
      full_name: trimOrNull(form.full_name),
      age: age.value,
      date_of_birth: trimOrNull(form.date_of_birth),
      gender: trimOrNull(form.gender),
      country: trimOrNull(form.country),
      ibs_type: trimOrNull(form.ibs_type),
      diagnosis_year: diagnosisYear.value,
      height_cm: heightCm.value,
      weight_kg: weightKg.value,
      food_allergies: trimOrNull(form.food_allergies),
      current_medication: trimOrNull(form.current_medication),
      dietary_preference: trimOrNull(form.dietary_preference),
      preferred_units: preferredUnits,
      daily_water_goal: dailyWaterGoalCups,
      sleep_goal: sleepGoal.value,
      emergency_contact: trimOrNull(form.emergency_contact),
    },
  };
}
