"use client";

import {
  buildInsightsSignedOutError,
  INSIGHTS_SIGNED_OUT_MESSAGE,
  type InsightsApiError,
} from "@/lib/insights/api-client-messages";
import type { UserSafeInsight } from "@/lib/insights/storage";
import type { InsightType } from "@/lib/insights/types";
import { supabase } from "@/lib/supabase";

export { INSIGHTS_SIGNED_OUT_MESSAGE, buildInsightsSignedOutError };
export type { InsightsApiError };

export type InsightsGetResponse = {
  insights: UserSafeInsight[];
  blockedSafetyMarker: boolean;
  coachingBlocked: boolean;
};

export type InsightsPostResponse = {
  activeInsights: UserSafeInsight[];
  actionableInsights: UserSafeInsight[];
  overallInsight: UserSafeInsight | null;
  unavailableDomains: InsightType[];
  generatedAt: string;
  rateLimited?: boolean;
  blockedSafetyMarker: boolean;
  coachingBlocked: boolean;
};

export type InsightsApiSuccess<T> = {
  ok: true;
  status: number;
  data: T;
};

export type InsightsApiResult<T> = InsightsApiSuccess<T> | InsightsApiError;

type InsightsApiErrorPayload = {
  error?: string;
  message?: string;
};

async function getAccessToken(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Unable to retrieve Supabase session:", error);
      return null;
    }

    return session?.access_token ?? null;
  } catch (error) {
    console.error("Unexpected Supabase session error:", error);
    return null;
  }
}

async function readResponsePayload(
  response: Response,
): Promise<Record<string, unknown>> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return {};
  }

  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function callInsightsApi<T>(input: {
  method: "GET" | "POST";
  searchParams?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
}): Promise<InsightsApiResult<T>> {
  const token = await getAccessToken();

  if (!token) {
    return buildInsightsSignedOutError();
  }

  const url = new URL("/api/insights", window.location.origin);

  for (const [key, value] of Object.entries(input.searchParams ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: input.method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(input.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(input.body ? { body: JSON.stringify(input.body) } : {}),
      cache: "no-store",
    });

    const payload = await readResponsePayload(response);

    if (!response.ok) {
      const errorPayload = payload as InsightsApiErrorPayload;

      return {
        ok: false,
        signedOut: response.status === 401,
        status: response.status,
        message:
          response.status === 401
            ? INSIGHTS_SIGNED_OUT_MESSAGE
            : errorPayload.error ??
              errorPayload.message ??
              "Insights could not be loaded right now.",
      };
    }

    return {
      ok: true,
      status: response.status,
      data: payload as T,
    };
  } catch (error) {
    console.error("Insights API request failed:", error);

    return {
      ok: false,
      signedOut: false,
      status: 0,
      message:
        "Insights could not be loaded because of a network problem. Please try again.",
    };
  }
}

export async function fetchActiveInsightsFromApi(options?: {
  type?: InsightType;
  actionableOnly?: boolean;
}): Promise<InsightsApiResult<InsightsGetResponse>> {
  return callInsightsApi<InsightsGetResponse>({
    method: "GET",
    searchParams: {
      type: options?.type,
      actionableOnly: options?.actionableOnly ? "true" : undefined,
    },
  });
}

export async function generateInsightsFromApi(options?: {
  force?: boolean;
  observationWindowDays?: number;
}): Promise<InsightsApiResult<InsightsPostResponse>> {
  return callInsightsApi<InsightsPostResponse>({
    method: "POST",
    body: {
      ...(options?.force === true ? { force: true } : {}),
      ...(options?.observationWindowDays !== undefined
        ? { observationWindowDays: options.observationWindowDays }
        : {}),
    },
  });
}