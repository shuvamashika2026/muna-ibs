import type { MiosIntent } from "@/lib/mios/types";

const EMERGENCY_PHRASES = [
  "blood in stool",
  "blood in the toilet",
  "lot of blood in the toilet",
  "rectal bleeding",
  "black stool",
  "vomiting blood",
  "cannot pass gas",
  "can't pass gas",
  "unable to pass gas",
  "not passed stool",
  "have not passed stool",
  "no bowel movement for",
  "not had a bowel movement for",
  "haven't had a bowel movement for",
  "stool stuck",
  "severe constipation",
  "bowel obstruction",
  "chest pressure",
  "difficulty breathing",
  "trouble breathing",
  "shortness of breath",
  "fainting",
  "passed out",
  "loss of consciousness",
  "persistent vomiting",
  "rapid weight loss",
  "unexplained weight loss",
  "severe abdominal swelling",
  "vomiting with constipation",
];

const EXPERIMENT_PATTERNS = [
  /\bexperiment\b/i,
  /\btrial\b/i,
  /\bdid my .+ experiment\b/i,
  /\bmy .+ experiment help\b/i,
  /\breintroduction\b/i,
  /\bfood reduction test\b/i,
];

const MEDICATION_PATTERNS = [
  /\bhow much .+ (mg|mcg|milligram|microgram)\b/i,
  /\bwhat dose\b/i,
  /\bshould i (take|stop|quit|skip) (my )?(medication|medicine|prescription|pill|tablet)\b/i,
  /\b(mg|mcg)\b/i,
  /\bprescribe\b/i,
  /\bmedication dose\b/i,
];

const FOOD_PATTERNS = [
  /\bcan i eat\b/i,
  /\bis .+ safe to eat\b/i,
  /\bshould i eat\b/i,
  /\bavoid .+\b/i,
  /\b(garlic|onion|dairy|gluten|fodmap|lettuce|wheat|milk|coffee)\b/i,
  /\bfood trigger\b/i,
];

const BOWEL_PATTERNS = [
  /\b(constipation|diarrhoea|diarrhea|bristol|bowel movement|bm|stool type|loose stool|hard stool)\b/i,
  /\bpoop schedule\b/i,
  /\birregular bowel\b/i,
];

const SYMPTOM_PATTERNS = [
  /\bwhy am i bloated\b/i,
  /\bbloating\b/i,
  /\babdominal pain\b/i,
  /\bcramp(s)?\b/i,
  /\bflare\b/i,
  /\bsymptom(s)?\b/i,
  /\bwhy do i feel\b/i,
];

const EMOTIONAL_PATTERNS = [
  /\bhopeless\b/i,
  /\bworthless\b/i,
  /\bscared\b/i,
  /\banxious\b/i,
  /\bpanic(king)?\b/i,
  /\bemotional\b/i,
  /\bfeel (awful|terrible|low|down)\b/i,
  /\bi feel hopeless\b/i,
];

const EDUCATION_PATTERNS = [
  /\bwhat is ibs\b/i,
  /\bwhat is ibs-[cdmu]\b/i,
  /\bexplain ibs\b/i,
  /\bwhat does ibs mean\b/i,
  /\btypes of ibs\b/i,
  /\bwhat are fodmaps\b/i,
];

const LIFESTYLE_PATTERNS = [
  /\bstress affect\b/i,
  /\bsleep affect\b/i,
  /\bexercise affect\b/i,
  /\blifestyle\b/i,
  /\broutine\b/i,
  /\bhydration\b/i,
  /\bbrain[- ]gut\b/i,
];

function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchesEmergencyPhrase(normalizedQuestion: string): boolean {
  if (EMERGENCY_PHRASES.some((phrase) => normalizedQuestion.includes(phrase))) {
    return true;
  }

  return /\b(no|not|haven't)\b.{0,40}\bbowel movement for\b.{0,20}\b(\d+|ten|eleven|twelve|thirteen|fourteen|fifteen)\b/.test(
    normalizedQuestion
  );
}

function matchesAnyPattern(question: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(question));
}

export function detectIntent(question: string): MiosIntent {
  const normalized = normalizeQuestion(question);

  if (!normalized) {
    return "general";
  }

  if (matchesEmergencyPhrase(normalized)) {
    return "emergency";
  }

  if (matchesAnyPattern(question, EXPERIMENT_PATTERNS)) {
    return "experiment";
  }

  if (matchesAnyPattern(question, MEDICATION_PATTERNS)) {
    return "medication";
  }

  if (/\bcan i eat\b/i.test(question) || /\bshould i eat\b/i.test(question)) {
    return "food";
  }

  if (matchesAnyPattern(question, BOWEL_PATTERNS)) {
    return "bowel_habits";
  }

  if (matchesAnyPattern(question, FOOD_PATTERNS)) {
    return "food";
  }

  if (matchesAnyPattern(question, SYMPTOM_PATTERNS)) {
    return "symptoms";
  }

  if (matchesAnyPattern(question, EMOTIONAL_PATTERNS)) {
    return "emotional_support";
  }

  if (matchesAnyPattern(question, EDUCATION_PATTERNS)) {
    return "education";
  }

  if (matchesAnyPattern(question, LIFESTYLE_PATTERNS)) {
    return "lifestyle";
  }

  return "general";
}

export function isEmergencyIntent(question: string): boolean {
  return detectIntent(question) === "emergency";
}
