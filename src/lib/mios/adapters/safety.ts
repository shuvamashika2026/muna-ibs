import type { MiosSafetyResult } from "@/lib/mios/types";
import { screenCommunityKnowledgeQuery } from "@/lib/community-knowledge/retrieval";

export function buildMiosSafetyResult(input: {
  question: string;
  routeRedFlagMatched: boolean;
  communitySafetyMatched: boolean;
  communitySafetyAction: string | null;
  communityMatchedThemes: string[];
}): MiosSafetyResult {
  const screened = screenCommunityKnowledgeQuery(input.question);
  const safetyMatched =
    input.routeRedFlagMatched || input.communitySafetyMatched || screened.safetyMatched;

  const matchedThemes = [
    ...(input.routeRedFlagMatched ? ["route_red_flag"] : []),
    ...input.communityMatchedThemes,
    ...screened.matchedThemes,
  ];

  const uniqueThemes = [...new Set(matchedThemes)];

  let safetyAction = input.communitySafetyAction ?? screened.safetyAction;
  if (input.routeRedFlagMatched && !safetyAction) {
    safetyAction = "urgent_medical_assessment";
  }

  return {
    safetyMatched,
    safetyAction,
    matchedThemes: uniqueThemes,
  };
}
