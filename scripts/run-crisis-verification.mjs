import { isAccidentalOverdoseQuestion, matchesCrisisLanguage } from "../src/lib/mios/crisis.ts";

function detectIntentForVerification(question) {
  const normalized = question.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return "general";
  if (isAccidentalOverdoseQuestion(question)) return "emergency";
  if (
    /\b(blood in stool|too many tablets|too many pills|feel faint|passed out)\b/.test(normalized)
  ) {
    return "emergency";
  }
  if (matchesCrisisLanguage(question)) return "crisis";
  if (/\bhopeless\b/i.test(question)) return "emotional_support";
  return "general";
}

const cases = [
  {
    id: "Hopelessness → emotional_support",
    run: () => detectIntentForVerification("I feel hopeless today") === "emotional_support",
  },
  { id: "I want to die → crisis", run: () => detectIntentForVerification("I want to die") === "crisis" },
  {
    id: "Self-harm → crisis",
    run: () => detectIntentForVerification("I might hurt myself tonight") === "crisis",
  },
  {
    id: "Accidental overdose → emergency",
    run: () => detectIntentForVerification("I took too many pills by accident and feel faint") === "emergency",
  },
  {
    id: "Intentional overdose → crisis",
    run: () => detectIntentForVerification("I plan to overdose on purpose") === "crisis",
  },
  { id: "Crisis phrase detection", run: () => matchesCrisisLanguage("I cannot keep myself safe") },
  {
    id: "Hopelessness alone is not crisis",
    run: () => !matchesCrisisLanguage("I feel hopeless today"),
  },
];

let passed = 0;
let failed = 0;
const errors = [];

for (const testCase of cases) {
  if (testCase.run()) {
    passed += 1;
  } else {
    failed += 1;
    errors.push(`${testCase.id}: assertion failed`);
  }
}

console.log(JSON.stringify({ passed, failed, errors }, null, 2));
process.exit(failed > 0 ? 1 : 0);
