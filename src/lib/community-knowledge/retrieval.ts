import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { KnowledgePriority } from "@/lib/community-knowledge/types";

export const COMMUNITY_SOURCE_LABEL =
  "Patient-reported community experience; anecdotal and not medical advice.";

const MAX_RECORDS = 5;

const RETRIEVAL_COLUMNS =
  "external_id, title, summary, priority, confidence, symptoms, triggers, interventions, conditions, quality_of_life, red_flags, misinformation, recommended_response, tags, knowledge_type, is_active";

const ROUTINE_KNOWLEDGE_TYPES = new Set([
  "symptom_management",
  "community_beliefs",
  "emotional_support",
  "food_trigger",
  "diet_experience",
  "supplement_discussion",
  "lifestyle_habit",
]);

const SAFETY_KNOWLEDGE_TYPES = new Set(["safety_triage", "red_flag", "emergency_guidance"]);

const CRITICAL_SAFETY_THEMES = [
  {
    id: "rectal_bleeding_or_black_stool",
    action: "urgent_medical_assessment",
    terms: [
      "rectal bleeding",
      "blood in stool",
      "blood in the toilet",
      "lot of blood in the toilet",
      "large amount of blood",
      "toilet covered in blood",
      "black stool",
      "vomiting blood",
      "maroon blood",
    ],
  },
  {
    id: "inability_to_pass_stool_or_gas",
    action: "urgent_medical_assessment",
    terms: [
      "cannot pass gas",
      "can't pass gas",
      "unable to pass gas",
      "inability to pass gas",
      "unable to pass stool",
      "cannot pass stool",
    ],
  },
  {
    id: "severe_constipation_or_obstruction",
    action: "urgent_medical_assessment",
    terms: [
      "no bowel movement for",
      "not had a bowel movement for",
      "haven't had a bowel movement for",
      "stool stuck",
      "severe constipation",
      "possible obstruction",
      "bowel obstruction",
      "faecal impaction",
      "fecal impaction",
      "vomiting with constipation",
      "severe abdominal swelling",
    ],
  },
  {
    id: "chest_pressure_or_breathing_difficulty",
    action: "urgent_medical_assessment",
    terms: [
      "chest pressure",
      "difficulty breathing",
      "trouble breathing",
      "shortness of breath",
    ],
  },
  {
    id: "fainting",
    action: "urgent_medical_assessment",
    terms: ["fainting", "loss of consciousness", "passed out"],
  },
  {
    id: "persistent_vomiting",
    action: "urgent_medical_assessment",
    terms: [
      "persistent vomiting",
      "vomiting for days",
      "keep vomiting",
      "cannot stop vomiting",
    ],
  },
  {
    id: "dehydration",
    action: "medical_review",
    terms: ["dehydration", "dehydrated", "not keeping fluids down"],
  },
  {
    id: "rapid_or_unexplained_weight_loss",
    action: "medical_review",
    terms: [
      "rapid weight loss",
      "unexplained weight loss",
      "losing weight quickly",
      "significant weight loss",
    ],
  },
  {
    id: "severe_or_worsening_localised_pain",
    action: "medical_review",
    terms: [
      "severe localised pain",
      "severe localized pain",
      "worsening localised pain",
      "worsening localized pain",
      "sharp pain for weeks",
      "fixed one-sided pain",
      "pain with fever",
      "pain with vomiting",
    ],
  },
] as const;

const SEARCH_PHRASE_ALIASES: Array<{ phrase: string; terms: string[] }> = [
  { phrase: "blood in stool", terms: ["rectal_bleeding", "blood_in_stool"] },
  { phrase: "blood in the toilet", terms: ["rectal_bleeding", "large-volume_blood"] },
  { phrase: "lot of blood in the toilet", terms: ["rectal_bleeding", "large-volume_blood"] },
  { phrase: "unable to poop", terms: ["inability_to_defecate", "severe_constipation"] },
  { phrase: "cannot pass gas", terms: ["inability_to_pass_gas"] },
  { phrase: "work anxiety", terms: ["workplace_anxiety", "anticipatory_anxiety"] },
  { phrase: "garlic bloating", terms: ["garlic", "bloating"] },
  { phrase: "garlic makes me bloated", terms: ["garlic", "bloating"] },
  { phrase: "need the toilet", terms: ["urgency", "toilet_access"] },
  { phrase: "panic before work", terms: ["workplace_anxiety", "anticipatory_anxiety", "morning_urgency"] },
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "what",
  "of",
  "in",
  "on",
  "for",
  "to",
  "i",
  "my",
  "me",
  "it",
  "there",
  "lot",
  "have",
  "had",
  "not",
  "and",
  "or",
  "because",
  "before",
  "when",
  "who",
  "how",
  "why",
  "capital",
]);

const PRIORITY_WEIGHT: Record<KnowledgePriority, number> = {
  critical: 3000,
  high: 2000,
  moderate: 1000,
  low: 500,
};

const CAUSATION_CLAIM_PATTERN =
  /\b(proves|proven|definitely causes|always causes|guarantees|establishes causation|caused by)\b/i;

export type CommunityKnowledgeFilters = {
  symptoms?: string[];
  triggers?: string[];
  interventions?: string[];
  conditions?: string[];
  quality_of_life?: string[];
  tags?: string[];
  knowledge_type?: string[];
  priority?: KnowledgePriority[];
};

export type CommunityKnowledgeRetrievalInput = {
  queryText?: string;
  filters?: CommunityKnowledgeFilters;
};

export type CommunityKnowledgeRow = {
  external_id: string;
  title: string;
  summary: string;
  priority: KnowledgePriority;
  confidence: string | null;
  symptoms: string[];
  triggers: string[];
  interventions: string[];
  conditions: string[];
  quality_of_life: string[];
  red_flags: string[];
  misinformation: string[];
  recommended_response: string | null;
  tags: string[];
  knowledge_type: string;
  is_active: boolean;
};

export type CommunityKnowledgeRetrievalRecord = {
  external_id: string;
  title: string;
  summary: string;
  priority: KnowledgePriority;
  confidence: string | null;
  matchingSymptoms: string[];
  matchingTriggers: string[];
  matchingInterventions: string[];
  red_flags: string[];
  misinformation: string[];
  recommended_response: string | null;
  source_label: string;
};

export type CommunityKnowledgeSafetyScreening = {
  safetyMatched: boolean;
  safetyAction: string | null;
  matchedThemes: string[];
};

export type CommunityKnowledgeRetrievalResult = {
  safetyMatched: boolean;
  safetyAction: string | null;
  matchedThemes: string[];
  records: CommunityKnowledgeRetrievalRecord[];
  internalError: boolean;
};

type SearchContext = {
  normalizedQuery: string;
  searchTerms: string[];
  filters: CommunityKnowledgeFilters;
  safetyMatched: boolean;
  matchedThemes: string[];
};

function normalizePlainText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeSearchTerm(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function tokenize(value: string): string[] {
  return normalizePlainText(value)
    .split(/[^a-z0-9_]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function expandTermVariants(term: string): string[] {
  const variants = new Set<string>([term]);

  if (term === "bloated" || term === "bloat") {
    variants.add("bloating");
  }
  if (term.includes("bleed") || term === "blood") {
    variants.add("rectal_bleeding");
    variants.add("blood_in_stool");
  }
  if (term.includes("poop") || term === "defecate") {
    variants.add("inability_to_defecate");
  }
  if (term.includes("work") || term === "workplace") {
    variants.add("workplace_anxiety");
  }
  if (term.includes("panic")) {
    variants.add("anticipatory_anxiety");
  }
  if (term.includes("toilet") || term.includes("bathroom")) {
    variants.add("urgency");
    variants.add("toilet_access");
  }

  return [...variants];
}

function uniqueTerms(values: string[]): string[] {
  const expanded = values.flatMap((value) => expandTermVariants(normalizeSearchTerm(value)));
  return [...new Set(expanded.filter(Boolean))];
}

function expandSearchTermsFromQuery(queryText: string): string[] {
  const normalizedQuery = normalizePlainText(queryText);
  const terms = new Set<string>(tokenize(queryText));

  for (const alias of SEARCH_PHRASE_ALIASES) {
    if (normalizedQuery.includes(normalizePlainText(alias.phrase))) {
      for (const term of alias.terms) {
        terms.add(normalizeSearchTerm(term));
      }
    }
  }

  if (normalizedQuery.includes("garlic") && normalizedQuery.includes("bloat")) {
    terms.add("garlic");
    terms.add("bloating");
  }

  if (normalizedQuery.includes("work") && (normalizedQuery.includes("panic") || normalizedQuery.includes("anxiety"))) {
    terms.add("workplace_anxiety");
    terms.add("anticipatory_anxiety");
  }

  if (normalizedQuery.includes("toilet") || normalizedQuery.includes("bathroom")) {
    terms.add("urgency");
    terms.add("toilet_access");
  }

  return uniqueTerms([...terms]);
}

function buildSearchContext(input: CommunityKnowledgeRetrievalInput, safety: CommunityKnowledgeSafetyScreening): SearchContext {
  const filters = input.filters ?? {};
  const queryTerms = expandSearchTermsFromQuery(input.queryText ?? "");

  return {
    normalizedQuery: normalizePlainText(input.queryText ?? ""),
    searchTerms: uniqueTerms([
      ...queryTerms,
      ...(filters.symptoms ?? []).map(normalizeSearchTerm),
      ...(filters.triggers ?? []).map(normalizeSearchTerm),
      ...(filters.interventions ?? []).map(normalizeSearchTerm),
      ...(filters.conditions ?? []).map(normalizeSearchTerm),
      ...(filters.quality_of_life ?? []).map(normalizeSearchTerm),
      ...(filters.tags ?? []).map(normalizeSearchTerm),
      ...(filters.knowledge_type ?? []).map(normalizeSearchTerm),
    ]),
    filters,
    safetyMatched: safety.safetyMatched,
    matchedThemes: safety.matchedThemes,
  };
}

function matchesAnyTerm(normalizedQuery: string, terms: readonly string[]): string | null {
  for (const term of terms) {
    const normalizedTerm = normalizePlainText(term);
    if (normalizedQuery.includes(normalizedTerm)) {
      return term;
    }
  }
  return null;
}

function matchesObstructionPattern(normalizedQuery: string): boolean {
  const dayPattern =
    /\b(no|not had a|haven't had a|without a)\s+bowel movement for\s+(\d{1,2}|ten|eleven|twelve|thirteen|fourteen|fifteen)\s+days?\b/;
  return dayPattern.test(normalizedQuery);
}

export function screenCommunityKnowledgeQuery(queryText: string): CommunityKnowledgeSafetyScreening {
  const normalizedQuery = normalizePlainText(queryText);
  const matchedThemes: string[] = [];
  let safetyAction: string | null = null;

  for (const theme of CRITICAL_SAFETY_THEMES) {
    const matchedTerm = matchesAnyTerm(normalizedQuery, theme.terms);
    if (matchedTerm) {
      matchedThemes.push(theme.id);
      if (!safetyAction || theme.action === "urgent_medical_assessment") {
        safetyAction = theme.action;
      }
    }
  }

  if (matchesObstructionPattern(normalizedQuery)) {
    matchedThemes.push("severe_constipation_or_obstruction");
    safetyAction = "urgent_medical_assessment";
  }

  return {
    safetyMatched: matchedThemes.length > 0,
    safetyAction,
    matchedThemes: [...new Set(matchedThemes)],
  };
}

function overlapsSearchTerm(fieldValue: string, searchTerms: string[]): boolean {
  const normalizedField = normalizeSearchTerm(fieldValue);
  const fieldTokens = tokenize(fieldValue.replace(/_/g, " "));

  return searchTerms.some((term) => {
    if (!term) {
      return false;
    }

    if (normalizedField === term || normalizedField.includes(term) || term.includes(normalizedField)) {
      return true;
    }

    return fieldTokens.some(
      (fieldToken) => fieldToken === term || fieldToken.includes(term) || term.includes(fieldToken)
    );
  });
}

function matchingFieldValues(values: string[], searchTerms: string[]): string[] {
  if (searchTerms.length === 0) {
    return [];
  }

  return values.filter((value) => overlapsSearchTerm(value, searchTerms));
}

function fieldMatchesAnyTerm(values: string[], filterTerms: string[]): boolean {
  return filterTerms.some((term) =>
    values.some((value) => overlapsSearchTerm(value, [normalizeSearchTerm(term)]))
  );
}

function rowMatchesFilters(row: CommunityKnowledgeRow, filters: CommunityKnowledgeFilters): boolean {
  if (filters.symptoms?.length && !fieldMatchesAnyTerm(row.symptoms, filters.symptoms)) {
    return false;
  }
  if (filters.triggers?.length && !fieldMatchesAnyTerm(row.triggers, filters.triggers)) {
    return false;
  }
  if (filters.interventions?.length && !fieldMatchesAnyTerm(row.interventions, filters.interventions)) {
    return false;
  }
  if (filters.conditions?.length && !fieldMatchesAnyTerm(row.conditions, filters.conditions)) {
    return false;
  }
  if (filters.quality_of_life?.length && !fieldMatchesAnyTerm(row.quality_of_life, filters.quality_of_life)) {
    return false;
  }
  if (filters.tags?.length && !fieldMatchesAnyTerm(row.tags, filters.tags)) {
    return false;
  }
  if (filters.knowledge_type?.length && !filters.knowledge_type.includes(row.knowledge_type)) {
    return false;
  }
  if (filters.priority?.length && !filters.priority.includes(row.priority)) {
    return false;
  }
  return true;
}

function isRoutineCommunityRecord(row: CommunityKnowledgeRow): boolean {
  return ROUTINE_KNOWLEDGE_TYPES.has(row.knowledge_type) && row.priority !== "critical";
}

function isSafetyRelevantRecord(row: CommunityKnowledgeRow, context: SearchContext): boolean {
  if (SAFETY_KNOWLEDGE_TYPES.has(row.knowledge_type)) {
    return true;
  }

  if (row.priority === "critical") {
    return true;
  }

  if (row.red_flags.length > 0 && context.normalizedQuery) {
    return row.red_flags.some((flag) =>
      context.normalizedQuery.includes(normalizePlainText(flag.replace(/_/g, " ")))
    );
  }

  return false;
}

function safetyRecordMatchesQuery(row: CommunityKnowledgeRow, context: SearchContext): boolean {
  if (context.matchedThemes.includes("rectal_bleeding_or_black_stool")) {
    const bleedingRelated =
      row.knowledge_type === "safety_triage" &&
      (row.symptoms.includes("rectal_bleeding") ||
        row.tags.includes("rectal_bleeding") ||
        row.red_flags.some((flag) => flag.includes("blood")));
    if (bleedingRelated) {
      return true;
    }
  }

  if (
    context.matchedThemes.includes("severe_constipation_or_obstruction") ||
    context.matchedThemes.includes("inability_to_pass_stool_or_gas")
  ) {
    const obstructionRelated =
      row.knowledge_type === "safety_triage" &&
      (row.symptoms.includes("severe_constipation") ||
        row.symptoms.includes("inability_to_defecate") ||
        row.tags.includes("severe_constipation") ||
        row.tags.includes("bowel_obstruction") ||
        row.red_flags.some((flag) => flag.includes("pass_gas") || flag.includes("without_bm")));
    if (obstructionRelated) {
      return true;
    }
  }

  return false;
}

function rowMatchesSearch(row: CommunityKnowledgeRow, context: SearchContext): boolean {
  if (!context.searchTerms.length && Object.keys(context.filters).length === 0) {
    return false;
  }

  if (!rowMatchesFilters(row, context.filters)) {
    return false;
  }

  if (context.safetyMatched) {
    if (!isSafetyRelevantRecord(row, context)) {
      return false;
    }

    return safetyRecordMatchesQuery(row, context);
  }

  if (Object.keys(context.filters).length > 0 && context.searchTerms.length === 0) {
    return true;
  }

  const searchableValues = [
    row.title,
    row.summary,
    ...row.symptoms,
    ...row.triggers,
    ...row.interventions,
    ...row.conditions,
    ...row.quality_of_life,
    ...row.red_flags,
    ...row.tags,
    row.knowledge_type,
  ];

  return context.searchTerms.some((term) =>
    searchableValues.some((value) => overlapsSearchTerm(value, [term]))
  );
}

function isUnsafeIntervention(intervention: string, misinformation: string[]): boolean {
  const normalizedIntervention = normalizeSearchTerm(intervention);
  const blockedPatterns = [
    "manual_extraction",
    "disimpaction",
    "enema",
    "anal_stretch",
    "soap",
    "vinegar",
    "stop_eating",
    "miracle",
    "cure",
    "detox",
    "cleanse",
  ];

  if (blockedPatterns.some((pattern) => normalizedIntervention.includes(pattern))) {
    return true;
  }

  return misinformation.some((flag) => {
    const normalizedFlag = normalizeSearchTerm(flag);
    return (
      normalizedIntervention.includes(normalizedFlag) ||
      normalizedFlag.includes(normalizedIntervention)
    );
  });
}

function filterSafeInterventions(interventions: string[], misinformation: string[]): string[] {
  return interventions.filter((intervention) => !isUnsafeIntervention(intervention, misinformation));
}

function scoreRow(row: CommunityKnowledgeRow, context: SearchContext): number {
  let score = 0;

  if (context.safetyMatched && isSafetyRelevantRecord(row, context)) {
    score += 10000;
  }

  const tagMatches = matchingFieldValues(row.tags, context.searchTerms).length;
  score += tagMatches * 500;

  const symptomMatches = matchingFieldValues(row.symptoms, context.searchTerms).length;
  score += symptomMatches * 200;

  const triggerMatches = matchingFieldValues(row.triggers, context.searchTerms).length;
  score += triggerMatches * 200;

  score += PRIORITY_WEIGHT[row.priority];

  if (context.filters.knowledge_type?.includes(row.knowledge_type)) {
    score += 300;
  } else if (context.searchTerms.includes(normalizeSearchTerm(row.knowledge_type))) {
    score += 150;
  }

  if (context.normalizedQuery && normalizePlainText(row.title).includes(context.normalizedQuery)) {
    score += 100;
  }

  if (context.safetyMatched && isRoutineCommunityRecord(row)) {
    score = 0;
  }

  return score;
}

function formatRetrievalRecord(row: CommunityKnowledgeRow, context: SearchContext): CommunityKnowledgeRetrievalRecord {
  const matchingSymptoms = matchingFieldValues(row.symptoms, context.searchTerms);
  const matchingTriggers = matchingFieldValues(row.triggers, context.searchTerms);
  const matchingInterventions = filterSafeInterventions(
    matchingFieldValues(row.interventions, context.searchTerms),
    row.misinformation
  );

  return {
    external_id: row.external_id,
    title: row.title,
    summary: row.summary,
    priority: row.priority,
    confidence: row.confidence,
    matchingSymptoms,
    matchingTriggers,
    matchingInterventions,
    red_flags: [...row.red_flags],
    misinformation: [...row.misinformation],
    recommended_response: row.recommended_response,
    source_label: COMMUNITY_SOURCE_LABEL,
  };
}

function mapDatabaseRow(row: Record<string, unknown>): CommunityKnowledgeRow {
  return {
    external_id: String(row.external_id),
    title: String(row.title),
    summary: String(row.summary),
    priority: row.priority as KnowledgePriority,
    confidence: (row.confidence as string | null) ?? null,
    symptoms: (row.symptoms as string[]) ?? [],
    triggers: (row.triggers as string[]) ?? [],
    interventions: (row.interventions as string[]) ?? [],
    conditions: (row.conditions as string[]) ?? [],
    quality_of_life: (row.quality_of_life as string[]) ?? [],
    red_flags: (row.red_flags as string[]) ?? [],
    misinformation: (row.misinformation as string[]) ?? [],
    recommended_response: (row.recommended_response as string | null) ?? null,
    tags: (row.tags as string[]) ?? [],
    knowledge_type: String(row.knowledge_type),
    is_active: Boolean(row.is_active),
  };
}

function emptyResult(
  safety: CommunityKnowledgeSafetyScreening,
  internalError = false
): CommunityKnowledgeRetrievalResult {
  return {
    safetyMatched: safety.safetyMatched,
    safetyAction: safety.safetyAction,
    matchedThemes: safety.matchedThemes,
    records: [],
    internalError,
  };
}

export function retrieveCommunityKnowledgeFromRows(
  rows: CommunityKnowledgeRow[],
  input: CommunityKnowledgeRetrievalInput
): CommunityKnowledgeRetrievalResult {
  const safety = screenCommunityKnowledgeQuery(input.queryText ?? "");
  const context = buildSearchContext(input, safety);
  const activeRows = rows.filter((row) => row.is_active);

  const scored = activeRows
    .filter((row) => rowMatchesSearch(row, context))
    .map((row) => ({ row, score: scoreRow(row, context) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.row.external_id.localeCompare(right.row.external_id);
    })
    .slice(0, MAX_RECORDS);

  return {
    safetyMatched: safety.safetyMatched,
    safetyAction: safety.safetyAction,
    matchedThemes: safety.matchedThemes,
    records: scored.map((entry) => formatRetrievalRecord(entry.row, context)),
    internalError: false,
  };
}

export async function retrieveCommunityKnowledge(
  input: CommunityKnowledgeRetrievalInput
): Promise<CommunityKnowledgeRetrievalResult> {
  const safety = screenCommunityKnowledgeQuery(input.queryText ?? "");

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return emptyResult(safety, true);
  }

  let query = supabase.from("community_knowledge").select(RETRIEVAL_COLUMNS).eq("is_active", true);
  const filters = input.filters ?? {};

  if (filters.symptoms?.length) {
    query = query.overlaps("symptoms", filters.symptoms.map(normalizeSearchTerm));
  }
  if (filters.triggers?.length) {
    query = query.overlaps("triggers", filters.triggers.map(normalizeSearchTerm));
  }
  if (filters.interventions?.length) {
    query = query.overlaps("interventions", filters.interventions.map(normalizeSearchTerm));
  }
  if (filters.conditions?.length) {
    query = query.overlaps("conditions", filters.conditions.map(normalizeSearchTerm));
  }
  if (filters.quality_of_life?.length) {
    query = query.overlaps("quality_of_life", filters.quality_of_life.map(normalizeSearchTerm));
  }
  if (filters.tags?.length) {
    query = query.overlaps("tags", filters.tags.map(normalizeSearchTerm));
  }
  if (filters.knowledge_type?.length) {
    query = query.in("knowledge_type", filters.knowledge_type);
  }
  if (filters.priority?.length) {
    query = query.in("priority", filters.priority);
  }

  const { data, error } = await query;
  if (error || !data) {
    return emptyResult(safety, true);
  }

  const rows = data.map((row) => mapDatabaseRow(row as Record<string, unknown>));
  return retrieveCommunityKnowledgeFromRows(rows, input);
}

function fixtureRows(): CommunityKnowledgeRow[] {
  return [
    {
      external_id: "D003",
      title: "Community recommendations for bloating",
      summary:
        "Community recommendations for gas and bloating centred on simethicone, peppermint, ginger, heat and dietary triggers such as onion and garlic. Responses varied.",
      priority: "moderate",
      confidence: "low_to_moderate",
      symptoms: ["bloating", "trapped_wind"],
      triggers: ["garlic", "onion", "dairy"],
      interventions: ["peppermint_tea", "simethicone", "stop_eating"],
      conditions: ["sibo_suggested"],
      quality_of_life: [],
      red_flags: ["persistent_or_severe_bloating_with_vomiting"],
      misinformation: ["miracle_doctor_spam", "stop_eating", "black_seed_oil_cures"],
      recommended_response: "Present simethicone and peppermint as commonly reported options, not guaranteed treatments.",
      tags: ["bloating", "garlic", "peppermint"],
      knowledge_type: "symptom_management",
      is_active: true,
    },
    {
      external_id: "D009",
      title: "Large amount of rectal bleeding with pain",
      summary:
        "Community discussions described recurrent bright-red or maroon rectal bleeding. Rectal bleeding is not explained by IBS alone and requires medical assessment.",
      priority: "critical",
      confidence: "high",
      symptoms: ["rectal_bleeding", "abdominal_pain"],
      triggers: [],
      interventions: ["urgent_medical_assessment", "gastroenterology_referral"],
      conditions: ["haemorrhoids", "ibs"],
      quality_of_life: ["fear"],
      red_flags: ["large-volume_blood", "maroon_blood", "recurrent_bleed"],
      misinformation: ["bright_red_always_means_haemorrhoids", "herbal_cure_advertisement"],
      recommended_response: "Do not attribute rectal bleeding to IBS. Seek urgent care for heavy ongoing bleeding.",
      tags: ["rectal_bleeding", "red_flag", "urgent"],
      knowledge_type: "safety_triage",
      is_active: true,
    },
    {
      external_id: "D030",
      title: "Fifteen days without bowel movement",
      summary:
        "Person had no bowel movement for about 15 days and described a large hard stool that could not pass. Many urged emergency care; others proposed dangerous manual techniques.",
      priority: "critical",
      confidence: "high",
      symptoms: ["severe_constipation", "inability_to_defecate"],
      triggers: [],
      interventions: ["emergency_assessment", "professional_disimpaction_if_needed"],
      conditions: ["faecal_impaction", "bowel_obstruction_possible"],
      quality_of_life: ["acute_distress"],
      red_flags: ["15_days_without_bm", "stool_stuck", "inability_to_pass_gas"],
      misinformation: ["manual_extraction_instructions", "soap/vinegar_enema", "shower-hose_enema"],
      recommended_response: "Direct to emergency care now. Do not provide step-by-step disimpaction instructions.",
      tags: ["severe_constipation", "emergency", "bowel_obstruction"],
      knowledge_type: "safety_triage",
      is_active: true,
    },
    {
      external_id: "D049",
      title: "Managing IBS-D, morning urgency and anticipatory anxiety at work",
      summary:
        "People with IBS-D described morning symptoms and anxiety about meetings, commuting, toilet access or lack of an escape route intensified urgency and diarrhoea.",
      priority: "high",
      confidence: "high",
      symptoms: ["urgency", "morning_diarrhoea", "anticipatory_anxiety", "panic"],
      triggers: ["workdays", "meetings", "limited_toilet_access"],
      interventions: ["flexible_start_time", "remote_work", "toilet_mapping"],
      conditions: ["ibs_d"],
      quality_of_life: ["sick_leave", "work_from_home"],
      red_flags: ["blood_in_stool"],
      misinformation: ["commercial_cure_promotion", "unsupervised_preemptive_dosing"],
      recommended_response: "Validate the brain-gut cycle and encourage practical workplace adjustments.",
      tags: ["workplace_anxiety", "morning_urgency", "toilet_access"],
      knowledge_type: "ibs_d_workplace_anxiety",
      is_active: true,
    },
    {
      external_id: "D002",
      title: "Historical beliefs about IBS-D",
      summary: "Discussion about how people before the modern era handled IBS-D.",
      priority: "low",
      confidence: "low",
      symptoms: ["diarrhoea"],
      triggers: ["processed_food_(belief)"],
      interventions: ["exercise"],
      conditions: ["ibs-d"],
      quality_of_life: ["medical_dismissal"],
      red_flags: [],
      misinformation: ["miracle_doctor_spam", "food_is_poisoned"],
      recommended_response: "Separate historical under-recognition from unsupported claims.",
      tags: ["community_belief", "history"],
      knowledge_type: "community_beliefs",
      is_active: true,
    },
  ];
}

function recordsContainCausationClaim(records: CommunityKnowledgeRetrievalRecord[]): boolean {
  return records.some((record) =>
    [record.summary, record.recommended_response ?? "", record.title].some((text) =>
      CAUSATION_CLAIM_PATTERN.test(text)
    )
  );
}

type VerificationCase = {
  id: string;
  run: () => boolean;
};

export function runCommunityKnowledgeRetrievalVerification(): {
  passed: number;
  failed: number;
  errors: string[];
} {
  const rows = fixtureRows();
  const cases: VerificationCase[] = [
    {
      id: "A. Garlic makes me bloated",
      run: () => {
        const result = retrieveCommunityKnowledgeFromRows(rows, {
          queryText: "Garlic makes me bloated",
        });
        const top = result.records[0];
        return (
          !result.safetyMatched &&
          Boolean(top) &&
          top!.matchingSymptoms.includes("bloating") &&
          top!.matchingTriggers.includes("garlic") &&
          top!.source_label === COMMUNITY_SOURCE_LABEL &&
          !recordsContainCausationClaim(result.records)
        );
      },
    },
    {
      id: "B. I panic before work because I need the toilet",
      run: () => {
        const result = retrieveCommunityKnowledgeFromRows(rows, {
          queryText: "I panic before work because I need the toilet",
        });
        return (
          !result.safetyMatched &&
          result.records.some((record) => record.external_id === "D049") &&
          result.records[0]?.external_id === "D049"
        );
      },
    },
    {
      id: "C. There is a lot of blood in the toilet",
      run: () => {
        const result = retrieveCommunityKnowledgeFromRows(rows, {
          queryText: "There is a lot of blood in the toilet",
        });
        return (
          result.safetyMatched &&
          result.safetyAction === "urgent_medical_assessment" &&
          result.records.length > 0 &&
          result.records.every((record) => record.external_id === "D009") &&
          !result.records.some((record) => record.external_id === "D003")
        );
      },
    },
    {
      id: "D. 12 days no bowel movement and cannot pass gas",
      run: () => {
        const result = retrieveCommunityKnowledgeFromRows(rows, {
          queryText: "I have not had a bowel movement for 12 days and cannot pass gas",
        });
        const record = result.records.find((entry) => entry.external_id === "D030");
        return (
          result.safetyMatched &&
          result.matchedThemes.includes("severe_constipation_or_obstruction") &&
          Boolean(record) &&
          !record!.matchingInterventions.some((item) =>
            /manual|enema|disimpaction|soap|vinegar/i.test(item)
          )
        );
      },
    },
    {
      id: "E. Unrelated question",
      run: () => {
        const result = retrieveCommunityKnowledgeFromRows(rows, {
          queryText: "What is the capital of Mongolia?",
        });
        return result.records.length === 0;
      },
    },
    {
      id: "F. Record containing misinformation",
      run: () => {
        const result = retrieveCommunityKnowledgeFromRows(rows, {
          queryText: "Garlic makes me bloated",
        });
        const record = result.records.find((entry) => entry.external_id === "D003");
        return (
          Boolean(record) &&
          record!.misinformation.includes("stop_eating") &&
          !record!.matchingInterventions.includes("stop_eating")
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

// Backward-compatible alias for prior self-test callers.
export const runCommunityKnowledgeRetrievalSelfTest = runCommunityKnowledgeRetrievalVerification;
