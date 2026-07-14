import type { SupabaseClient } from "@supabase/supabase-js";
import { retrieveCommunityKnowledge } from "@/lib/community-knowledge/retrieval";
import { buildCommunityKnowledgeAiContextFromResult } from "@/lib/community-knowledge/build-ai-context";
import { mapCommunityRetrievalToEvidence } from "@/lib/mios/adapters/community";
import { fetchExperimentEvidenceForMios } from "@/lib/mios/adapters/experiment";
import {
  hasInsufficientPersonalData,
  mapPersonalMemoryToEvidence,
  type PersonalHealthSummary,
} from "@/lib/mios/adapters/personal";
import type { PersonalMemoryProfile } from "@/lib/mios/adapters/types-bridge";
import { buildMiosSafetyResult } from "@/lib/mios/adapters/safety";
import { fetchVerifiedGuidanceEvidenceForMios } from "@/lib/mios/adapters/verified";
import { buildMiosReasoningContext } from "@/lib/mios/build-reasoning-context";
import { orchestrateMios } from "@/lib/mios/orchestrator";
import type { MiosOrchestratorInput, MiosOrchestratorResult } from "@/lib/mios/types";

export type MiosRoutePreparation = {
  usedMios: boolean;
  urgentSafety: boolean;
  reasoningContext: string;
  legacyCommunityContextBlock: string;
  orchestration: MiosOrchestratorResult | null;
};

export async function prepareMiosForRoute(input: {
  message: string;
  supabase: SupabaseClient | null;
  userId: string | undefined;
  memoryProfile: PersonalMemoryProfile;
  healthSummary: PersonalHealthSummary;
  routeRedFlagMatched: boolean;
  orchestrate?: (input: MiosOrchestratorInput) => MiosOrchestratorResult;
}): Promise<MiosRoutePreparation> {
  const communityRetrieval = await retrieveCommunityKnowledge({ queryText: input.message });
  const legacyCommunity = buildCommunityKnowledgeAiContextFromResult(communityRetrieval);

  const urgentSafety =
    input.routeRedFlagMatched || legacyCommunity.safetyMatched || communityRetrieval.safetyMatched;

  const legacyCommunityContextBlock =
    legacyCommunity.text && !urgentSafety
      ? `
Curated community knowledge (anecdotal — not clinical evidence):
${legacyCommunity.text}
`
      : "";

  try {
    const orchestrate = input.orchestrate ?? orchestrateMios;
    const [experimentEvidence, verifiedGuidanceEvidence] = await Promise.all([
      fetchExperimentEvidenceForMios(input.supabase, input.userId),
      fetchVerifiedGuidanceEvidenceForMios(),
    ]);

    const orchestration = orchestrate({
      currentQuestion: input.message,
      personalEvidence: mapPersonalMemoryToEvidence(input.memoryProfile, input.healthSummary),
      experimentEvidence,
      verifiedGuidanceEvidence,
      communityEvidence: mapCommunityRetrievalToEvidence(communityRetrieval),
      safetyResult: buildMiosSafetyResult({
        question: input.message,
        routeRedFlagMatched: input.routeRedFlagMatched,
        communitySafetyMatched: communityRetrieval.safetyMatched,
        communitySafetyAction: communityRetrieval.safetyAction,
        communityMatchedThemes: communityRetrieval.matchedThemes,
      }),
    });

    const reasoningContext = buildMiosReasoningContext(orchestration, {
      insufficientPersonalData: hasInsufficientPersonalData(input.healthSummary),
    });

    return {
      usedMios: true,
      urgentSafety,
      reasoningContext,
      legacyCommunityContextBlock: "",
      orchestration,
    };
  } catch {
    return {
      usedMios: false,
      urgentSafety,
      reasoningContext: "",
      legacyCommunityContextBlock,
      orchestration: null,
    };
  }
}
