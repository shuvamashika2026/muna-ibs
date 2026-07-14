export type VerifiedReviewStatus = "draft" | "reviewed" | "approved";

export type VerifiedEvidenceType =
  | "guideline"
  | "official_patient_guidance"
  | "university_clinical_guidance"
  | "consensus";

export type VerifiedGuidanceItem = {
  external_id: string;
  title: string;
  source_organisation: string;
  source_type: string;
  published_on: string | null;
  last_reviewed_on: string | null;
  topic: string;
  evidence_type: VerifiedEvidenceType;
  summary: string;
  recommendation: string;
  contraindications: string[];
  red_flags: string[];
  citation_url: string;
  citation_title: string;
  review_status: VerifiedReviewStatus;
  reviewer_note: string;
  version: string;
  is_active: boolean;
};

export type VerifiedGuidanceDataset = {
  dataset_version: string;
  record_count: number;
  data_dictionary: Record<string, string>;
  approved_source_organisations: string[];
  items: VerifiedGuidanceItem[];
  project?: string;
  dataset_name?: string;
  generated_at?: string;
  scope?: string;
};

export type VerifiedGuidanceImportRow = {
  external_id: string;
  title: string;
  source_organisation: string;
  source_type: string;
  published_on: string | null;
  last_reviewed_on: string | null;
  topic: string;
  evidence_type: VerifiedEvidenceType;
  summary: string;
  recommendation: string | null;
  contraindications: string[];
  red_flags: string[];
  citation_url: string;
  citation_title: string;
  review_status: VerifiedReviewStatus;
  reviewer_note: string | null;
  version: string;
  is_active: boolean;
  raw_record: VerifiedGuidanceItem;
  updated_at: string;
};

export type VerifiedGuidanceValidationResult =
  | {
      valid: true;
      dataset: VerifiedGuidanceDataset;
    }
  | {
      valid: false;
      errors: string[];
    };
