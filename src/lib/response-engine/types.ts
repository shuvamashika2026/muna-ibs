import type { MiosConfidence, MiosIntent, MiosSafetyStatus } from "@/lib/mios/types";

export type ResponseTemplate =
  | "emergency"
  | "medication"
  | "food"
  | "symptoms"
  | "experiment"
  | "emotional_support"
  | "education"
  | "bowel_habits"
  | "lifestyle"
  | "general";

export type TemplateCardKey = string;

export type TemplateCardDefinition = {
  key: TemplateCardKey;
  title: string;
};

export type ResponseTemplateDefinition = {
  template: ResponseTemplate;
  cards: [TemplateCardDefinition, TemplateCardDefinition, TemplateCardDefinition, TemplateCardDefinition];
};

export type StructuredResponseCard = {
  key: TemplateCardKey;
  title: string;
  content: string;
};

export type StructuredModelOutput = {
  cards: StructuredResponseCard[];
  followUps: string[];
};

export type EvidenceSourceSummary = {
  available: boolean;
  label: string;
  summary?: string;
};

export type UserSafeEvidenceSummary = {
  personal: EvidenceSourceSummary;
  verified: EvidenceSourceSummary;
  community: EvidenceSourceSummary;
  experiment: EvidenceSourceSummary;
};

export type MdreSelection = {
  intent: MiosIntent;
  template: ResponseTemplate;
  safetyStatus: MiosSafetyStatus;
  confidence: MiosConfidence;
  showConfidenceBadge: boolean;
};

export type MunaAiSuccessResponse = {
  answer: string;
  intent: MiosIntent;
  template: ResponseTemplate;
  safetyStatus: MiosSafetyStatus;
  confidence: MiosConfidence;
  evidenceSummary: UserSafeEvidenceSummary;
  missingEvidence: string[];
  suggestedFollowUps: string[];
  cards: StructuredResponseCard[];
};

export const CONFIDENCE_BADGE_TEMPLATES: ResponseTemplate[] = [
  "food",
  "symptoms",
  "experiment",
  "bowel_habits",
  "lifestyle",
];
