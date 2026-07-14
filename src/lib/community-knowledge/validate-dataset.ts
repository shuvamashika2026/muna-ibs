import type {
  CommunityKnowledgeDataset,
  CommunityKnowledgeItem,
  CommunityKnowledgeValidationResult,
  CommunitySafetyRules,
  KnowledgePriority,
} from "@/lib/community-knowledge/types";

const KNOWLEDGE_PRIORITIES: KnowledgePriority[] = ["low", "moderate", "high", "critical"];
const REQUIRED_ITEM_FIELDS = [
  "external_id",
  "knowledge_type",
  "title",
  "summary",
  "priority",
  "evidence_layer",
  "symptoms",
  "triggers",
  "interventions",
  "outcomes",
  "conditions",
  "quality_of_life",
  "red_flags",
  "misinformation",
  "tags",
] as const;

const REQUIRED_STRING_ARRAY_FIELDS = [
  "symptoms",
  "triggers",
  "interventions",
  "outcomes",
  "conditions",
  "quality_of_life",
  "red_flags",
  "misinformation",
  "tags",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function validateSafetyRules(value: unknown, errors: string[]): value is CommunitySafetyRules {
  if (!isPlainObject(value)) {
    errors.push("safety_rules must be an object.");
    return false;
  }

  if (!isNonEmptyString(value.version)) {
    errors.push("safety_rules.version must be a non-empty string.");
  }

  if (!isNonEmptyString(value.principle)) {
    errors.push("safety_rules.principle must be a non-empty string.");
  }

  if (!Array.isArray(value.rules)) {
    errors.push("safety_rules.rules must be an array.");
    return false;
  }

  value.rules.forEach((rule, index) => {
    if (!isPlainObject(rule)) {
      errors.push(`safety_rules.rules[${index}] must be an object.`);
      return;
    }

    if (!isNonEmptyString(rule.id)) {
      errors.push(`safety_rules.rules[${index}].id must be a non-empty string.`);
    }

    if (!isNonEmptyString(rule.severity)) {
      errors.push(`safety_rules.rules[${index}].severity must be a non-empty string.`);
    }

    if (!isStringArray(rule.terms)) {
      errors.push(`safety_rules.rules[${index}].terms must be a string array.`);
    }

    if (!isNonEmptyString(rule.action)) {
      errors.push(`safety_rules.rules[${index}].action must be a non-empty string.`);
    }
  });

  return errors.length === 0;
}

function validateDataDictionary(value: unknown, errors: string[]): value is Record<string, string> {
  if (!isPlainObject(value)) {
    errors.push("data_dictionary must be an object.");
    return false;
  }

  if (Object.keys(value).length === 0) {
    errors.push("data_dictionary must not be empty.");
    return false;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string") {
      errors.push(`data_dictionary.${key} must be a string.`);
    }
  }

  return errors.length === 0;
}

function validateItem(item: unknown, index: number, errors: string[]): item is CommunityKnowledgeItem {
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

  if (!isNonEmptyString(item.knowledge_type)) {
    errors.push(`items[${index}].knowledge_type must be a non-empty string.`);
  }

  if (!isNonEmptyString(item.title)) {
    errors.push(`items[${index}].title must be a non-empty string.`);
  }

  if (!isNonEmptyString(item.summary)) {
    errors.push(`items[${index}].summary must be a non-empty string.`);
  }

  if (typeof item.priority !== "string" || !KNOWLEDGE_PRIORITIES.includes(item.priority as KnowledgePriority)) {
    errors.push(`items[${index}].priority must be one of: ${KNOWLEDGE_PRIORITIES.join(", ")}.`);
  }

  if (item.evidence_layer !== "community") {
    errors.push(`items[${index}].evidence_layer must be "community".`);
  }

  if (item.evidence_type !== undefined && typeof item.evidence_type !== "string") {
    errors.push(`items[${index}].evidence_type must be a string when provided.`);
  }

  if (item.confidence !== undefined && typeof item.confidence !== "string") {
    errors.push(`items[${index}].confidence must be a string when provided.`);
  }

  for (const field of REQUIRED_STRING_ARRAY_FIELDS) {
    if (!isStringArray(item[field])) {
      errors.push(`items[${index}].${field} must be a string array.`);
    }
  }

  if (item.recommended_response !== undefined && typeof item.recommended_response !== "string") {
    errors.push(`items[${index}].recommended_response must be a string when provided.`);
  }

  if (item.source_note !== undefined && typeof item.source_note !== "string") {
    errors.push(`items[${index}].source_note must be a string when provided.`);
  }

  if (item.is_active !== undefined && typeof item.is_active !== "boolean") {
    errors.push(`items[${index}].is_active must be a boolean when provided.`);
  }

  return errors.length === 0;
}

export function validateCommunityKnowledgeDataset(raw: unknown): CommunityKnowledgeValidationResult {
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

  validateSafetyRules(raw.safety_rules, errors);
  validateDataDictionary(raw.data_dictionary, errors);

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
    dataset: raw as CommunityKnowledgeDataset,
  };
}
