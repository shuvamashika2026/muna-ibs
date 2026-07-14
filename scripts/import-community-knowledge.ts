import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { mapCommunityKnowledgeItemToRow, stableImportPayload } from "@/lib/community-knowledge/map-record";
import { validateCommunityKnowledgeDataset } from "@/lib/community-knowledge/validate-dataset";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const DEFAULT_DATASET_PATHS = [
  "data/community/MUNA_IBS_Merged_Knowledge_v3.json",
  "data/community/MUNA_IBS_Merged_Knowledge_v3.json.json",
];

type ImportCounts = {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
};

function loadLocalEnvFiles() {
  for (const filename of [".env.local", ".env"]) {
    const filePath = resolve(process.cwd(), filename);
    if (!existsSync(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function resolveDatasetPath(args: string[]): string {
  const fileFlagIndex = args.findIndex((arg) => arg === "--file");
  if (fileFlagIndex !== -1) {
    const providedPath = args[fileFlagIndex + 1];
    if (!providedPath) {
      throw new Error("Missing value for --file.");
    }
    return resolve(process.cwd(), providedPath);
  }

  for (const relativePath of DEFAULT_DATASET_PATHS) {
    const candidate = resolve(process.cwd(), relativePath);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Community knowledge dataset not found. Pass --file <path> or place the file at ${DEFAULT_DATASET_PATHS.join(" or ")}.`
  );
}

function readDataset(filePath: string): unknown {
  try {
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Malformed JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

async function importCommunityKnowledge(filePath: string): Promise<ImportCounts> {
  const parsed = readDataset(filePath);
  const validation = validateCommunityKnowledgeDataset(parsed);

  if (!validation.valid) {
    console.error("Community knowledge validation failed. No database writes were performed.");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return { inserted: 0, updated: 0, skipped: 0, failed: validation.errors.length };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    console.error(
      "Supabase service client is unavailable. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing."
    );
    process.exitCode = 1;
    return { inserted: 0, updated: 0, skipped: 0, failed: validation.dataset.items.length };
  }

  const counts: ImportCounts = { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  const { dataset } = validation;
  const externalIds = dataset.items.map((item) => item.external_id);

  const { data: existingRows, error: existingError } = await supabase
    .from("community_knowledge")
    .select("external_id, dataset_version, knowledge_type, title, summary, priority, evidence_layer, evidence_type, confidence, symptoms, triggers, interventions, outcomes, conditions, quality_of_life, red_flags, misinformation, recommended_response, tags, source_note, is_active, raw_record")
    .in("external_id", externalIds);

  if (existingError) {
    console.error(`Failed to read existing community knowledge rows: ${existingError.message}`);
    process.exitCode = 1;
    return { inserted: 0, updated: 0, skipped: 0, failed: dataset.items.length };
  }

  const existingByExternalId = new Map(
    (existingRows ?? []).map((row) => [String(row.external_id), row as Record<string, unknown>])
  );

  for (const item of dataset.items) {
    const row = mapCommunityKnowledgeItemToRow(item, dataset.dataset_version);
    const existing = existingByExternalId.get(item.external_id);

    if (existing) {
      const existingComparable = stableImportPayload({
        external_id: String(existing.external_id),
        dataset_version: String(existing.dataset_version),
        knowledge_type: String(existing.knowledge_type),
        title: String(existing.title),
        summary: String(existing.summary),
        priority: row.priority,
        evidence_layer: "community",
        evidence_type: (existing.evidence_type as string | null) ?? null,
        confidence: (existing.confidence as string | null) ?? null,
        symptoms: (existing.symptoms as string[]) ?? [],
        triggers: (existing.triggers as string[]) ?? [],
        interventions: (existing.interventions as string[]) ?? [],
        outcomes: (existing.outcomes as string[]) ?? [],
        conditions: (existing.conditions as string[]) ?? [],
        quality_of_life: (existing.quality_of_life as string[]) ?? [],
        red_flags: (existing.red_flags as string[]) ?? [],
        misinformation: (existing.misinformation as string[]) ?? [],
        recommended_response: (existing.recommended_response as string | null) ?? null,
        tags: (existing.tags as string[]) ?? [],
        source_note: (existing.source_note as string | null) ?? null,
        is_active: Boolean(existing.is_active),
        raw_record: existing.raw_record as typeof item,
        updated_at: String(existing.updated_at ?? ""),
      });

      if (existingComparable === stableImportPayload(row)) {
        counts.skipped += 1;
        continue;
      }
    }

    const { error } = await supabase.from("community_knowledge").upsert(row, {
      onConflict: "external_id",
    });

    if (error) {
      counts.failed += 1;
      console.error(`Failed to upsert ${item.external_id}: ${error.message}`);
      continue;
    }

    if (existing) {
      counts.updated += 1;
    } else {
      counts.inserted += 1;
    }
  }

  return counts;
}

async function main() {
  loadLocalEnvFiles();

  const filePath = resolveDatasetPath(process.argv.slice(2));
  console.log(`Validating community knowledge dataset at ${filePath}`);

  const counts = await importCommunityKnowledge(filePath);

  console.log("Community knowledge import summary:");
  console.log(`- inserted: ${counts.inserted}`);
  console.log(`- updated: ${counts.updated}`);
  console.log(`- skipped: ${counts.skipped}`);
  console.log(`- failed: ${counts.failed}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected import failure.";
  console.error(message);
  process.exitCode = 1;
});
