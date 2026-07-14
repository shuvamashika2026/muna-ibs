import { mapInsightsToTimelineEvents } from "@/lib/timeline/events";
import {
  buildSummaryCounts,
  type TimelineGenerationInput,
  type TimelineGenerationOutput,
} from "@/lib/timeline/types";

export function generateTimelineEvents(input: TimelineGenerationInput): TimelineGenerationOutput {
  const generatedAt =
    input.generatedAt ??
    input.insights.find((insight) => insight.generatedAt)?.generatedAt ??
    new Date().toISOString();

  const allEvents = mapInsightsToTimelineEvents(input.insights, generatedAt);
  const activeTimeline = allEvents.filter((event) => event.status === "active");

  return {
    allEvents,
    activeTimeline,
    summaryCounts: buildSummaryCounts(allEvents),
  };
}
