export const INSIGHTS_SIGNED_OUT_MESSAGE = "Sign in to access your insights.";

export type InsightsApiError = {
  ok: false;
  signedOut: boolean;
  status: number;
  message: string;
};

export function buildInsightsSignedOutError(): InsightsApiError {
  return {
    ok: false,
    signedOut: true,
    status: 401,
    message: INSIGHTS_SIGNED_OUT_MESSAGE,
  };
}
