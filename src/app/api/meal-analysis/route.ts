import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runHybridMealAnalysis } from "@/lib/meal-analysis/orchestrator";
import {
  assertMealOwnedByUser,
  fetchMealAnalysisForUser,
  upsertMealAnalysis,
} from "@/lib/meal-analysis/storage";
import {
  hasMealInputContent,
  mealAnalysisSchema,
  type MealAnalysisInput,
} from "@/lib/meal-analysis/types";
import {
  authenticateSupabaseRequest,
  mapAuthFailureToStatus,
} from "@/lib/supabase/request-auth";

export const runtime = "nodejs";

const MAX_MEAL_FIELD_LENGTH = 1200;

type AuthContext = {
  supabase: SupabaseClient;
  userId: string;
};

function sanitizeText(value: unknown, maxLength = MAX_MEAL_FIELD_LENGTH): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
}

function sanitizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function parseMealInput(body: Record<string, unknown>): MealAnalysisInput | null {
  const meal = body.meal;
  if (!meal || typeof meal !== "object") {
    return null;
  }

  const record = meal as Record<string, unknown>;
  const parsed: MealAnalysisInput = {
    mealType: sanitizeText(record.mealType, 80) || "Meal",
    mealName: sanitizeText(record.mealName),
    ingredients: sanitizeText(record.ingredients),
    drinks: sanitizeText(record.drinks),
    portionSize: sanitizeText(record.portionSize, 80) || "Medium",
    locationType: sanitizeText(record.locationType, 80) || "Home",
    cookingMethod: sanitizeText(record.cookingMethod, 80),
    fodmapLevel: sanitizeText(record.fodmapLevel, 40) || "Unknown",
    notes: sanitizeText(record.notes),
    tags: sanitizeTags(record.tags),
  };

  return hasMealInputContent(parsed) ? parsed : null;
}

async function requireAuth(request: Request): Promise<AuthContext | NextResponse> {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) {
    const status = mapAuthFailureToStatus(auth.reason);
    const message =
      auth.reason === "not_configured"
        ? "Supabase is not configured."
        : "Authentication required.";
    return NextResponse.json({ error: message }, { status });
  }

  return { supabase: auth.supabase, userId: auth.userId };
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const mealId = new URL(request.url).searchParams.get("mealId")?.trim();
  if (!mealId) {
    return NextResponse.json({ error: "mealId is required." }, { status: 400 });
  }

  const owned = await assertMealOwnedByUser(auth.supabase, auth.userId, mealId);
  if (!owned) {
    return NextResponse.json({ error: "Meal not found." }, { status: 404 });
  }

  const stored = await fetchMealAnalysisForUser(auth.supabase, auth.userId, mealId);
  if (!stored) {
    return NextResponse.json({ analysis: null, cached: false, deepseekUsed: false });
  }

  return NextResponse.json({
    analysis: stored.analysis,
    cached: true,
    deepseekUsed: stored.analysis.metadata?.deepseekCalled ?? false,
    mealId: stored.mealId,
    updatedAt: stored.updatedAt,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mealId = sanitizeText(body.mealId, 80);
  const force = body.force === true;
  const persistOnly = body.persistOnly === true;

  if (persistOnly) {
    if (!mealId) {
      return NextResponse.json({ error: "mealId is required to persist analysis." }, { status: 400 });
    }

    const owned = await assertMealOwnedByUser(auth.supabase, auth.userId, mealId);
    if (!owned) {
      return NextResponse.json({ error: "Meal not found." }, { status: 404 });
    }

    const parsedAnalysis = mealAnalysisSchema.safeParse(body.analysis);
    if (!parsedAnalysis.success) {
      return NextResponse.json({ error: "Analysis payload is invalid." }, { status: 400 });
    }

    const stored = await upsertMealAnalysis(
      auth.supabase,
      auth.userId,
      mealId,
      parsedAnalysis.data
    );

    if (!stored) {
      return NextResponse.json({ error: "Could not save meal analysis." }, { status: 500 });
    }

    return NextResponse.json({
      analysis: stored.analysis,
      cached: true,
      deepseekUsed: stored.analysis.metadata?.deepseekCalled ?? false,
      mealId: stored.mealId,
      updatedAt: stored.updatedAt,
    });
  }

  const mealInput = parseMealInput(body);
  if (!mealInput) {
    return NextResponse.json(
      { error: "Add at least one food, ingredient, drink, or note before analysis." },
      { status: 400 }
    );
  }

  if (mealId) {
    const owned = await assertMealOwnedByUser(auth.supabase, auth.userId, mealId);
    if (!owned) {
      return NextResponse.json({ error: "Meal not found." }, { status: 404 });
    }

    if (!force) {
      const cached = await fetchMealAnalysisForUser(auth.supabase, auth.userId, mealId);
      if (cached) {
        return NextResponse.json({
          analysis: cached.analysis,
          cached: true,
          deepseekUsed: cached.analysis.metadata?.deepseekCalled ?? false,
          mealId: cached.mealId,
          updatedAt: cached.updatedAt,
        });
      }
    }
  }

  try {
    const outcome = await runHybridMealAnalysis({
      supabase: auth.supabase,
      userId: auth.userId,
      meal: mealInput,
      force,
    });

    let storedMealId = mealId;
    if (mealId) {
      const stored = await upsertMealAnalysis(
        auth.supabase,
        auth.userId,
        mealId,
        outcome.analysis
      );

      if (!stored) {
        return NextResponse.json(
          { error: "Analysis completed but could not be saved." },
          { status: 500 }
        );
      }

      storedMealId = stored.mealId;
    }

    return NextResponse.json({
      analysis: outcome.analysis,
      cached: false,
      deepseekUsed: outcome.deepseekUsed,
      mealId: storedMealId || undefined,
      usage: outcome.usage,
      notice: outcome.notice,
    });
  } catch (error) {
    console.error("Meal analysis failed:", error);
    return NextResponse.json(
      { error: "Meal analysis is unavailable right now. Please try again." },
      { status: 500 }
    );
  }
}
