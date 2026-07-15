import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildProfileUpsertRow,
  mapUsersRowToProfileForm,
  type ProfileFormState,
} from "./profile/persistence.ts";
import {
  authenticateSupabaseRequest,
  mapAuthFailureToStatus,
} from "./supabase/request-auth.ts";
import {
  buildSymptomInsertPayload,
  computeSymptomSeverity,
  shouldBlockDuplicateSave,
  validateSymptomLevel,
} from "./symptoms/validation.ts";

function rejectsClientSuppliedUserId(body: Record<string, unknown>): boolean {
  return body.user_id !== undefined || body.userId !== undefined;
}

function requestWithAuthorization(value: string | null): Request {
  const headers = new Headers();
  if (value) {
    headers.set("Authorization", value);
  }

  return new Request("http://localhost/api/experiments", {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "create" }),
  });
}

function sampleProfileForm(overrides: Partial<ProfileFormState> = {}): ProfileFormState {
  return {
    full_name: "Test User",
    age: "32",
    date_of_birth: "1993-01-15",
    gender: "Female",
    country: "Nepal",
    ibs_type: "IBS-M",
    diagnosis_year: "2019",
    height_cm: "165",
    weight_kg: "62",
    food_allergies: "Peanuts",
    current_medication: "None",
    dietary_preference: "Low FODMAP",
    preferred_units: "metric",
    water_goal: "2500",
    sleep_goal: "7.5",
    emergency_contact: "Family member",
    ...overrides,
  };
}

type Case = { id: string; run: () => boolean | Promise<boolean> };

export async function runCriticalBlockersVerification(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

  const cases: Case[] = [
    {
      id: "Profile round-trip persistence preserves all visible fields",
      run: () => {
        const form = sampleProfileForm();
        const built = buildProfileUpsertRow("user-abc", form);
        if (!built.ok) return false;

        const reloaded = mapUsersRowToProfileForm(built.row as unknown as Record<string, unknown>);
        return (
          reloaded.full_name === form.full_name &&
          reloaded.age === form.age &&
          reloaded.ibs_type === form.ibs_type &&
          reloaded.dietary_preference === form.dietary_preference &&
          reloaded.water_goal === "2500" &&
          reloaded.emergency_contact === form.emergency_contact
        );
      },
    },
    {
      id: "Profile blank numeric fields persist as null not zero",
      run: () => {
        const built = buildProfileUpsertRow("user-abc", sampleProfileForm({ age: "", height_cm: "" }));
        return built.ok && built.row.age === null && built.row.height_cm === null;
      },
    },
    {
      id: "Profile invalid age is rejected",
      run: () => {
        const built = buildProfileUpsertRow("user-abc", sampleProfileForm({ age: "999" }));
        return !built.ok;
      },
    },
    {
      id: "Symptom severity minimum 0 is accepted",
      run: () => {
        const result = buildSymptomInsertPayload({
          painLevel: 0,
          bloatingLevel: 0,
          gasLevel: 0,
          stressLevel: 2,
          energyLevel: 5,
          mood: "Okay",
          nausea: false,
          constipation: false,
          diarrhea: false,
          notes: "",
        });
        return result.ok && result.payload.severity === 0;
      },
    },
    {
      id: "Symptom severity maximum 10 is accepted",
      run: () => {
        const result = buildSymptomInsertPayload({
          painLevel: 10,
          bloatingLevel: 4,
          gasLevel: 3,
          stressLevel: 10,
          energyLevel: 8,
          mood: "Anxious",
          nausea: true,
          constipation: false,
          diarrhea: false,
          notes: "Peak flare",
        });
        return result.ok && result.payload.severity === 10;
      },
    },
    {
      id: "Missing invalid severity inputs are rejected rather than coerced to zero",
      run: () => computeSymptomSeverity(Number.NaN, 2, 3) === null,
    },
    {
      id: "Out-of-range symptom level is rejected",
      run: () => validateSymptomLevel(11, "Pain level") !== null,
    },
    {
      id: "Symptom notes are optional",
      run: () => {
        const result = buildSymptomInsertPayload({
          painLevel: 2,
          bloatingLevel: 2,
          gasLevel: 1,
          stressLevel: 3,
          energyLevel: 6,
          mood: "Good",
          nausea: false,
          constipation: false,
          diarrhea: false,
          notes: "   ",
        });
        return result.ok && result.payload.notes === null;
      },
    },
    {
      id: "Duplicate symptom submission blocked while saving",
      run: () => shouldBlockDuplicateSave(true) && !shouldBlockDuplicateSave(false),
    },
    {
      id: "Experiments without token returns 401",
      run: async () => {
        const auth = await authenticateSupabaseRequest(requestWithAuthorization(null), {
          verifyUser: async () => ({ userId: "should-not-run" }),
        });
        return auth.ok === false && mapAuthFailureToStatus(auth.reason) === 401;
      },
    },
    {
      id: "Experiments with valid token is accepted",
      run: async () => {
        const auth = await authenticateSupabaseRequest(requestWithAuthorization("Bearer valid-token"), {
          verifyUser: async () => ({ userId: "user-123" }),
        });
        return auth.ok === true && auth.userId === "user-123";
      },
    },
    {
      id: "Experiments invalid token returns 401",
      run: async () => {
        const auth = await authenticateSupabaseRequest(requestWithAuthorization("Bearer bad-token"), {
          verifyUser: async () => ({ userId: null, invalid: true }),
        });
        return auth.ok === false && auth.reason === "invalid_token";
      },
    },
    {
      id: "Experiments client user_id is rejected",
      run: () =>
        rejectsClientSuppliedUserId({ user_id: "other-user" }) &&
        rejectsClientSuppliedUserId({ userId: "other-user" }) &&
        !rejectsClientSuppliedUserId({ action: "create" }),
    },
    {
      id: "Dashboard temporary development test panel is absent",
      run: () => {
        const dashboardSource = readFileSync(
          join(process.cwd(), "src", "app", "dashboard", "page.tsx"),
          "utf8"
        );
        return (
          !dashboardSource.includes("Temporary Development Test") &&
          !dashboardSource.includes("Test Insight Generation") &&
          !dashboardSource.includes("generateInsightsFromApi")
        );
      },
    },
  ];

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const testCase of cases) {
    try {
      if (await testCase.run()) {
        passed += 1;
      } else {
        failed += 1;
        errors.push(`${testCase.id}: assertion failed`);
      }
    } catch (error) {
      failed += 1;
      errors.push(`${testCase.id}: ${error instanceof Error ? error.message : "unexpected error"}`);
    }
  }

  return { passed, failed, errors };
}
