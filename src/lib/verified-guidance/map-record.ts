import type { VerifiedGuidanceImportRow, VerifiedGuidanceItem } from "@/lib/verified-guidance/types";

export function mapVerifiedGuidanceItemToRow(item: VerifiedGuidanceItem): VerifiedGuidanceImportRow {
  return {
    external_id: item.external_id,
    title: item.title,
    source_organisation: item.source_organisation,
    source_type: item.source_type,
    published_on: item.published_on,
    last_reviewed_on: item.last_reviewed_on,
    topic: item.topic,
    evidence_type: item.evidence_type,
    summary: item.summary,
    recommendation: item.recommendation,
    contraindications: item.contraindications,
    red_flags: item.red_flags,
    citation_url: item.citation_url,
    citation_title: item.citation_title,
    review_status: item.review_status,
    reviewer_note: item.reviewer_note,
    version: item.version,
    is_active: item.is_active,
    raw_record: item,
    updated_at: new Date().toISOString(),
  };
}

export function stableVerifiedImportPayload(row: VerifiedGuidanceImportRow): string {
  return JSON.stringify({
    title: row.title,
    source_organisation: row.source_organisation,
    source_type: row.source_type,
    published_on: row.published_on,
    last_reviewed_on: row.last_reviewed_on,
    topic: row.topic,
    evidence_type: row.evidence_type,
    summary: row.summary,
    recommendation: row.recommendation,
    contraindications: row.contraindications,
    red_flags: row.red_flags,
    citation_url: row.citation_url,
    citation_title: row.citation_title,
    review_status: row.review_status,
    reviewer_note: row.reviewer_note,
    version: row.version,
    is_active: row.is_active,
    raw_record: row.raw_record,
  });
}
