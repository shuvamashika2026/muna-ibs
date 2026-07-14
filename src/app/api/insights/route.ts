import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clampObservationWindowDays, fetchMieInput } from "@/lib/insights/fetch-input";
import { generateMunaInsights } from "@/lib/insights/orchestrator";
import {
  buildRateLimitedResponseInsights,
  fetchActiveInsights,
  fetchLatestGenerationTimestamp,
  fetchLatestOverallInsight,
  MIE_REGENERATION_COOLDOWN_MS,
  saveGeneratedInsights,
  type UserSafeInsight,
} from "@/lib/insights/storage";
import type { InsightType } from "@/lib/insights/types";
import {
  authenticateSupabaseRequest,
  mapAuthFailureToStatus,
} from "@/lib/supabase/request-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

type AuthContext = {
  supabase: SupabaseClient;
  userId: string;
};

async function requireAuth(request: Request): Promise<AuthContext | NextResponse> {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) {
    const status = mapAuthFailureToStatus(auth.reason);
    const message =
      auth.reason === "not_configured"
        ? "Supabase is not configured."
        : auth.reason === "missing_token"
          ? "Authentication required."
          : "Authentication required.";
    return NextResponse.json({ error: message }, { status });
  }

  return { supabase: auth.supabase, userId: auth.userId };
}

function parseInsightType(value: string | null): InsightType | undefined {
  const allowed: InsightType[] = [
    "food",
    "hydration",
    "sleep",
    "stress",
    "bowel",
    "experiment",
    "overall",
  ];
  return allowed.includes(value as InsightType) ? (value as InsightType) : undefined;
}

function buildGetResponse(insights: UserSafeInsight[]) {
  const blockedPresent = insights.some((item) => item.blockedSafetyMarker);
  return {
    insights,
    blockedSafetyMarker: blockedPresent,
    coachingBlocked: blockedPresent,
  };
}

function buildPostResponse(input: {
  activeInsights: UserSafeInsight[];
  actionableInsights: UserSafeInsight[];
  overallInsight: UserSafeInsight | null;
  unavailableDomains: InsightType[];
  generatedAt: string;
  rateLimited?: boolean;
}) {
  const blockedPresent = input.activeInsights.some((item) => item.blockedSafetyMarker);
  return {
    activeInsights: input.activeInsights,
    actionableInsights: input.actionableInsights,
    overallInsight: input.overallInsight,
    unavailableDomains: input.unavailableDomains,
    generatedAt: input.generatedAt,
    rateLimited: Boolean(input.rateLimited),
    blockedSafetyMarker: blockedPresent,
    coachingBlocked: blockedPresent,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const type = parseInsightType(searchParams.get("type"));
    const actionableOnly = searchParams.get("actionableOnly") === "true";

    const insights = await fetchActiveInsights(auth.supabase, auth.userId, {
      type,
      actionableOnly,
    });

    return NextResponse.json(buildGetResponse(insights));
  } catch {
    return NextResponse.json({ error: "Insights could not be retrieved right now." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }

    let body: { force?: unknown; observationWindowDays?: unknown; user_id?: unknown; userId?: unknown } =
      {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }

    if (body.user_id !== undefined || body.userId !== undefined) {
      return NextResponse.json(
        { error: "Client-supplied user identifiers are not accepted." },
        { status: 400 }
      );
    }

    const force = body.force === true;
    const observationWindowDays = clampObservationWindowDays(
      typeof body.observationWindowDays === "number"
        ? body.observationWindowDays
        : Number(body.observationWindowDays)
    );

    const serviceClient = createSupabaseServiceClient();
    if (!serviceClient) {
      return NextResponse.json({ error: "Insight storage is not configured." }, { status: 500 });
    }

    const latestGeneratedAt = await fetchLatestGenerationTimestamp(serviceClient, auth.userId);
    if (
      !force &&
      latestGeneratedAt &&
      Date.now() - Date.parse(latestGeneratedAt) < MIE_REGENERATION_COOLDOWN_MS
    ) {
      const stored = await fetchActiveInsights(serviceClient, auth.userId, { markStale: true });
      const limited = buildRateLimitedResponseInsights(stored);
      return NextResponse.json(
        buildPostResponse({
          activeInsights: limited.activeInsights,
          actionableInsights: limited.actionableInsights,
          overallInsight: limited.overallInsight,
          unavailableDomains: [],
          generatedAt: limited.generatedAt ?? latestGeneratedAt,
          rateLimited: true,
        })
      );
    }

    const generatedAt = new Date().toISOString();
    const { input } = await fetchMieInput(auth.supabase, auth.userId, {
      generatedAt,
      observationWindowDays,
    });

    const generated = generateMunaInsights(input);
    await saveGeneratedInsights(serviceClient, auth.userId, generated.allInsights);

    const activeInsights = await fetchActiveInsights(serviceClient, auth.userId, { markStale: true });
    const actionableInsights = activeInsights.filter((item) => item.isActionable);
    const overallInsight = await fetchLatestOverallInsight(serviceClient, auth.userId);

    return NextResponse.json(
      buildPostResponse({
        activeInsights,
        actionableInsights,
        overallInsight,
        unavailableDomains: generated.unavailableDomains,
        generatedAt,
      })
    );
  } catch {
    return NextResponse.json({ error: "Insights could not be generated right now." }, { status: 500 });
  }
}

