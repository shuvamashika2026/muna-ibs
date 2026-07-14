export type KnowledgePriority = "low" | "moderate" | "high" | "critical";

export type CommunityEvidenceLayer = "community";

export type SafetyRule = {
  id: string;
  severity: string;
  terms: string[];
  action: string;
};

export type CommunitySafetyRules = {
  version: string;
  principle: string;
  rules: SafetyRule[];
};

export type CommunityKnowledgeItem = {
  external_id: string;
  knowledge_type: string;
  title: string;
  summary: string;
  priority: KnowledgePriority;
  evidence_layer: CommunityEvidenceLayer;
  evidence_type?: string;
  confidence?: string;
  symptoms: string[];
  triggers: string[];
  interventions: string[];
  outcomes: string[];
  conditions: string[];
  quality_of_life: string[];
  red_flags: string[];
  misinformation: string[];
  recommended_response?: string;
  tags: string[];
  is_active?: boolean;
  source_note?: string;
};

export type CommunityKnowledgeDataset = {
  dataset_version: string;
  record_count: number;
  safety_rules: CommunitySafetyRules;
  data_dictionary: Record<string, string>;
  items: CommunityKnowledgeItem[];
  project?: string;
  dataset_name?: string;
  generated_at?: string;
  scope?: string;
};

export type CommunityKnowledgeImportRow = {
  external_id: string;
  dataset_version: string;
  knowledge_type: string;
  title: string;
  summary: string;
  priority: KnowledgePriority;
  evidence_layer: CommunityEvidenceLayer;
  evidence_type: string | null;
  confidence: string | null;
  symptoms: string[];
  triggers: string[];
  interventions: string[];
  outcomes: string[];
  conditions: string[];
  quality_of_life: string[];
  red_flags: string[];
  misinformation: string[];
  recommended_response: string | null;
  tags: string[];
  source_note: string | null;
  is_active: boolean;
  raw_record: CommunityKnowledgeItem;
  updated_at: string;
};

export type CommunityKnowledgeValidationResult =
  | {
      valid: true;
      dataset: CommunityKnowledgeDataset;
    }
  | {
      valid: false;
      errors: string[];
    };
