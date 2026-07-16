/**
 * Legacy wrapper — delegates to intelligence-engine for deterministic analysis.
 */
export { runIntelligenceEngine as runRulesEngine, RULES_ENGINE_VERSION } from "@/lib/meal-analysis/intelligence-engine";
export type { IntelligenceEngineResult as RulesEngineResult } from "@/lib/meal-analysis/intelligence-engine";
