import {
  authenticateSupabaseRequest,
  extractBearerToken,
  mapAuthFailureToStatus,
} from "@/lib/supabase/request-auth";

function ensureSupabaseEnvForVerification(): void {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
}

function requestWithAuthorization(value: string | null): Request {
  const headers = new Headers();
  if (value) {
    headers.set("Authorization", value);
  }

  return new Request("http://localhost/api/insights", {
    method: "POST",
    headers,
  });
}

type Case = { id: string; run: () => boolean | Promise<boolean> };

export async function runRequestAuthVerification(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  ensureSupabaseEnvForVerification();

  const cases: Case[] = [
    {
      id: "No token or session returns 401",
      run: async () => {
        const request = requestWithAuthorization(null);
        const auth = await authenticateSupabaseRequest(request, {
          verifyUser: async () => ({ userId: "should-not-run" }),
        });
        return auth.ok === false && mapAuthFailureToStatus(auth.reason) === 401;
      },
    },
    {
      id: "Valid authenticated request is accepted",
      run: async () => {
        const request = requestWithAuthorization("Bearer valid-token");
        const auth = await authenticateSupabaseRequest(request, {
          verifyUser: async () => ({ userId: "user-123" }),
        });
        return auth.ok === true && auth.userId === "user-123" && auth.accessToken === "valid-token";
      },
    },
    {
      id: "Invalid token returns 401",
      run: async () => {
        const request = requestWithAuthorization("Bearer invalid-token");
        const auth = await authenticateSupabaseRequest(request, {
          verifyUser: async () => ({ userId: null, invalid: true }),
        });
        return auth.ok === false && auth.reason === "invalid_token" && mapAuthFailureToStatus(auth.reason) === 401;
      },
    },
    {
      id: "Bearer token is extracted case-insensitively",
      run: () => {
        const request = requestWithAuthorization("bearer abc.def.ghi");
        return extractBearerToken(request) === "abc.def.ghi";
      },
    },
    {
      id: "Malformed authorization header is treated as missing token",
      run: () => extractBearerToken(requestWithAuthorization("Token abc")) === null,
    },
  ];

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const testCase of cases) {
    try {
      const ok = await testCase.run();
      if (ok) {
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
