import type { ExperimentTargetType } from "@/lib/experiment-engine";

export const EXPERIMENT_SAFETY_STATEMENT =
  "MUNA experiments are for gentle self-observation only. Do not stop prescribed medication, avoid major food groups, fast, or test known allergens without qualified professional guidance.";

const MEDICATION_PATTERN =
  /\b(stop|stopping|quit|change|changing|skip|skipping|reduce|reducing|without)\b.{0,30}\b(medication|medicine|medicines|prescription|prescribed|pill|pills|tablet|tablets|dose|dosage)\b|\b(medication|medicine|prescription)\b.{0,20}\b(change|stop|quit)\b/i;

const FASTING_PATTERN = /\b(fast|fasting|skip all meals|no food|only water|starve|starvation)\b/i;

const ALLERGEN_PATTERN =
  /\b(peanut|peanuts|tree nut|nuts allergy|shellfish|seafood allergy|egg allergy|soy allergy|fish allergy|wheat allergy|dairy allergy|lactose allergy|anaphylaxis|known allergen)\b/i;

const MULTI_FOOD_PATTERN =
  /\b(and|&|\+|,|\/| plus )\b.*\b(onion|garlic|dairy|gluten|wheat|milk|coffee|beans|lentils|fodmap)\b|\b(eliminate|remove|avoid|cut out)\b.{0,20}\b(all|every|multiple|several|many)\b/i;

const SEVERE_RESTRICTION_PATTERN =
  /\b(eliminate all|remove all|cut out everything|avoid everything|only rice water|severe restriction|complete elimination|zero food)\b/i;

const MULTI_ITEM_SEPARATOR = /,|\/|\+|\band\b|\bplus\b/i;

export function validateExperimentProposal(input: {
  target_type: ExperimentTargetType;
  target_label: string;
  hypothesis?: string | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const label = input.target_label.trim();
  const hypothesis = (input.hypothesis ?? "").trim();
  const combined = `${label} ${hypothesis}`.trim();

  if (!label) {
    errors.push("Enter one clear target label.");
  }

  if (label.length > 120) {
    errors.push("Keep the target label short and focused on one item or habit.");
  }

  if (MEDICATION_PATTERN.test(combined)) {
    errors.push("Experiments cannot involve prescribed medication changes.");
  }

  if (FASTING_PATTERN.test(combined)) {
    errors.push("Experiments cannot involve fasting or skipping all meals.");
  }

  if (ALLERGEN_PATTERN.test(combined)) {
    errors.push("Experiments cannot involve testing known allergens.");
  }

  if (SEVERE_RESTRICTION_PATTERN.test(combined)) {
    errors.push("Experiments cannot involve severe restriction or eliminating many foods.");
  }

  if (
    (input.target_type === "food_reduction" || input.target_type === "food_reintroduction") &&
    MULTI_ITEM_SEPARATOR.test(label)
  ) {
    errors.push("Test one food at a time. Multi-food elimination is not supported in Version 1.");
  }

  if (MULTI_FOOD_PATTERN.test(combined)) {
    errors.push("Experiments cannot involve multi-food elimination.");
  }

  return { valid: errors.length === 0, errors };
}

export type AdherenceChoice = "yes" | "partly" | "no";

export function mapAdherenceToStoredValue(choice: AdherenceChoice): {
  adhered: boolean | null;
  notePrefix: string;
} {
  if (choice === "yes") return { adhered: true, notePrefix: "Plan followed: yes." };
  if (choice === "partly") return { adhered: null, notePrefix: "Plan followed: partly." };
  return { adhered: false, notePrefix: "Plan followed: no." };
}
