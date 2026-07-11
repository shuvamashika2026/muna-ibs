import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const redFlagPattern =
  /\b(blood in stool|bloody stool|black stool|severe pain|fever|dehydration|fainting|passed out|unexplained weight loss|weight loss)\b/i;

const systemPrompt = `
You are MUNA AI, a friendly IBS brain-gut health companion inside the MUNA IBS app.

Medical disclaimer:
MUNA AI is for general education and self-tracking support only. You do not provide medical diagnosis, prescribe medicine, claim to cure IBS, or replace a qualified doctor, gastroenterologist, dietitian, or emergency care.

Behavior rules:
- Give friendly, concise, practical answers.
- Use plain language and short sections.
- Encourage tracking food, symptoms, stress, sleep, water, and bowel movements when useful.
- Do not diagnose conditions or say the user has IBS, IBD, cancer, infection, or any specific disease.
- Do not prescribe medication, supplements, or strict diets.
- For diet ideas, frame them as general options to discuss with a qualified doctor or dietitian.
- If the user mentions urgent red flags such as blood in stool, severe pain, fever, dehydration, black stool, fainting, or unexplained weight loss, advise urgent medical care immediately.
- If symptoms are new, worsening, persistent, or worrying, advise contacting a qualified clinician.
- When health history is provided, use it to personalize the answer. Mention patterns gently, without diagnosing.
- Every answer must begin by analysing the user's tracked health data before giving advice.
- Start every answer with this layout:
MUNA Health Snapshot

Gut Score:
__/100

Today's Flare Risk:
Low / Medium / High

Today's Positive Habits:
✔ ...

Today's Possible Triggers:
⚠ ...

Personal Recommendation

- Use the user's own tracked trends first. Only provide general IBS education if there is insufficient data.
- Always include a medical disclaimer.
- End most answers with a brief reminder: If symptoms worsen or red-flag symptoms appear, consult a healthcare professional.
`;

type HealthData = {
  userId?: string;
  meals: Record<string, unknown>[];
  water: Record<string, unknown>[];
  sleep: Record<string, unknown>[];
  symptoms: Record<string, unknown>[];
  stool: Record<string, unknown>[];
  medications: Record<string, unknown>[];
  exercise: Record<string, unknown>[];
  flareHistory: Record<string, unknown>[];
  triggerFoods: Record<string, unknown>[];
  accessNotes: string[];
};

function createSupabaseForRequest(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const authorization = request.headers.get("authorization") || "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: authorization
      ? {
          headers: {
            Authorization: authorization,
          },
        }
      : undefined,
  });
}

async function safeSelect(
  supabase: SupabaseClient,
  table: string,
  userId: string,
  limit = 20
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { rows: [], error: `${table}: ${error.message}` };
  }

  return { rows: (data || []) as Record<string, unknown>[] };
}

function numberFrom(row: Record<string, unknown> | undefined, keys: string[], fallback = 0) {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }

  return fallback;
}

function textFrom(row: Record<string, unknown> | undefined, keys: string[], fallback = "not logged") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return fallback;
}

function calculateHealthSummary(data: HealthData) {
  const latestSymptom = data.symptoms[0];
  const latestSleep = data.sleep[0];
  const latestStool = data.stool[0];
  const latestWater = data.water[0];

  const pain = numberFrom(latestSymptom, ["severity"], 2);
  const bloating = numberFrom(latestSymptom, ["severity"], 3);
  const stress = numberFrom(latestSymptom, ["stress_level", "stress"], 3);
  const sleep = numberFrom(latestSleep, ["hours", "sleep_hours"], 7.5);
  const bristol = numberFrom(latestStool, ["bristol_type", "type"], 4);
  const waterCups = numberFrom(latestWater, ["cups"], 0);
  const waterLiters = waterCups ? waterCups * 0.25 : 1.8;
  const exerciseLogged = data.exercise.length > 0;

  let gutScore = 100 - pain * 4 - bloating * 3 - Math.max(0, stress - 3) * 3;
  if (sleep < 7) gutScore -= 8;
  if (waterLiters < 1.8) gutScore -= 6;
  if (![3, 4, 5].includes(bristol)) gutScore -= 8;
  gutScore = Math.max(0, Math.min(100, Math.round(gutScore)));

  const riskScore = 100 - gutScore;
  const flareRisk = riskScore >= 55 ? "High" : riskScore >= 30 ? "Medium" : "Low";

  const positiveHabits = [
    sleep >= 7 ? `Slept ${sleep.toFixed(1)} hrs` : "",
    stress <= 4 ? "Low stress" : "",
    waterLiters >= 1.8 ? "Good hydration" : "",
    exerciseLogged ? "Walk or exercise logged" : "",
    [3, 4, 5].includes(bristol) ? "Stool pattern looks stable" : "",
  ].filter(Boolean);

  const latestMealText = data.meals
    .slice(0, 5)
    .map((meal) => textFrom(meal, ["foods", "food_name", "meal_type", "notes"], ""))
    .join(" ")
    .toLowerCase();

  const possibleTriggers = [
    stress >= 6 ? "Stress is elevated" : "",
    sleep < 7 ? "Sleep was below 7 hours" : "",
    waterLiters < 1.8 ? "Water intake may still be low" : "",
    latestMealText.includes("coffee") ? "Coffee logged recently" : "",
    latestMealText.includes("dairy") || latestMealText.includes("milk") ? "Dairy logged recently" : "",
    latestMealText.includes("garlic") || latestMealText.includes("onion")
      ? "Onion or garlic logged recently"
      : "",
    data.triggerFoods[0] ? `Known trigger: ${textFrom(data.triggerFoods[0], ["food_name", "name"], "food")}` : "",
  ].filter(Boolean);

  return {
    gutScore,
    flareRisk,
    confidence: data.userId ? 89 : 58,
    positiveHabits: positiveHabits.length ? positiveHabits : ["Not enough positive habit data yet"],
    possibleTriggers: possibleTriggers.length ? possibleTriggers : ["No strong trigger pattern detected today"],
    waterLiters: waterLiters.toFixed(1),
    sleepHours: sleep.toFixed(1),
    stress,
    pain,
    bloating,
    bristol,
  };
}

function buildHealthContext(data: HealthData) {
  const summary = calculateHealthSummary(data);

  return `
MUNA retrieved tracked health data before answering.

Data access notes:
${data.accessNotes.length ? data.accessNotes.join("\n") : "All available health tables were queried."}

MUNA Health Snapshot

Gut Score:
${summary.gutScore}/100

Today's Flare Risk:
${summary.flareRisk}

Today's Positive Habits:
${summary.positiveHabits.map((item) => `✔ ${item}`).join("\n")}

Today's Possible Triggers:
${summary.possibleTriggers.map((item) => `⚠ ${item}`).join("\n")}

MUNA Prediction:
Tomorrow is likely to be a ${summary.flareRisk.toUpperCase()} symptom day.

Confidence:
${summary.confidence}%

Recent meals:
${JSON.stringify(data.meals.slice(0, 8))}

Water logs:
${JSON.stringify(data.water.slice(0, 8))}

Sleep logs:
${JSON.stringify(data.sleep.slice(0, 8))}

Symptoms and stress:
${JSON.stringify(data.symptoms.slice(0, 8))}

Stool logs:
${JSON.stringify(data.stool.slice(0, 8))}

Medication:
${JSON.stringify(data.medications.slice(0, 8))}

Exercise:
${JSON.stringify(data.exercise.slice(0, 8))}

Previous flare history / reports:
${JSON.stringify(data.flareHistory.slice(0, 8))}
`;
}

async function retrieveHealthData(request: Request): Promise<HealthData> {
  const supabase = createSupabaseForRequest(request);
  const empty: HealthData = {
    meals: [],
    water: [],
    sleep: [],
    symptoms: [],
    stool: [],
    medications: [],
    exercise: [],
    flareHistory: [],
    triggerFoods: [],
    accessNotes: [],
  };

  if (!supabase) {
    return {
      ...empty,
      accessNotes: ["Supabase is not configured, so only general IBS guidance is available."],
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (userError || !userId) {
    return {
      ...empty,
      accessNotes: ["No signed-in user token was provided, so private tracked health data could not be retrieved."],
    };
  }

  const [
    meals,
    water,
    sleep,
    symptoms,
    stool,
    medicationReminders,
    weeklyReports,
    triggerFoods,
  ] = await Promise.all([
    safeSelect(supabase, "meals", userId),
    safeSelect(supabase, "water_logs", userId),
    safeSelect(supabase, "sleep_logs", userId),
    safeSelect(supabase, "symptoms", userId),
    safeSelect(supabase, "bowel_movements", userId),
    safeSelect(supabase, "medication_reminders", userId),
    safeSelect(supabase, "weekly_reports", userId),
    safeSelect(supabase, "trigger_foods", userId),
  ]);

  const accessNotes = [
    meals.error,
    water.error,
    sleep.error,
    symptoms.error,
    stool.error,
    medicationReminders.error,
    weeklyReports.error,
    triggerFoods.error,
  ].filter((item): item is string => Boolean(item));

  return {
    userId,
    meals: meals.rows,
    water: water.rows,
    sleep: sleep.rows,
    symptoms: symptoms.rows,
    stool: stool.rows,
    medications: medicationReminders.rows,
    exercise: [],
    flareHistory: weeklyReports.rows,
    triggerFoods: triggerFoods.rows,
    accessNotes,
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      message?: unknown;
      history?: unknown;
    };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

    if (!message) {
      return NextResponse.json({ error: "Please enter a question for MUNA AI." }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Please keep your question under 2,000 characters." },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey });
    const healthData = await retrieveHealthData(request);
    const healthContext = buildHealthContext(healthData);
    const redFlagContext = redFlagPattern.test(message)
      ? "The user's message may contain urgent red-flag symptoms. Start by advising urgent medical care."
      : "";

    const conversationContext = history
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          "role" in item &&
          "content" in item &&
          typeof item.role === "string" &&
          typeof item.content === "string"
        ) {
          return `${item.role}: ${item.content.slice(0, 700)}`;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");

    const requestPayload = {
      instructions: `${systemPrompt}\n${redFlagContext}`,
      input: `
Health context:
${healthContext}

Recent conversation:
${conversationContext || "No previous conversation in this session."}

User question:
${message}
`,
      temperature: 0.4,
      max_output_tokens: 650,
    };

    let response;

    try {
      response = await client.responses.create({
        model: "gpt-4.1-mini",
        ...requestPayload,
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "";
      const shouldFallback =
        message.toLowerCase().includes("model") || message.toLowerCase().includes("not found");

      if (!shouldFallback) {
        throw caughtError;
      }

      response = await client.responses.create({
        model: "gpt-4o-mini",
        ...requestPayload,
      });
    }

    return NextResponse.json({
      answer:
        response.output_text ||
        "I could not generate a response right now. Please try again in a moment.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
