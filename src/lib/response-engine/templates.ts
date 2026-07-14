import type { MiosOrchestratorResult } from "@/lib/mios/types";
import type {
  ResponseTemplate,
  ResponseTemplateDefinition,
  StructuredModelOutput,
  StructuredResponseCard,
  TemplateCardDefinition,
} from "@/lib/response-engine/types";

export const RESPONSE_TEMPLATES: Record<ResponseTemplate, ResponseTemplateDefinition> = {
  emergency: {
    template: "emergency",
    cards: [
      { key: "safety_alert", title: "Safety Alert" },
      { key: "why_this_matters", title: "Why This Matters" },
      { key: "what_to_do_now", title: "What To Do Now" },
      { key: "medical_reminder", title: "Medical Reminder" },
    ],
  },
  medication: {
    template: "medication",
    cards: [
      { key: "medication_safety", title: "Medication Safety" },
      { key: "why_no_dose", title: "Why I Cannot Give a Dose" },
      { key: "safe_next_step", title: "Safe Next Step" },
      { key: "support", title: "Support" },
    ],
  },
  food: {
    template: "food",
    cards: [
      { key: "food_observation", title: "Food Observation" },
      { key: "evidence_used", title: "Evidence Used" },
      { key: "confidence", title: "Confidence" },
      { key: "one_next_step", title: "One Next Step" },
    ],
  },
  symptoms: {
    template: "symptoms",
    cards: [
      { key: "symptom_summary", title: "Symptom Summary" },
      { key: "possible_pattern", title: "Possible Pattern" },
      { key: "confidence_limitations", title: "Confidence and Limitations" },
      { key: "one_next_step", title: "One Next Step" },
    ],
  },
  experiment: {
    template: "experiment",
    cards: [
      { key: "experiment_summary", title: "Experiment Summary" },
      { key: "evidence", title: "Evidence" },
      { key: "confidence", title: "Confidence" },
      { key: "next_experiment_step", title: "Next Experiment Step" },
    ],
  },
  emotional_support: {
    template: "emotional_support",
    cards: [
      { key: "i_hear_you", title: "I Hear You" },
      { key: "gentle_perspective", title: "Gentle Perspective" },
      { key: "one_small_step", title: "One Small Step" },
      { key: "support", title: "Support" },
    ],
  },
  education: {
    template: "education",
    cards: [
      { key: "explanation", title: "Explanation" },
      { key: "key_facts", title: "Key Facts" },
      { key: "reviewed_guidance", title: "Reviewed Guidance" },
      { key: "learn_more", title: "Learn More" },
    ],
  },
  bowel_habits: {
    template: "bowel_habits",
    cards: [
      { key: "bowel_pattern", title: "Bowel Pattern" },
      { key: "possible_contributors", title: "Possible Contributors" },
      { key: "confidence_limitations", title: "Confidence and Limitations" },
      { key: "one_next_step", title: "One Next Step" },
    ],
  },
  lifestyle: {
    template: "lifestyle",
    cards: [
      { key: "lifestyle_observation", title: "Lifestyle Observation" },
      { key: "possible_connection", title: "Possible Connection" },
      { key: "confidence_limitations", title: "Confidence and Limitations" },
      { key: "one_next_step", title: "One Next Step" },
    ],
  },
  general: {
    template: "general",
    cards: [
      { key: "response", title: "Response" },
      { key: "helpful_context", title: "Helpful Context" },
      { key: "one_next_step", title: "One Next Step" },
      { key: "encouragement", title: "Encouragement" },
    ],
  },
};

export function getTemplateDefinition(template: ResponseTemplate): ResponseTemplateDefinition {
  return RESPONSE_TEMPLATES[template];
}

export function getExpectedCardKeys(template: ResponseTemplate): string[] {
  return RESPONSE_TEMPLATES[template].cards.map((card) => card.key);
}

function templateBehaviourNotes(template: ResponseTemplate): string[] {
  switch (template) {
    case "emergency":
      return [
        "Urgent medical assessment is needed today for concerning symptoms.",
        "Direct the user to emergency services or an emergency department when heavy bleeding, fainting, severe weakness, breathing difficulty, or rapidly worsening symptoms are present.",
        "Do not use a country-specific emergency phone number.",
        "MUNA cannot determine the cause through chat.",
        "No routine IBS advice, food suggestions, supplements, experiments, lifestyle tips, or anecdotal reassurance.",
      ];
    case "medication":
      return [
        "Never provide a dose, tablet count, or schedule.",
        "Direct the user to the medicine label, prescriber, or pharmacist.",
        "Screen for persistent diarrhoea, blood, fever, dehydration, severe pain, or recent antibiotics and escalate if present.",
      ];
    case "food":
      return [
        'Begin personal observations with "In your own logs..."',
        'Use "Among the community experiences in MUNA\'s knowledge base..." for community anecdotes.',
        'If evidence conflicts, include "Experiences vary."',
        "Distinguish personal evidence, reviewed guidance, and community experience.",
        "Quantify only when verified counts exist in the context.",
      ];
    case "symptoms":
      return [
        'Say "no water entry recorded" when water is not logged — never say water intake was zero.',
        'Prefer "possible association in your current records" over "moderate association".',
        'If data is insufficient: "I don\'t have enough personal information yet to identify a reliable pattern."',
      ];
    case "experiment":
      return [
        "Show counts only when available in experiment evidence.",
        "Never claim the experiment proved causation.",
      ];
    case "emotional_support":
      return [
        "Empathy first.",
        "Do not label supportive suggestions as a possible pattern.",
        "Give one small achievable action.",
        "Escalate appropriately if self-harm language appears.",
      ];
    case "education":
      return [
        'Use "According to reviewed clinical guidance..." only when verified guidance is available.',
        "Keep explanations accessible and non-diagnostic.",
      ];
    default:
      return [];
  }
}

export function buildStructuredOutputInstructions(
  template: ResponseTemplate,
  orchestration: MiosOrchestratorResult | null
): string {
  const definition = getTemplateDefinition(template);
  const cardSpec = definition.cards
    .map((card) => `    { "key": "${card.key}", "title": "${card.title}", "content": "..." }`)
    .join(",\n");

  const plan = orchestration?.responsePlan;
  const behaviour = templateBehaviourNotes(template);

  const lines = [
    "",
    "Structured response format (mandatory):",
    "Return ONLY valid JSON with exactly this shape — no markdown fences, no prose outside JSON:",
    "{",
    '  "cards": [',
    cardSpec,
    "  ],",
    '  "followUps": ["short follow-up question 1", "short follow-up question 2"]',
    "}",
    "",
    "Card rules:",
    "- Exactly 4 cards with the keys and titles shown above.",
    "- Each content field: 1–3 concise sentences, warm and human, no markdown headings.",
    "- No duplicate text across cards.",
    "- No empty card content.",
    "- followUps: 1–3 short suggested questions.",
  ];

  if (plan) {
    lines.push(
      "",
      `Selected template: ${template}`,
      `Detected intent: ${plan.intent}`,
      `Safety status: ${plan.safetyStatus}`,
      `Direct answer goal: ${plan.directAnswerGoal}`,
      `Primary evidence source: ${plan.primaryEvidenceSource ?? "none"}`,
      `Confidence level: ${plan.confidence}`,
      `Suggested next step: ${plan.oneNextStep}`,
      ...(plan.experiencesVaryNote ? [`Required conflict wording: ${plan.experiencesVaryNote}`] : []),
      ...(plan.safetyMessage ? [`Safety message: ${plan.safetyMessage}`] : [])
    );
  }

  if (behaviour.length) {
    lines.push("", "Template behaviour:", ...behaviour.map((note) => `- ${note}`));
  }

  return lines.join("\n");
}

export function buildJsonRepairInstructions(
  template: ResponseTemplate,
  invalidOutput: string
): string {
  const keys = getExpectedCardKeys(template).join(", ");
  return [
    "Your previous response was not valid JSON matching the required card template.",
    `Return ONLY corrected JSON with exactly 4 cards using keys: ${keys}.`,
    "Each card needs non-empty content. No markdown fences. No duplicate text.",
    "Invalid output preview:",
    invalidOutput.slice(0, 400),
  ].join("\n");
}

export function cardsToAnswerText(cards: StructuredResponseCard[]): string {
  return cards.map((card) => card.content.trim()).filter(Boolean).join("\n\n");
}

export function normalizeStructuredCards(
  template: ResponseTemplate,
  cards: StructuredResponseCard[]
): StructuredResponseCard[] {
  const definition = getTemplateDefinition(template);
  return definition.cards.map((expected, index) => {
    const match =
      cards.find((card) => card.key === expected.key) ??
      cards[index];
    return {
      key: expected.key,
      title: expected.title,
      content: match?.content?.trim() ?? "",
    };
  });
}

export function validateStructuredModelOutput(
  data: unknown,
  template: ResponseTemplate
): StructuredModelOutput | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.cards)) {
    return null;
  }

  const expectedKeys = getExpectedCardKeys(template);
  const definition = getTemplateDefinition(template);
  const parsedCards: StructuredResponseCard[] = [];

  for (const expected of definition.cards) {
    const match = record.cards.find(
      (item) =>
        item &&
        typeof item === "object" &&
        "key" in item &&
        (item as { key: unknown }).key === expected.key
    ) as { key?: string; title?: string; content?: string } | undefined;

    if (!match || typeof match.content !== "string" || !match.content.trim()) {
      return null;
    }

    parsedCards.push({
      key: expected.key,
      title: expected.title,
      content: match.content.trim(),
    });
  }

  const contents = parsedCards.map((card) => card.content.toLowerCase());
  if (new Set(contents).size !== contents.length) {
    return null;
  }

  if (parsedCards.some((card) => !expectedKeys.includes(card.key))) {
    return null;
  }

  const followUps = Array.isArray(record.followUps)
    ? record.followUps
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim())
        .slice(0, 3)
    : [];

  return { cards: parsedCards, followUps };
}

export function extractJsonFromModelOutput(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      return null;
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  return null;
}

export function buildFallbackStructuredOutput(
  template: ResponseTemplate,
  fallbackText: string
): StructuredModelOutput {
  const definition = getTemplateDefinition(template);
  const trimmed = fallbackText.trim() || "I could not format this response safely. Please try asking again in a moment.";

  return {
    cards: [
      {
        key: definition.cards[0].key,
        title: definition.cards[0].title,
        content: trimmed,
      },
      ...definition.cards.slice(1).map((card) => ({
        key: card.key,
        title: card.title,
        content: "Please ask a follow-up if you would like more detail.",
      })),
    ],
    followUps: ["Can you explain that more simply?"],
  };
}

export function getCardIconKey(template: ResponseTemplate, cardKey: TemplateCardDefinition["key"]): string {
  if (template === "emergency") {
    if (cardKey === "safety_alert") return "alert";
    if (cardKey === "what_to_do_now") return "action";
    return "shield";
  }
  if (cardKey.includes("confidence")) return "confidence";
  if (cardKey.includes("evidence") || cardKey.includes("pattern") || cardKey.includes("contributor")) {
    return "compass";
  }
  if (cardKey.includes("next") || cardKey.includes("step")) return "route";
  if (cardKey.includes("support") || cardKey.includes("encouragement") || cardKey.includes("hear")) {
    return "heart";
  }
  return "lightbulb";
}
