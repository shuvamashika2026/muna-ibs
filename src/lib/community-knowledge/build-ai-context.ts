import {
  COMMUNITY_SOURCE_LABEL,
  retrieveCommunityKnowledge,
  retrieveCommunityKnowledgeFromRows,
  type CommunityKnowledgeRetrievalRecord,
  type CommunityKnowledgeRetrievalResult,
  type CommunityKnowledgeRow,
} from "@/lib/community-knowledge/retrieval";

export const MUNA_AI_COMMUNITY_RULES = `
Authority order when answering:
1. Safety screening
2. Verified clinical guidance
3. Personal user history
4. Research evidence
5. Curated community knowledge
6. General conversation

Source wording:
- Personal observations: begin with "In your own logs..."
- Community anecdotes: begin with "Among the community experiences in MUNA's knowledge base..."
- General education: begin with "General IBS guidance suggests..."

Personal user data takes precedence over community anecdotes.
If community experiences conflict, say "Experiences vary."

Community knowledge is anecdotal. Use it only to show that other people have reported similar experiences or that experiences vary. Never present it as proof, prevalence, diagnosis, causation or treatment effectiveness.
Never use community knowledge to diagnose, prescribe, recommend medication doses, estimate prevalence, claim treatment effectiveness, impose universal food restrictions, or state that an association proves causation.
`.trim();

const AI_MAX_RECORDS = 3;
const AI_MAX_CHARACTERS = 1800;
const AI_MAX_SUMMARY_CHARS = 320;

const CAUSATION_CLAIM_PATTERN =
  /\b(proves|proven|definitely causes|always causes|guarantees|establishes causation|caused by|everyone with ibs|all people with ibs|always reacts)\b/i;

export type CommunityKnowledgeAiContext = {
  text: string;
  includedRecordCount: number;
  safetyMatched: boolean;
  safetyAction: string | null;
  retrievalFailed: boolean;
};

function joinList(values: string[]): string {
  return values.length ? values.join(", ") : "none noted";
}

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}

function formatRecordForModel(record: CommunityKnowledgeRetrievalRecord, index: number): string {
  return [
    `Record ${index + 1}:`,
    `Title: ${record.title}`,
    `Summary: ${truncateText(record.summary, AI_MAX_SUMMARY_CHARS)}`,
    `Priority: ${record.priority}`,
    `Confidence: ${record.confidence ?? "not specified"}`,
    `Matching symptoms: ${joinList(record.matchingSymptoms)}`,
    `Matching triggers: ${joinList(record.matchingTriggers)}`,
    `Matching interventions: ${joinList(record.matchingInterventions)}`,
    `Red flags: ${joinList(record.red_flags)}`,
    `Misinformation flags: ${joinList(record.misinformation)}`,
    `Recommended response tone: ${record.recommended_response ?? "not specified"}`,
    `Source label: ${COMMUNITY_SOURCE_LABEL}`,
  ].join("\n");
}

export function buildCommunityKnowledgeAiContextFromResult(
  result: CommunityKnowledgeRetrievalResult
): CommunityKnowledgeAiContext {
  if (result.internalError) {
    return {
      text: "",
      includedRecordCount: 0,
      safetyMatched: false,
      safetyAction: null,
      retrievalFailed: true,
    };
  }

  if (result.safetyMatched) {
    return {
      text: "",
      includedRecordCount: 0,
      safetyMatched: true,
      safetyAction: result.safetyAction,
      retrievalFailed: false,
    };
  }

  const records = result.records.slice(0, AI_MAX_RECORDS);
  if (!records.length) {
    return {
      text: "",
      includedRecordCount: 0,
      safetyMatched: false,
      safetyAction: null,
      retrievalFailed: false,
    };
  }

  const seenSummaries = new Set<string>();
  const blocks: string[] = [
    COMMUNITY_SOURCE_LABEL,
    'When referencing this section, begin with: "Among the community experiences in MUNA\'s knowledge base..."',
    "This material is separate from the user's personal logs and is not clinical evidence.",
    "Do not present it as proof, prevalence, diagnosis, causation, or treatment effectiveness.",
  ];

  for (const [index, record] of records.entries()) {
    const summaryKey = record.summary.trim().toLowerCase();
    if (seenSummaries.has(summaryKey)) {
      continue;
    }
    seenSummaries.add(summaryKey);
    blocks.push(formatRecordForModel(record, index));
  }

  let text = blocks.join("\n\n");
  if (text.length > AI_MAX_CHARACTERS) {
    text = `${text.slice(0, AI_MAX_CHARACTERS - 1).trim()}…`;
  }

  return {
    text,
    includedRecordCount: records.length,
    safetyMatched: false,
    safetyAction: null,
    retrievalFailed: false,
  };
}

export async function buildCommunityKnowledgeAiContext(
  queryText: string
): Promise<CommunityKnowledgeAiContext> {
  try {
    const result = await retrieveCommunityKnowledge({ queryText });
    return buildCommunityKnowledgeAiContextFromResult(result);
  } catch {
    return {
      text: "",
      includedRecordCount: 0,
      safetyMatched: false,
      safetyAction: null,
      retrievalFailed: true,
    };
  }
}

function fixtureRows(): CommunityKnowledgeRow[] {
  return [
    {
      external_id: "D003",
      title: "Community recommendations for bloating",
      summary:
        "Community recommendations for gas and bloating centred on simethicone, peppermint, ginger, heat and dietary triggers such as onion and garlic.",
      priority: "moderate",
      confidence: "low_to_moderate",
      symptoms: ["bloating", "trapped_wind"],
      triggers: ["garlic", "onion", "dairy"],
      interventions: ["peppermint_tea", "simethicone"],
      conditions: ["sibo_suggested"],
      quality_of_life: [],
      red_flags: [],
      misinformation: ["stop_eating", "miracle_doctor_spam"],
      recommended_response: "Present peppermint as commonly reported, not guaranteed.",
      tags: ["bloating", "garlic"],
      knowledge_type: "symptom_management",
      is_active: true,
    },
    {
      external_id: "D009",
      title: "Large amount of rectal bleeding with pain",
      summary: "Rectal bleeding requires medical assessment and is not explained by IBS alone.",
      priority: "critical",
      confidence: "high",
      symptoms: ["rectal_bleeding"],
      triggers: [],
      interventions: ["urgent_medical_assessment"],
      conditions: ["ibs"],
      quality_of_life: [],
      red_flags: ["large-volume_blood"],
      misinformation: ["herbal_cure_advertisement"],
      recommended_response: "Seek urgent care for heavy ongoing bleeding.",
      tags: ["rectal_bleeding", "red_flag"],
      knowledge_type: "safety_triage",
      is_active: true,
    },
    {
      external_id: "D049",
      title: "Managing IBS-D, morning urgency and anticipatory anxiety at work",
      summary: "Workplace toilet access and anticipatory anxiety intensified urgency for some people.",
      priority: "high",
      confidence: "high",
      symptoms: ["urgency", "anticipatory_anxiety", "panic"],
      triggers: ["workdays", "limited_toilet_access"],
      interventions: ["toilet_mapping", "remote_work"],
      conditions: ["ibs_d"],
      quality_of_life: ["sick_leave"],
      red_flags: [],
      misinformation: ["commercial_cure_promotion"],
      recommended_response: "Validate the brain-gut cycle and encourage practical workplace adjustments.",
      tags: ["workplace_anxiety", "morning_urgency"],
      knowledge_type: "ibs_d_workplace_anxiety",
      is_active: true,
    },
  ];
}

type VerificationCase = {
  id: string;
  run: () => boolean;
};

export function runCommunityKnowledgeAiIntegrationVerification(): {
  passed: number;
  failed: number;
  errors: string[];
} {
  const rows = fixtureRows();
  const cases: VerificationCase[] = [
    {
      id: 'A. "Garlic makes me bloated."',
      run: () => {
        const retrieval = retrieveCommunityKnowledgeFromRows(rows, {
          queryText: "Garlic makes me bloated.",
        });
        const context = buildCommunityKnowledgeAiContextFromResult(retrieval);
        return (
          !context.safetyMatched &&
          context.includedRecordCount > 0 &&
          context.text.includes(COMMUNITY_SOURCE_LABEL) &&
          context.text.includes("Among the community experiences") &&
          !context.text.includes("external_id") &&
          !CAUSATION_CLAIM_PATTERN.test(context.text)
        );
      },
    },
    {
      id: 'B. "Does everyone with IBS react to lettuce?"',
      run: () => {
        const retrieval = retrieveCommunityKnowledgeFromRows(rows, {
          queryText: "Does everyone with IBS react to lettuce?",
        });
        const context = buildCommunityKnowledgeAiContextFromResult(retrieval);
        return (
          MUNA_AI_COMMUNITY_RULES.includes("Experiences vary.") &&
          !context.text.toLowerCase().includes("everyone with ibs") &&
          !CAUSATION_CLAIM_PATTERN.test(context.text)
        );
      },
    },
    {
      id: 'C. "There is a lot of blood in the toilet."',
      run: () => {
        const retrieval = retrieveCommunityKnowledgeFromRows(rows, {
          queryText: "There is a lot of blood in the toilet.",
        });
        const context = buildCommunityKnowledgeAiContextFromResult(retrieval);
        return (
          context.safetyMatched &&
          context.safetyAction === "urgent_medical_assessment" &&
          context.text === "" &&
          context.includedRecordCount === 0
        );
      },
    },
    {
      id: "D. Community retrieval database failure",
      run: () => {
        const context = buildCommunityKnowledgeAiContextFromResult({
          safetyMatched: false,
          safetyAction: null,
          matchedThemes: [],
          records: [],
          internalError: true,
        });
        return context.retrievalFailed && context.text === "" && !context.text.includes("Supabase");
      },
    },
    {
      id: "E. No relevant community match",
      run: () => {
        const retrieval = retrieveCommunityKnowledgeFromRows(rows, {
          queryText: "What is the orbital period of Neptune?",
        });
        const context = buildCommunityKnowledgeAiContextFromResult(retrieval);
        return context.includedRecordCount === 0 && context.text === "" && !context.retrievalFailed;
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

export function estimateCommunityContextTokens(context: CommunityKnowledgeAiContext): number {
  if (!context.text) {
    return 0;
  }
  return Math.ceil(context.text.length / 4);
}
