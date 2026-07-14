import type { SupabaseClient } from "@supabase/supabase-js";
import { dedupeTimelineEventsByKey } from "@/lib/timeline/events";
import {
  MTI_SOURCE_VERSION,
  type MunaEventRow,
  type MunaTimelineEvent,
  type TimelineEventStatus,
} from "@/lib/timeline/types";

const CURRENT_STATUSES: TimelineEventStatus[] = ["active"];

export function eventToRow(input: {
  userId: string;
  event: MunaTimelineEvent;
  sourceVersion?: string;
}): Omit<MunaEventRow, "id" | "created_at" | "updated_at"> {
  return {
    user_id: input.userId,
    event_key: input.event.eventKey,
    event_type: input.event.eventType,
    title: input.event.title.slice(0, 240),
    summary: input.event.summary.slice(0, 1200),
    confidence: input.event.confidence,
    linked_insight_key: input.event.linkedInsightKey,
    supporting_event_ids: input.event.supportingEventIds.slice(0, 8),
    status: input.event.status,
    generated_at: input.event.generatedAt,
    expires_at: input.event.expiresAt,
    source_version: input.sourceVersion ?? MTI_SOURCE_VERSION,
  };
}

export function mapEventRowToTimelineEvent(row: MunaEventRow): MunaTimelineEvent {
  return {
    eventKey: row.event_key,
    eventType: row.event_type,
    title: row.title,
    summary: row.summary,
    confidence: row.confidence,
    linkedInsightKey: row.linked_insight_key,
    supportingEventIds: Array.isArray(row.supporting_event_ids) ? row.supporting_event_ids : [],
    status: row.status,
    generatedAt: row.generated_at,
    expiresAt: row.expires_at,
  };
}

export async function supersedePriorEvent(
  supabase: SupabaseClient,
  userId: string,
  eventKey: string,
  sourceVersion = MTI_SOURCE_VERSION
): Promise<void> {
  await supabase
    .from("muna_events")
    .update({ status: "superseded", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("event_key", eventKey)
    .eq("source_version", sourceVersion)
    .in("status", CURRENT_STATUSES);
}

export async function markExpiredEventsStale(
  supabase: SupabaseClient,
  userId: string,
  nowIso = new Date().toISOString()
): Promise<void> {
  await supabase
    .from("muna_events")
    .update({ status: "stale", updated_at: nowIso })
    .eq("user_id", userId)
    .in("status", CURRENT_STATUSES)
    .lt("expires_at", nowIso);
}

export async function saveGeneratedTimelineEvents(
  supabase: SupabaseClient,
  userId: string,
  events: MunaTimelineEvent[],
  sourceVersion = MTI_SOURCE_VERSION
): Promise<MunaTimelineEvent[]> {
  await markExpiredEventsStale(supabase, userId);

  const deduped = dedupeTimelineEventsByKey(events);
  const saved: MunaTimelineEvent[] = [];

  for (const event of deduped) {
    await supersedePriorEvent(supabase, userId, event.eventKey, sourceVersion);

    const row = eventToRow({ userId, event, sourceVersion });
    const { data, error } = await supabase.from("muna_events").insert(row).select("*").single();

    if (error || !data) {
      continue;
    }

    saved.push(mapEventRowToTimelineEvent(data as MunaEventRow));
  }

  return saved;
}

export async function fetchActiveTimelineEvents(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    nowIso?: string;
    markStale?: boolean;
  }
): Promise<MunaTimelineEvent[]> {
  const nowIso = options?.nowIso ?? new Date().toISOString();

  if (options?.markStale) {
    await markExpiredEventsStale(supabase, userId, nowIso);
  }

  const { data, error } = await supabase
    .from("muna_events")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .gte("expires_at", nowIso)
    .order("generated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as MunaEventRow[]).map(mapEventRowToTimelineEvent);
}

export function applySupersedeToInMemoryEvents(
  existing: MunaTimelineEvent[],
  incoming: MunaTimelineEvent[]
): { nextActive: MunaTimelineEvent[]; preservedHistory: MunaTimelineEvent[] } {
  const incomingKeys = new Set(incoming.map((event) => event.eventKey));
  const preservedHistory = existing.map((event) =>
    incomingKeys.has(event.eventKey) ? { ...event, status: "superseded" as const } : event
  );

  const nextActive = dedupeTimelineEventsByKey(incoming).map((event) => ({
    ...event,
    status: "active" as const,
  }));

  return { nextActive, preservedHistory };
}

export function isCurrentTimelineEventStatus(status: TimelineEventStatus): boolean {
  return status === "active";
}
