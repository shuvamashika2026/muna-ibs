import { deriveInsightKey } from "@/lib/insights/insight-keys";
import type { MunaInsight } from "@/lib/insights/types";
import {
  createTimelineEvent,
  isEligibleInsightForTimeline,
  NO_CAUSATION_LIMITATION,
  TIMELINE_SAFETY_LIMITATION,
  type InsightWithKey,
  type MunaTimelineEvent,
  type TimelineEventType,
} from "@/lib/timeline/types";

function sanitizeTimelineText(text: string, maxLength = 600): string {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function buildEventSummary(insight: MunaInsight): string {
  return sanitizeTimelineText(
    `${insight.summary} ${TIMELINE_SAFETY_LIMITATION} ${NO_CAUSATION_LIMITATION}`
  );
}

function buildEventTitle(insight: MunaInsight, prefix: string): string {
  return sanitizeTimelineText(`${prefix}: ${insight.title}`, 240);
}

function parseExperimentId(insight: MunaInsight): string | null {
  const blockedOrInsufficient = insight.id.match(/^experiment-(?:insufficient|blocked)-(.+)$/);
  if (blockedOrInsufficient) {
    return blockedOrInsufficient[1];
  }

  const direct = insight.id.match(/^experiment-(.+)$/);
  return direct?.[1] ?? null;
}

function detectOverallDirection(insight: MunaInsight): "improvement" | "worsening" | "neutral" {
  const text = `${insight.title} ${insight.summary}`.toLowerCase();
  const worseningSignals = [
    "worse",
    "worsening",
    "elevated",
    "higher",
    "below goal",
    "looser",
    "urgency",
    "higher bloating",
    "below 7 hours",
  ];
  const improvementSignals = [
    "better",
    "stable",
    "goal met",
    "tolerated",
    "relatively low",
    "improv",
    "consistent",
  ];

  const worsening = worseningSignals.some((signal) => text.includes(signal));
  const improving = improvementSignals.some((signal) => text.includes(signal));

  if (worsening && !improving) return "worsening";
  if (improving && !worsening) return "improvement";
  return "neutral";
}

function eventKeyFor(type: TimelineEventType, insightKey: string, suffix?: string): string {
  return suffix ? `${type}:${insightKey}:${suffix}` : `${type}:${insightKey}`;
}

function mapFoodInsight(insight: InsightWithKey, generatedAt: string): MunaTimelineEvent | null {
  if (insight.type !== "food") return null;
  if (!/-association$/.test(insight.id) && !insight.id.includes("tolerated") && !insight.id.includes("mixed")) {
    return null;
  }

  return createTimelineEvent({
    eventKey: eventKeyFor("food_pattern", insight.insightKey),
    eventType: "food_pattern",
    title: buildEventTitle(insight, "Food pattern observed"),
    summary: buildEventSummary(insight),
    confidence: insight.confidence,
    linkedInsightKey: insight.insightKey,
    generatedAt,
  });
}

function mapHydrationInsight(insight: InsightWithKey, generatedAt: string): MunaTimelineEvent | null {
  if (insight.type !== "hydration") return null;
  if (insight.id === "hydration-no-data" || insight.id === "hydration-incomplete-logging") {
    return null;
  }

  return createTimelineEvent({
    eventKey: eventKeyFor("hydration_pattern", insight.insightKey),
    eventType: "hydration_pattern",
    title: buildEventTitle(insight, "Hydration pattern observed"),
    summary: buildEventSummary(insight),
    confidence: insight.confidence,
    linkedInsightKey: insight.insightKey,
    generatedAt,
  });
}

function mapSleepInsight(insight: InsightWithKey, generatedAt: string): MunaTimelineEvent | null {
  if (insight.type !== "sleep") return null;
  if (insight.id === "sleep-insufficient-data") return null;

  return createTimelineEvent({
    eventKey: eventKeyFor("sleep_pattern", insight.insightKey),
    eventType: "sleep_pattern",
    title: buildEventTitle(insight, "Sleep pattern observed"),
    summary: buildEventSummary(insight),
    confidence: insight.confidence,
    linkedInsightKey: insight.insightKey,
    generatedAt,
  });
}

function mapStressInsight(insight: InsightWithKey, generatedAt: string): MunaTimelineEvent | null {
  if (insight.type !== "stress") return null;
  if (insight.id === "stress-insufficient-data") return null;

  return createTimelineEvent({
    eventKey: eventKeyFor("stress_pattern", insight.insightKey),
    eventType: "stress_pattern",
    title: buildEventTitle(insight, "Stress pattern observed"),
    summary: buildEventSummary(insight),
    confidence: insight.confidence,
    linkedInsightKey: insight.insightKey,
    generatedAt,
  });
}

function mapBowelInsight(insight: InsightWithKey, generatedAt: string): MunaTimelineEvent | null {
  if (insight.type !== "bowel") return null;
  if (insight.id === "bowel-insufficient-data" || insight.id === "bowel-blocked-red-flag") {
    return null;
  }

  return createTimelineEvent({
    eventKey: eventKeyFor("bowel_pattern", insight.insightKey),
    eventType: "bowel_pattern",
    title: buildEventTitle(insight, "Bowel pattern observed"),
    summary: buildEventSummary(insight),
    confidence: insight.confidence,
    linkedInsightKey: insight.insightKey,
    generatedAt,
  });
}

function mapExperimentInsights(insight: InsightWithKey, generatedAt: string): MunaTimelineEvent[] {
  if (insight.type !== "experiment") return [];

  const experimentId = parseExperimentId(insight);
  if (!experimentId || insight.id === "experiment-none") {
    return [];
  }

  if (insight.id.startsWith("experiment-insufficient-")) {
    if (!/active/i.test(insight.summary)) {
      return [];
    }

    return [
      createTimelineEvent({
        eventKey: eventKeyFor("experiment_updated", insight.insightKey),
        eventType: "experiment_updated",
        title: buildEventTitle(insight, "Experiment updated"),
        summary: buildEventSummary(insight),
        confidence: insight.confidence,
        linkedInsightKey: insight.insightKey,
        generatedAt,
      }),
    ];
  }

  const isCompleted = /completed/i.test(insight.title) || /completed/i.test(insight.summary);
  const isActive = /in progress/i.test(insight.title) || /active/i.test(insight.summary);

  if (isCompleted) {
    return [
      createTimelineEvent({
        eventKey: eventKeyFor("experiment_completed", insight.insightKey, experimentId),
        eventType: "experiment_completed",
        title: buildEventTitle(insight, "Experiment completed"),
        summary: buildEventSummary(insight),
        confidence: insight.confidence,
        linkedInsightKey: insight.insightKey,
        generatedAt,
      }),
    ];
  }

  if (isActive) {
    return [
      createTimelineEvent({
        eventKey: eventKeyFor("experiment_started", insight.insightKey, experimentId),
        eventType: "experiment_started",
        title: buildEventTitle(insight, "Experiment started"),
        summary: buildEventSummary(insight),
        confidence: insight.confidence,
        linkedInsightKey: insight.insightKey,
        generatedAt,
      }),
    ];
  }

  return [];
}

function mapOverallInsights(insight: InsightWithKey, generatedAt: string): MunaTimelineEvent[] {
  if (insight.type !== "overall" || insight.id !== "overall-weekly-summary") {
    return [];
  }

  const events: MunaTimelineEvent[] = [
    createTimelineEvent({
      eventKey: eventKeyFor("weekly_summary", insight.insightKey),
      eventType: "weekly_summary",
      title: buildEventTitle(insight, "Weekly summary"),
      summary: buildEventSummary(insight),
      confidence: insight.confidence,
      linkedInsightKey: insight.insightKey,
      generatedAt,
    }),
  ];

  const direction = detectOverallDirection(insight);
  if (direction === "improvement") {
    events.push(
      createTimelineEvent({
        eventKey: eventKeyFor("overall_improvement", insight.insightKey),
        eventType: "overall_improvement",
        title: buildEventTitle(insight, "Overall improvement noted"),
        summary: buildEventSummary(insight),
        confidence: insight.confidence,
        linkedInsightKey: insight.insightKey,
        generatedAt,
      })
    );
  } else if (direction === "worsening") {
    events.push(
      createTimelineEvent({
        eventKey: eventKeyFor("overall_worsening", insight.insightKey),
        eventType: "overall_worsening",
        title: buildEventTitle(insight, "Overall worsening noted"),
        summary: buildEventSummary(insight),
        confidence: insight.confidence,
        linkedInsightKey: insight.insightKey,
        generatedAt,
      })
    );
  }

  return events;
}

export function mapInsightToTimelineEvents(
  insight: InsightWithKey,
  generatedAt: string
): MunaTimelineEvent[] {
  if (!isEligibleInsightForTimeline(insight)) {
    return [];
  }

  const mappers = [
    mapFoodInsight,
    mapHydrationInsight,
    mapSleepInsight,
    mapStressInsight,
    mapBowelInsight,
  ];

  const singleEvents = mappers
    .map((mapper) => mapper(insight, generatedAt))
    .filter((event): event is MunaTimelineEvent => Boolean(event));

  return [...singleEvents, ...mapExperimentInsights(insight, generatedAt), ...mapOverallInsights(insight, generatedAt)];
}

export function mapInsightsToTimelineEvents(
  insights: MunaInsight[],
  generatedAt: string
): MunaTimelineEvent[] {
  const withKeys: InsightWithKey[] = insights.map((insight) => ({
    ...insight,
    insightKey: deriveInsightKey(insight),
  }));

  const events: MunaTimelineEvent[] = [];
  for (const insight of withKeys) {
    events.push(...mapInsightToTimelineEvents(insight, generatedAt));
  }

  return dedupeTimelineEventsByKey(events);
}

export function dedupeTimelineEventsByKey(events: MunaTimelineEvent[]): MunaTimelineEvent[] {
  const seen = new Set<string>();
  const deduped: MunaTimelineEvent[] = [];

  for (const event of events) {
    if (seen.has(event.eventKey)) continue;
    seen.add(event.eventKey);
    deduped.push(event);
  }

  return deduped;
}

export function deriveEventKey(event: MunaTimelineEvent): string {
  return event.eventKey;
}
