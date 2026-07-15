export type MiosIntent =
  | "crisis"
  | "emergency"
  | "food"
  | "symptoms"
  | "bowel_habits"
  | "medication"
  | "experiment"
  | "lifestyle"
  | "education"
  | "emotional_support"
  | "general";

export type MiosEvidenceSource =
  | "safety"
  | "verified_guidance"
  | "personal_history"
  | "experiment"
  | "community"
  | "general_knowledge";

export type MiosConfidence = "higher" | "moderate" | "limited" | "unavailable";

export type MiosRelevance = "high" | "moderate" | "low";

export type MiosSafetyStatus = "none" | "matched" | "critical" | "crisis";

export type MiosProhibitedClaim =
  | "diagnosis"
  | "causation"
  | "treatment_guarantee"
  | "prevalence_from_community"
  | "medication_dosing"
  | "stop_prescribed_medication"
  | "invented_personal_information";

export type MiosEvidenceItem = {
  id: string;
  source: MiosEvidenceSource;
  title: string;
  summary: string;
  confidence: MiosConfidence;
  relevance: MiosRelevance;
  limitations: string[];
  citationUrl?: string | null;
  sourceLabel: string;
  isAvailable: boolean;
  topics?: string[];
};

export type MiosEvidenceConflict = {
  description: string;
  primarySource: MiosEvidenceSource;
  secondarySource: MiosEvidenceSource;
  resolutionNote: string;
};

export type MiosSafetyResult = {
  safetyMatched: boolean;
  safetyAction: string | null;
  matchedThemes: string[];
};

export type MiosResponsePlan = {
  intent: MiosIntent;
  safetyStatus: MiosSafetyStatus;
  directAnswerGoal: string;
  acknowledgementNeeded: boolean;
  primaryEvidenceSource: MiosEvidenceSource | null;
  evidenceSummary: string;
  conflicts: MiosEvidenceConflict[];
  confidence: MiosConfidence;
  oneNextStep: string;
  safetyMessage: string | null;
  prohibitedClaims: MiosProhibitedClaim[];
  suggestedFollowUps: string[];
  experiencesVaryNote: string | null;
};

export type MiosOrchestratorInput = {
  currentQuestion: string;
  personalEvidence: MiosEvidenceItem[];
  experimentEvidence: MiosEvidenceItem[];
  verifiedGuidanceEvidence: MiosEvidenceItem[];
  communityEvidence: MiosEvidenceItem[];
  safetyResult: MiosSafetyResult;
};

export type MiosMergedEvidence = {
  items: MiosEvidenceItem[];
  conflicts: MiosEvidenceConflict[];
  unavailableSources: MiosEvidenceSource[];
};

export type MiosInternalDecisionSummary = {
  intent: MiosIntent;
  safetyStatus: MiosSafetyStatus;
  evidenceSourcesUsed: MiosEvidenceSource[];
  confidence: MiosConfidence;
  conflictCount: number;
  unavailableEvidenceSources: MiosEvidenceSource[];
};

export type MiosOrchestratorResult = {
  detectedIntent: MiosIntent;
  mergedEvidence: MiosMergedEvidence;
  responsePlan: MiosResponsePlan;
  decisionSummary: MiosInternalDecisionSummary;
};

export const MIOS_EVIDENCE_AUTHORITY_ORDER: MiosEvidenceSource[] = [
  "safety",
  "verified_guidance",
  "personal_history",
  "experiment",
  "community",
  "general_knowledge",
];

export const MIOS_DEFAULT_PROHIBITED_CLAIMS: MiosProhibitedClaim[] = [
  "diagnosis",
  "causation",
  "treatment_guarantee",
  "prevalence_from_community",
  "medication_dosing",
  "stop_prescribed_medication",
  "invented_personal_information",
];

export const MIOS_SOURCE_LABELS: Record<MiosEvidenceSource, string> = {
  safety: "Safety screening",
  verified_guidance: "Verified clinical guidance",
  personal_history: "Personal logged history",
  experiment: "Personal experiment observations",
  community: "Patient-reported community experience; anecdotal and not medical advice.",
  general_knowledge: "General IBS education",
};

export const MIOS_COMMUNITY_LIMIT = 3;
export const MIOS_VERIFIED_GUIDANCE_LIMIT = 2;
