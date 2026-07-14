import {
  buildInsightsSignedOutError,
  INSIGHTS_SIGNED_OUT_MESSAGE,
} from "@/lib/insights/api-client-messages";

type Case = { id: string; run: () => boolean };

export function runInsightsApiClientVerification(): {
  passed: number;
  failed: number;
  errors: string[];
} {
  const cases: Case[] = [
    {
      id: "Signed-out helper returns a clear message",
      run: () => {
        const error = buildInsightsSignedOutError();
        return (
          error.ok === false &&
          error.signedOut === true &&
          error.status === 401 &&
          error.message === INSIGHTS_SIGNED_OUT_MESSAGE &&
          /sign in/i.test(error.message)
        );
      },
    },
  ];

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const testCase of cases) {
    try {
      if (testCase.run()) {
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
