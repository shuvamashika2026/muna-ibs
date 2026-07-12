export type ConfidenceLevel = "Limited" | "Moderate" | "Higher";

export type ParsedAiResponse = {
  introduction: string | null;
  keyObservation: string | null;
  possiblePattern: string | null;
  nextStep: string | null;
  encouragement: string | null;
  confidence: ConfidenceLevel;
  rawContent: string;
};

const PATTERN_HINTS = [
  "may be associated",
  "might be",
  "pattern",
  "appears alongside",
  "appears in",
  "often",
  "sometimes",
  "trigger",
  "linked",
  "correlat",
  "alongside",
];

const NEXT_STEP_HINTS = [
  "try ",
  "consider ",
  "next step",
  "you could",
  "log ",
  "track ",
  "drink ",
  "walk ",
  "practice ",
  "start by",
  "focus on",
  "tonight",
  "today",
];

const ENCOURAGEMENT_HINTS = [
  "hope",
  "proud",
  "together",
  "gentle",
  "you're doing",
  "you are doing",
  "small step",
  "be kind",
  "listen to your body",
];

const GREETING_HINTS = ["hello", "hi ", "hey", "understand", "hear you", "thank you for sharing"];

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function includesAny(text: string, hints: string[]): boolean {
  const lower = text.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
}

export function inferConfidence(content: string): ConfidenceLevel {
  const lower = content.toLowerCase();

  if (
    lower.includes("higher confidence") ||
    lower.includes("confidence: higher") ||
    lower.includes("data confidence") && lower.includes("higher")
  ) {
    return "Higher";
  }

  if (
    lower.includes("moderate confidence") ||
    lower.includes("confidence: moderate") ||
    (lower.includes("data confidence") && lower.includes("moderate"))
  ) {
    return "Moderate";
  }

  if (
    lower.includes("low confidence") ||
    lower.includes("confidence: low") ||
    lower.includes("limited data") ||
    lower.includes("insufficient") ||
    lower.includes("not enough logged") ||
    lower.includes("not logged")
  ) {
    return "Limited";
  }

  return "Moderate";
}

function isDisclaimer(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return (
    lower.includes("educational only") ||
    lower.includes("not a diagnosis") ||
    lower.includes("healthcare professional") ||
    lower.includes("consult a")
  );
}

function isGreeting(sentence: string): boolean {
  return includesAny(sentence, GREETING_HINTS) && sentence.length < 180;
}

export function parseAiResponse(content: string): ParsedAiResponse {
  const paragraphs = splitParagraphs(content);
  const sentences = splitSentences(content);
  const confidence = inferConfidence(content);

  const introduction =
    sentences.find((sentence) => isGreeting(sentence)) ??
    (paragraphs[0] && paragraphs[0].length < 160 ? paragraphs[0] : null);

  const patternSentences = sentences.filter(
    (sentence) => includesAny(sentence, PATTERN_HINTS) && !isDisclaimer(sentence)
  );
  const nextStepSentences = sentences.filter(
    (sentence) => includesAny(sentence, NEXT_STEP_HINTS) && !isDisclaimer(sentence)
  );
  const encouragementSentences = sentences.filter(
    (sentence) => includesAny(sentence, ENCOURAGEMENT_HINTS) && !isDisclaimer(sentence)
  );

  const used = new Set<string>();
  if (introduction) used.add(introduction);
  patternSentences.forEach((sentence) => used.add(sentence));
  nextStepSentences.forEach((sentence) => used.add(sentence));
  encouragementSentences.forEach((sentence) => used.add(sentence));

  const observationSentences = sentences.filter(
    (sentence) =>
      !used.has(sentence) &&
      !isDisclaimer(sentence) &&
      (sentence.length > 24 || includesAny(sentence, ["logged", "your ", "sleep", "stress", "symptom", "meal", "water", "bristol"]))
  );

  const possiblePattern = patternSentences.slice(0, 2).join(" ") || null;
  const nextStep = nextStepSentences.slice(-1)[0] ?? null;

  let encouragement: string | null =
    encouragementSentences.slice(-1)[0] ??
    sentences.filter((sentence) => !isDisclaimer(sentence)).slice(-1)[0] ??
    null;

  if (encouragement && isDisclaimer(encouragement)) {
    encouragement = null;
  }

  let keyObservation = observationSentences.slice(0, 2).join(" ") || null;

  if (!keyObservation && paragraphs.length > 0) {
    const fallbackParagraph =
      paragraphs.find((paragraph) => paragraph !== introduction && !includesAny(paragraph, PATTERN_HINTS)) ??
      paragraphs[0];
    keyObservation = fallbackParagraph ?? null;
  }

  if (!possiblePattern && paragraphs.length > 2) {
    const middle = paragraphs[Math.floor(paragraphs.length / 2)];
    if (middle && middle !== keyObservation) {
      return {
        introduction,
        keyObservation,
        possiblePattern: middle,
        nextStep: nextStep ?? paragraphs[paragraphs.length - 2] ?? null,
        encouragement,
        confidence,
        rawContent: content,
      };
    }
  }

  return {
    introduction,
    keyObservation,
    possiblePattern,
    nextStep,
    encouragement,
    confidence,
    rawContent: content,
  };
}

export function buildFollowUpSuggestions(userQuestion: string, answer: string): string[] {
  const lower = `${userQuestion} ${answer}`.toLowerCase();
  const suggestions: string[] = [];

  if (lower.includes("bloat")) suggestions.push("What usually helps with bloating?");
  if (lower.includes("stress")) suggestions.push("Give me a 2-minute calm-down idea");
  if (lower.includes("sleep")) suggestions.push("How can I sleep better tonight?");
  if (lower.includes("food") || lower.includes("meal") || lower.includes("eat")) {
    suggestions.push("What gentle foods could I try next?");
  }
  if (lower.includes("stool") || lower.includes("bowel") || lower.includes("bristol")) {
    suggestions.push("What does my bowel pattern suggest?");
  }
  if (lower.includes("trigger")) suggestions.push("Help me spot possible trigger patterns");

  suggestions.push("What should I log next?");
  suggestions.push("Can you explain that more simply?");

  return Array.from(new Set(suggestions)).slice(0, 4);
}
