import type {
  CommunityKnowledgeImportRow,
  CommunityKnowledgeItem,
} from "@/lib/community-knowledge/types";

export function mapCommunityKnowledgeItemToRow(
  item: CommunityKnowledgeItem,
  datasetVersion: string
): CommunityKnowledgeImportRow {
  return {
    external_id: item.external_id,
    dataset_version: datasetVersion,
    knowledge_type: item.knowledge_type,
    title: item.title,
    summary: item.summary,
    priority: item.priority,
    evidence_layer: item.evidence_layer,
    evidence_type: item.evidence_type ?? null,
    confidence: item.confidence ?? null,
    symptoms: item.symptoms,
    triggers: item.triggers,
    interventions: item.interventions,
    outcomes: item.outcomes,
    conditions: item.conditions,
    quality_of_life: item.quality_of_life,
    red_flags: item.red_flags,
    misinformation: item.misinformation,
    recommended_response: item.recommended_response ?? null,
    tags: item.tags,
    source_note: item.source_note ?? null,
    is_active: item.is_active ?? true,
    raw_record: item,
    updated_at: new Date().toISOString(),
  };
}

export function stableImportPayload(row: CommunityKnowledgeImportRow): string {
  return JSON.stringify({
    dataset_version: row.dataset_version,
    knowledge_type: row.knowledge_type,
    title: row.title,
    summary: row.summary,
    priority: row.priority,
    evidence_layer: row.evidence_layer,
    evidence_type: row.evidence_type,
    confidence: row.confidence,
    symptoms: row.symptoms,
    triggers: row.triggers,
    interventions: row.interventions,
    outcomes: row.outcomes,
    conditions: row.conditions,
    quality_of_life: row.quality_of_life,
    red_flags: row.red_flags,
    misinformation: row.misinformation,
    recommended_response: row.recommended_response,
    tags: row.tags,
    source_note: row.source_note,
    is_active: row.is_active,
    raw_record: row.raw_record,
  });
}
