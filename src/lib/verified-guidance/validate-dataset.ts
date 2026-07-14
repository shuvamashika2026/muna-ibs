import type {
  VerifiedEvidenceType,
  VerifiedGuidanceDataset,
  VerifiedGuidanceItem,
  VerifiedGuidanceValidationResult,
  VerifiedReviewStatus,
} from "@/lib/verified-guidance/types";

const REVIEW_STATUSES: VerifiedReviewStatus[] = ["draft", "reviewed", "approved"];
const EVIDENCE_TYPES: VerifiedEvidenceType[] = [
  "guideline",
  "official_patient_guidance",
  "university_clinical_guidance",
  "consensus",
];

const APPROVED_SOURCE_ORGANISATIONS = [
  "NICE",
  "American College of Gastroenterology",
  "Monash University FODMAP",
  "NHS",
];

const APPROVED_CITATION_URLS = [
  "https://www.nice.org.uk/guidance/cg61",
  "https://webfiles.gi.org/links/PCC/ACG_Clinical_Guideline__Management_of_Irritable.11.pdf",
  "https://gi.org/topics/irritable-bowel-syndrome/",
  "https://www.monashfodmap.com/ibs-central/i-have-ibs/starting-the-low-fodmap-diet/",
  "https://www.nhs.uk/conditions/irritable-bowel-syndrome-ibs/symptoms/",
];

const REQUIRED_ITEM_FIELDS = [
  "external_id",
  "title",
  "source_organisation",
  "source_type",
  "topic",
  "evidence_type",
  "summary",
  "recommendation",
  "contraindications",
  "red_flags",
  "citation_url",
  "citation_title",
  "review_status",
  "reviewer_note",
  "version",
  "is_active",
] as const;

const FORBIDDEN_CONTENT_PATTERN =
  /\b(\d+\s*mg|\d+\s*mcg|take\s+\d+|prescribe|prescription\s+for|diagnose\s+you\s+with|prevalence\s+of|%\s+of\s+people|guaranteed\s+to|will\s+cure|always\s+effective)\b/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  return Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function validateDataDictionary(value: unknown, errors: string[]): value is Record<string, string> {
  if (!isPlainObject(value)) {
    errors.push("data_dictionary must be an object.");
    return false;
  }

  if (Object.keys(value).length === 0) {
    errors.push("data_dictionary must not be empty.");
  }

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string") {
      errors.push(`data_dictionary.${key} must be a string.`);
    }
  }

  return errors.length === 0;
}

function validateApprovedOrganisations(value: unknown, errors: string[]): value is string[] {
  if (!isStringArray(value)) {
    errors.push("approved_source_organisations must be a string array.");
    return false;
  }

  for (const organisation of APPROVED_SOURCE_ORGANISATIONS) {
    if (!value.includes(organisation)) {
      errors.push(`approved_source_organisations must include "${organisation}".`);
    }
  }

  return errors.length === 0;
}

function validateItemContent(item: VerifiedGuidanceItem, index: number, errors: string[]): void {
  const combined = `${item.summary} ${item.recommendation} ${item.reviewer_note}`;
  if (FORBIDDEN_CONTENT_PATTERN.test(combined)) {
    errors.push(`items[${index}] contains forbidden prescribing, dosing, diagnosis or prevalence language.`);
  }
}

function validateItem(item: unknown, index: number, errors: string[]): item is VerifiedGuidanceItem {
  if (!isPlainObject(item)) {
    errors.push(`items[${index}] must be an object.`);
    return false;
  }

  for (const field of REQUIRED_ITEM_FIELDS) {
    if (!(field in item)) {
      errors.push(`items[${index}] is missing required field "${field}".`);
    }
  }

  if (!isNonEmptyString(item.external_id)) {
    errors.push(`items[${index}].external_id must be a non-empty string.`);
  }

  if (!isNonEmptyString(item.title)) {
    errors.push(`items[${index}].title must be a non-empty string.`);
  }

  if (!isNonEmptyString(item.source_organisation)) {
    errors.push(`items[${index}].source_organisation must be a non-empty string.`);
  } else if (!APPROVED_SOURCE_ORGANISATIONS.includes(String(item.source_organisation))) {
    errors.push(`items[${index}].source_organisation must be an approved organisation.`);
  }

  if (!isNonEmptyString(item.source_type)) {
    errors.push(`items[${index}].source_type must be a non-empty string.`);
  }

  const hasPublishedOn = item.published_on === null || isValidDateString(item.published_on);
  const hasLastReviewedOn = item.last_reviewed_on === null || isValidDateString(item.last_reviewed_on);

  if (!hasPublishedOn) {
    errors.push(`items[${index}].published_on must be null or YYYY-MM-DD.`);
  }

  if (!hasLastReviewedOn) {
    errors.push(`items[${index}].last_reviewed_on must be null or YYYY-MM-DD.`);
  }

  if (item.published_on === null && item.last_reviewed_on === null) {
    errors.push(`items[${index}] must include published_on or last_reviewed_on.`);
  }

  if (!isNonEmptyString(item.topic)) {
    errors.push(`items[${index}].topic must be a non-empty string.`);
  }

  if (
    typeof item.evidence_type !== "string" ||
    !EVIDENCE_TYPES.includes(item.evidence_type as VerifiedEvidenceType)
  ) {
    errors.push(`items[${index}].evidence_type must be one of: ${EVIDENCE_TYPES.join(", ")}.`);
  }

  if (!isNonEmptyString(item.summary)) {
    errors.push(`items[${index}].summary must be a non-empty string.`);
  }

  if (!isNonEmptyString(item.recommendation)) {
    errors.push(`items[${index}].recommendation must be a non-empty string.`);
  }

  if (!isStringArray(item.contraindications)) {
    errors.push(`items[${index}].contraindications must be a string array.`);
  }

  if (!isStringArray(item.red_flags)) {
    errors.push(`items[${index}].red_flags must be a string array.`);
  }

  if (!isNonEmptyString(item.citation_url)) {
    errors.push(`items[${index}].citation_url must be a non-empty string.`);
  } else if (!APPROVED_CITATION_URLS.includes(String(item.citation_url))) {
    errors.push(`items[${index}].citation_url must match an approved official source URL.`);
  }

  if (!isNonEmptyString(item.citation_title)) {
    errors.push(`items[${index}].citation_title must be a non-empty string.`);
  }

  if (
    typeof item.review_status !== "string" ||
    !REVIEW_STATUSES.includes(item.review_status as VerifiedReviewStatus)
  ) {
    errors.push(`items[${index}].review_status must be one of: ${REVIEW_STATUSES.join(", ")}.`);
  }

  if (!isNonEmptyString(item.reviewer_note)) {
    errors.push(`items[${index}].reviewer_note must be a non-empty string.`);
  }

  if (!isNonEmptyString(item.version)) {
    errors.push(`items[${index}].version must be a non-empty string.`);
  }

  if (typeof item.is_active !== "boolean") {
    errors.push(`items[${index}].is_active must be a boolean.`);
  }

  if (errors.length === 0) {
    validateItemContent(item as VerifiedGuidanceItem, index, errors);
  }

  return errors.length === 0;
}

export function validateVerifiedGuidanceDataset(raw: unknown): VerifiedGuidanceValidationResult {
  const errors: string[] = [];

  if (!isPlainObject(raw)) {
    return { valid: false, errors: ["Dataset root must be a JSON object."] };
  }

  if (!isNonEmptyString(raw.dataset_version)) {
    errors.push("dataset_version must be a non-empty string.");
  }

  if (typeof raw.record_count !== "number" || !Number.isInteger(raw.record_count) || raw.record_count < 0) {
    errors.push("record_count must be a non-negative integer.");
  }

  validateDataDictionary(raw.data_dictionary, errors);
  validateApprovedOrganisations(raw.approved_source_organisations, errors);

  if (!Array.isArray(raw.items)) {
    errors.push("items must be an array.");
    return { valid: false, errors };
  }

  if (typeof raw.record_count === "number" && raw.record_count !== raw.items.length) {
    errors.push(`record_count (${raw.record_count}) does not match items.length (${raw.items.length}).`);
  }

  const seenExternalIds = new Map<string, number>();

  raw.items.forEach((item, index) => {
    validateItem(item, index, errors);

    if (isPlainObject(item) && isNonEmptyString(item.external_id)) {
      const firstIndex = seenExternalIds.get(item.external_id);
      if (firstIndex !== undefined) {
        errors.push(
          `Duplicate external_id "${item.external_id}" at items[${firstIndex}] and items[${index}].`
        );
      } else {
        seenExternalIds.set(item.external_id, index);
      }
    }
  });

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    dataset: raw as VerifiedGuidanceDataset,
  };
}
