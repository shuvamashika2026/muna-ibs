import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseAuthFailureReason = "not_configured" | "missing_token" | "invalid_token";

export type SupabaseAuthResult =
  | { ok: true; supabase: SupabaseClient; userId: string; accessToken: string }
  | { ok: false; reason: SupabaseAuthFailureReason };

type AuthenticateOptions = {
  verifyUser?: (
    supabase: SupabaseClient,
    accessToken: string
  ) => Promise<{ userId: string | null; invalid?: boolean }>;
};

export function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.trim()) {
    return null;
  }

  const match = authorization.trim().match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export function mapAuthFailureToStatus(reason: SupabaseAuthFailureReason): number {
  return reason === "not_configured" ? 500 : 401;
}

export function createSupabaseForRequest(request: Request): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const accessToken = extractBearerToken(request);
  const authorization = accessToken ? `Bearer ${accessToken}` : "";

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

async function defaultVerifyUser(
  supabase: SupabaseClient,
  accessToken: string
): Promise<{ userId: string | null; invalid?: boolean }> {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user?.id) {
    return { userId: null, invalid: true };
  }

  return { userId: data.user.id };
}

export async function authenticateSupabaseRequest(
  request: Request,
  options?: AuthenticateOptions
): Promise<SupabaseAuthResult> {
  const supabase = createSupabaseForRequest(request);
  if (!supabase) {
    return { ok: false, reason: "not_configured" };
  }

  const accessToken = extractBearerToken(request);
  if (!accessToken) {
    return { ok: false, reason: "missing_token" };
  }

  const verifyUser = options?.verifyUser ?? defaultVerifyUser;
  const verified = await verifyUser(supabase, accessToken);
  if (!verified.userId) {
    return { ok: false, reason: "invalid_token" };
  }

  return {
    ok: true,
    supabase,
    userId: verified.userId,
    accessToken,
  };
}
