import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  mapVerifiedGuidanceItemToRow,
  stableVerifiedImportPayload,
} from "@/lib/verified-guidance/map-record";
import { validateVerifiedGuidanceDataset } from "@/lib/verified-guidance/validate-dataset";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const DEFAULT_DATASET_PATH = "data/guidance/MUNA_Verified_IBS_Guidance_v1.json";

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

  const candidate = resolve(process.cwd(), DEFAULT_DATASET_PATH);
  if (!existsSync(candidate)) {
    throw new Error(
      `Verified guidance dataset not found. Pass --file <path> or place the file at ${DEFAULT_DATASET_PATH}.`
    );
  }

  return candidate;
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

async function importVerifiedGuidance(filePath: string): Promise<ImportCounts> {
  const parsed = readDataset(filePath);
  const validation = validateVerifiedGuidanceDataset(parsed);

  if (!validation.valid) {
    console.error("Verified guidance validation failed. No database writes were performed.");
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
    .from("verified_scientific_guidance")
    .select(
      "external_id, title, source_organisation, source_type, published_on, last_reviewed_on, topic, evidence_type, summary, recommendation, contraindications, red_flags, citation_url, citation_title, review_status, reviewer_note, version, is_active, raw_record"
    )
    .in("external_id", externalIds);

  if (existingError) {
    console.error("Failed to read existing verified guidance rows.");
    process.exitCode = 1;
    return { inserted: 0, updated: 0, skipped: 0, failed: dataset.items.length };
  }

  const existingByExternalId = new Map(
    (existingRows ?? []).map((row) => [String(row.external_id), row as Record<string, unknown>])
  );

  for (const item of dataset.items) {
    const row = mapVerifiedGuidanceItemToRow(item);
    const existing = existingByExternalId.get(item.external_id);

    if (existing) {
      const existingComparable = stableVerifiedImportPayload({
        external_id: String(existing.external_id),
        title: String(existing.title),
        source_organisation: String(existing.source_organisation),
        source_type: String(existing.source_type),
        published_on: (existing.published_on as string | null) ?? null,
        last_reviewed_on: (existing.last_reviewed_on as string | null) ?? null,
        topic: String(existing.topic),
        evidence_type: row.evidence_type,
        summary: String(existing.summary),
        recommendation: (existing.recommendation as string | null) ?? null,
        contraindications: (existing.contraindications as string[]) ?? [],
        red_flags: (existing.red_flags as string[]) ?? [],
        citation_url: String(existing.citation_url),
        citation_title: String(existing.citation_title),
        review_status: row.review_status,
        reviewer_note: (existing.reviewer_note as string | null) ?? null,
        version: String(existing.version),
        is_active: Boolean(existing.is_active),
        raw_record: existing.raw_record as typeof item,
        updated_at: String(existing.updated_at ?? ""),
      });

      if (existingComparable === stableVerifiedImportPayload(row)) {
        counts.skipped += 1;
        continue;
      }
    }

    const { error } = await supabase.from("verified_scientific_guidance").upsert(row, {
      onConflict: "external_id",
    });

    if (error) {
      counts.failed += 1;
      console.error(`Failed to upsert ${item.external_id}.`);
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
  console.log(`Validating verified guidance dataset at ${filePath}`);

  const counts = await importVerifiedGuidance(filePath);

  console.log("Verified guidance import summary:");
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
