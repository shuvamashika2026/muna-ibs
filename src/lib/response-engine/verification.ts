import { orchestrateMios } from "@/lib/mios/orchestrator";
import type { MiosEvidenceItem } from "@/lib/mios/types";
import { MIOS_SOURCE_LABELS } from "@/lib/mios/types";
import {
  buildFallbackStructuredOutput,
  buildStructuredOutputInstructions,
  cardsToAnswerText,
  extractJsonFromModelOutput,
  validateStructuredModelOutput,
} from "@/lib/response-engine/templates";
import {
  buildMdreSelection,
  buildMissingEvidence,
  buildUserSafeEvidenceSummary,
  mapMiosConfidenceToDisplayLabel,
  mustUseEmergencyTemplate,
  mustUseCrisisTemplate,
  selectResponseTemplate,
  shouldShowAssociationFooter,
  shouldShowConfidenceBadge,
} from "@/lib/response-engine/selector";
import type { ResponseTemplate } from "@/lib/response-engine/types";

function item(
  partial: Omit<MiosEvidenceItem, "sourceLabel"> & { source: MiosEvidenceItem["source"] }
): MiosEvidenceItem {
  return { ...partial, sourceLabel: MIOS_SOURCE_LABELS[partial.source] };
}

type VerificationCase = {
  id: string;
  run: () => boolean;
};

export function runMdreVerification(): {
  passed: number;
  failed: number;
  errors: string[];
} {
  const cases: VerificationCase[] = [
    {
      id: "A. Garlic tolerated",
      run: () => {
        const orchestration = orchestrateMios({
          currentQuestion: "Can I eat garlic?",
          personalEvidence: [
            item({
              id: "p1",
              source: "personal_history",
              title: "Garlic tolerance",
              summary: "Garlic logged on days without elevated symptoms.",
              confidence: "moderate",
              relevance: "high",
              limitations: [],
              isAvailable: true,
              topics: ["garlic"],
            }),
          ],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [],
          communityEvidence: [
            item({
              id: "c1",
              source: "community",
              title: "Garlic reports",
              summary: "Some community members report garlic as a possible trigger.",
              confidence: "limited",
              relevance: "moderate",
              limitations: [],
              isAvailable: true,
            }),
          ],
          safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
        });
        const selection = buildMdreSelection({ orchestration, urgentSafety: false });
        const evidence = buildUserSafeEvidenceSummary(orchestration);
        return (
          selection.template === "food" &&
          evidence.personal.available &&
          orchestration.responsePlan.experiencesVaryNote === "Experiences vary." &&
          shouldShowConfidenceBadge(selection.template)
        );
      },
    },
    {
      id: "B. Bloating with missing water log",
      run: () => {
        const selection = buildMdreSelection({
          orchestration: orchestrateMios({
            currentQuestion: "Why am I bloated?",
            personalEvidence: [],
            experimentEvidence: [],
            verifiedGuidanceEvidence: [],
            communityEvidence: [],
            safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
          }),
          urgentSafety: false,
        });
        const instructions = buildStructuredOutputInstructions(selection.template, null);
        return (
          selection.template === "symptoms" &&
          instructions.includes('Say "no water entry recorded" when water is not logged')
        );
      },
    },
    {
      id: "C. Blood in toilet + weakness",
      run: () => {
        const selection = buildMdreSelection({
          orchestration: orchestrateMios({
            currentQuestion: "There is blood in the toilet and I feel weak",
            personalEvidence: [],
            experimentEvidence: [],
            verifiedGuidanceEvidence: [],
            communityEvidence: [],
            safetyResult: {
              safetyMatched: true,
              safetyAction: "urgent_medical_assessment",
              matchedThemes: ["rectal_bleeding_or_black_stool"],
            },
          }),
          urgentSafety: true,
        });
        return (
          selection.template === "emergency" &&
          !shouldShowConfidenceBadge(selection.template) &&
          !shouldShowAssociationFooter(selection.template, selection.safetyStatus)
        );
      },
    },
    {
      id: "D. Medication tablets for diarrhoea",
      run: () => {
        const selection = buildMdreSelection({
          orchestration: orchestrateMios({
            currentQuestion: "How many tablets should I take for diarrhoea?",
            personalEvidence: [],
            experimentEvidence: [],
            verifiedGuidanceEvidence: [],
            communityEvidence: [],
            safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
          }),
          urgentSafety: false,
        });
        const instructions = buildStructuredOutputInstructions(selection.template, null);
        return (
          selection.template === "medication" &&
          instructions.includes("Never provide a dose") &&
          !shouldShowConfidenceBadge(selection.template)
        );
      },
    },
    {
      id: "E. Onion experiment",
      run: () => {
        const selection = buildMdreSelection({
          orchestration: orchestrateMios({
            currentQuestion: "Did my onion experiment help?",
            personalEvidence: [],
            experimentEvidence: [
              item({
                id: "e1",
                source: "experiment",
                title: "Onion experiment",
                summary: "Completed observation with 5 check-ins; does not establish causation.",
                confidence: "moderate",
                relevance: "high",
                limitations: ["No causation claim."],
                isAvailable: true,
              }),
            ],
            verifiedGuidanceEvidence: [],
            communityEvidence: [],
            safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
          }),
          urgentSafety: false,
        });
        const instructions = buildStructuredOutputInstructions(selection.template, null);
        return (
          selection.template === "experiment" &&
          instructions.includes("Never claim the experiment proved causation") &&
          shouldShowConfidenceBadge(selection.template)
        );
      },
    },
    {
      id: "F. Emotional distress",
      run: () => {
        const selection = buildMdreSelection({
          orchestration: orchestrateMios({
            currentQuestion: "I feel hopeless and overwhelmed by my IBS",
            personalEvidence: [],
            experimentEvidence: [],
            verifiedGuidanceEvidence: [],
            communityEvidence: [],
            safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
          }),
          urgentSafety: false,
        });
        const definition = buildStructuredOutputInstructions(selection.template, null);
        return (
          selection.template === "emotional_support" &&
          !definition.includes("Possible Pattern") &&
          definition.includes("Do not label supportive suggestions as a possible pattern")
        );
      },
    },
    {
      id: "G. Encouragement",
      run: () => {
        const emotional = selectResponseTemplate({
          intent: "emotional_support",
          safetyStatus: "none",
        });
        const general = selectResponseTemplate({ intent: "general", safetyStatus: "none" });
        return (
          (emotional === "emotional_support" || general === "general") &&
          !shouldShowConfidenceBadge(emotional)
        );
      },
    },
    {
      id: "I. safetyStatus matched forces emergency template",
      run: () =>
        selectResponseTemplate({ intent: "symptoms", safetyStatus: "matched" }) === "emergency",
    },
    {
      id: "J. safetyStatus critical forces emergency template",
      run: () =>
        selectResponseTemplate({ intent: "general", safetyStatus: "critical" }) === "emergency",
    },
    {
      id: "K. emergency intent forces emergency template",
      run: () =>
        selectResponseTemplate({ intent: "emergency", safetyStatus: "none" }) === "emergency",
    },
    {
      id: "L. urgentSafety with null orchestration forces emergency template",
      run: () => {
        const selection = buildMdreSelection({ orchestration: null, urgentSafety: true });
        return selection.template === "emergency" && selection.intent === "emergency";
      },
    },
    {
      id: "M. mustUseEmergencyTemplate blocks general fallback",
      run: () => {
        const cases = [
          mustUseEmergencyTemplate({ intent: "symptoms", safetyStatus: "matched" }),
          mustUseEmergencyTemplate({ intent: "food", safetyStatus: "critical" }),
          mustUseEmergencyTemplate({ intent: "emergency", safetyStatus: "none" }),
          mustUseEmergencyTemplate({ intent: "general", safetyStatus: "none", urgentSafety: true }),
        ];
        return cases.every(Boolean);
      },
    },
    {
      id: "N. Hopelessness → emotional_support template",
      run: () => {
        const selection = buildMdreSelection({
          orchestration: orchestrateMios({
            currentQuestion: "I feel hopeless today",
            personalEvidence: [],
            experimentEvidence: [],
            verifiedGuidanceEvidence: [],
            communityEvidence: [],
            safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
          }),
          urgentSafety: false,
        });
        return selection.template === "emotional_support" && selection.intent === "emotional_support";
      },
    },
    {
      id: "O. I want to die → crisis template and status",
      run: () => {
        const selection = buildMdreSelection({
          orchestration: orchestrateMios({
            currentQuestion: "I want to die",
            personalEvidence: [],
            experimentEvidence: [],
            verifiedGuidanceEvidence: [],
            communityEvidence: [],
            safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
          }),
          urgentSafety: false,
        });
        return (
          selection.template === "crisis" &&
          selection.intent === "crisis" &&
          selection.safetyStatus === "crisis" &&
          !selection.showConfidenceBadge
        );
      },
    },
    {
      id: "P. Self-harm wording → crisis template",
      run: () =>
        selectResponseTemplate({ intent: "crisis", safetyStatus: "crisis" }) === "crisis" &&
        mustUseCrisisTemplate({ intent: "crisis", safetyStatus: "crisis" }),
    },
    {
      id: "Q. Accidental overdose remains emergency",
      run: () => {
        const selection = buildMdreSelection({
          orchestration: orchestrateMios({
            currentQuestion: "I took too many pills by accident and feel faint",
            personalEvidence: [],
            experimentEvidence: [],
            verifiedGuidanceEvidence: [],
            communityEvidence: [],
            safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
          }),
          urgentSafety: false,
        });
        return selection.template === "emergency" && selection.intent === "emergency";
      },
    },
    {
      id: "R. Crisis mode excludes routine IBS instructions",
      run: () => {
        const instructions = buildStructuredOutputInstructions(
          "crisis",
          orchestrateMios({
            currentQuestion: "I might hurt myself tonight",
            personalEvidence: [],
            experimentEvidence: [],
            verifiedGuidanceEvidence: [],
            communityEvidence: [],
            safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
          })
        );
        return (
          instructions.includes("No IBS advice") &&
          instructions.includes("empty array") &&
          !shouldShowAssociationFooter("crisis", "crisis") &&
          !shouldShowConfidenceBadge("crisis")
        );
      },
    },
    {
      id: "S. Crisis evidence summary stays empty",
      run: () => {
        const orchestration = orchestrateMios({
          currentQuestion: "I want to die",
          personalEvidence: [
            item({
              id: "p1",
              source: "personal_history",
              title: "Logs",
              summary: "Should not surface",
              confidence: "moderate",
              relevance: "high",
              limitations: [],
              isAvailable: true,
            }),
          ],
          experimentEvidence: [],
          verifiedGuidanceEvidence: [],
          communityEvidence: [],
          safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
        });
        const summary = buildUserSafeEvidenceSummary(orchestration);
        return (
          !summary.personal.available &&
          !summary.community.available &&
          buildMissingEvidence(orchestration).length === 0
        );
      },
    },
    {
      id: "H. Malformed model JSON",
      run: () => {
        const template: ResponseTemplate = "food";
        const invalid = validateStructuredModelOutput({ cards: [] }, template);
        const parsed = extractJsonFromModelOutput("not json at all");
        const fallback = buildFallbackStructuredOutput(template, "Safe fallback answer.");
        const duplicate = validateStructuredModelOutput(
          {
            cards: [
              { key: "food_observation", title: "Food Observation", content: "Same text" },
              { key: "evidence_used", title: "Evidence Used", content: "Same text" },
              { key: "confidence", title: "Confidence", content: "Different" },
              { key: "one_next_step", title: "One Next Step", content: "Another" },
            ],
            followUps: [],
          },
          template
        );
        return (
          invalid === null &&
          parsed === null &&
          fallback.cards.length === 4 &&
          cardsToAnswerText(fallback.cards).includes("Safe fallback answer") &&
          duplicate === null
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

  try {
    const orchestration = orchestrateMios({
      currentQuestion: "Can I eat garlic?",
      personalEvidence: [],
      experimentEvidence: [],
      verifiedGuidanceEvidence: [],
      communityEvidence: [],
      safetyResult: { safetyMatched: false, safetyAction: null, matchedThemes: [] },
    });
    buildMissingEvidence(orchestration);
    mapMiosConfidenceToDisplayLabel("limited");
    passed += 1;
  } catch (error) {
    failed += 1;
    errors.push(`Metadata helpers: ${error instanceof Error ? error.message : "unexpected error"}`);
  }

  return { passed, failed, errors };
}
