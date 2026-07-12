import { NextResponse } from "next/server";
import { buildDailyBrief } from "@/lib/daily-brief";
import {
  buildHealthSummary,
  createSupabaseForRequest,
  loadUserMemory,
  resolvePersonalMemory,
  retrieveHealthData,
} from "@/lib/personal-health";

function resolveUserName(
  healthData: Awaited<ReturnType<typeof retrieveHealthData>>,
  supabaseUser: { user_metadata?: Record<string, unknown>; email?: string | null } | null
): string {
  const profileName = healthData.profile
    ? String(
        healthData.profile.full_name ||
          healthData.profile.name ||
          healthData.profile.display_name ||
          ""
      ).trim()
    : "";

  if (profileName) return profileName;

  const metadataName = String(
    supabaseUser?.user_metadata?.full_name || supabaseUser?.user_metadata?.name || ""
  ).trim();

  if (metadataName) return metadataName;

  return supabaseUser?.email?.split("@")[0] || "there";
}

export async function GET(request: Request) {
  try {
    const healthData = await retrieveHealthData(request);
    const summary = buildHealthSummary(healthData);
    const supabase = createSupabaseForRequest(request);

    let memoryProfile = null;
    let userName = "there";

    if (supabase && healthData.userId) {
      const { data: authData } = await supabase.auth.getUser();
      userName = resolveUserName(healthData, authData.user);
      const preloadedMemory = await loadUserMemory(supabase, healthData.userId);
      const memoryResult = await resolvePersonalMemory(supabase, healthData, preloadedMemory);
      memoryProfile = memoryResult.profile;
    }

    const brief = buildDailyBrief({
      userName,
      summary,
      memoryProfile,
      counts: {
        meals: healthData.meals.length,
        symptoms: healthData.symptoms.length,
        sleep: healthData.sleep.length,
      },
    });

    return NextResponse.json({ brief });
  } catch {
    return NextResponse.json({ error: "Daily brief could not be generated right now." }, { status: 500 });
  }
}
