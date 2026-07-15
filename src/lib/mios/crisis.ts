const CRISIS_PHRASES = [
  "i want to kill myself",
  "i want to die",
  "i may hurt myself",
  "i might hurt myself",
  "i'm thinking about suicide",
  "i am thinking about suicide",
  "thinking about suicide",
  "thinking of suicide",
  "i cannot keep myself safe",
  "i can't keep myself safe",
  "cannot keep myself safe",
  "can't keep myself safe",
  "i have a plan to end my life",
  "plan to end my life",
  "plan to kill myself",
  "self harm",
  "self-harm",
  "overdose on purpose",
  "overdose deliberately",
  "intentional overdose",
  "plan to overdose",
];

const CRISIS_PATTERNS = [
  /\bi want to die\b/i,
  /\bi want to kill myself\b/i,
  /\b(i may|i might|might|may) hurt myself\b/i,
  /\b(thinking about|thinking of) suicide\b/i,
  /\b(cannot|can't) keep myself safe\b/i,
  /\bplan to (end my life|kill myself|overdose)\b/i,
  /\bself[- ]?harm\b/i,
  /\boverdose on purpose\b/i,
  /\b(intentional|deliberate) overdose\b/i,
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bsuicid(e|al)\b/i,
];

function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isAccidentalOverdoseQuestion(question: string): boolean {
  const normalized = normalizeQuestion(question);
  const mentionsOverdose =
    /\b(too many (tablets|pills|capsules)|overdose|took too many)\b/.test(normalized) ||
    /\btoo many tablets\b/.test(normalized);
  const accidental =
    /\b(by accident|accidentally|didn't mean|did not mean|didn't mean to|did not mean to)\b/.test(
      normalized
    );
  return mentionsOverdose && accidental;
}

export function matchesCrisisLanguage(question: string): boolean {
  const normalized = normalizeQuestion(question);

  if (!normalized) {
    return false;
  }

  if (isAccidentalOverdoseQuestion(question)) {
    return false;
  }

  if (CRISIS_PHRASES.some((phrase) => normalized.includes(phrase))) {
    return true;
  }

  return CRISIS_PATTERNS.some((pattern) => pattern.test(question));
}
