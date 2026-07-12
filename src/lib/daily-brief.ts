import type { ConfidenceLabel, HealthSummary, MemoryEntry, PersonalMemoryProfile } from "@/lib/personal-health";

export type DailyBrief = {
  greeting: string;
  dateLabel: string;
  observation: string;
  limitation: string;
  nextAction: string;
  body: string;
  isEmpty: boolean;
};

const EMPTY_BRIEF_BODY =
  "Welcome to MUNA.\nStart logging meals, symptoms and sleep.\nWithin a few days I'll begin finding patterns.";

function briefGreeting(userName: string): string {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = userName.trim() || "there";
  return `${timeGreeting}, ${name}.`;
}

function formatTodayLabel(now = new Date()): string {
  return now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function trimToWordLimit(parts: string[], maxWords: number): string {
  const kept: string[] = [];
  let total = 0;

  for (const part of parts) {
    const words = part.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;

    if (total + words.length > maxWords) {
      const remaining = maxWords - total;
      if (remaining > 0) {
        kept.push(words.slice(0, remaining).join(" "));
      }
      break;
    }

    kept.push(part.trim());
    total += words.length;
  }

  return kept.join(" ");
}

function shortenMemoryObservation(entry: MemoryEntry): string {
  if (entry.kind === "association") {
    const sentence = entry.value.split(". Association confidence")[0]?.trim();
    return sentence ? `${sentence}.` : entry.value;
  }
  return entry.value;
}

function firstAvailableMemoryObservation(profile: PersonalMemoryProfile): string | null {
  const candidates: MemoryEntry[] = [
    profile.averageSleep,
    profile.hydrationHabits,
    profile.stressTrends,
    profile.bowelTrends,
    ...profile.toleratedFoods.filter((entry) => entry.kind === "observation"),
    ...profile.generalFodmapFoods.filter((entry) => entry.kind === "observation"),
    ...profile.likelyTriggerFoods.filter((entry) => entry.kind === "association"),
  ];

  for (const entry of candidates) {
    if (entry.kind !== "unavailable") {
      return shortenMemoryObservation(entry);
    }
  }

  return null;
}

function buildLoggedObservation(summary: HealthSummary): string | null {
  if (summary.observedPositiveHabits.length) {
    return summary.observedPositiveHabits[0];
  }

  if (summary.possibleAssociations.length) {
    return summary.possibleAssociations[0];
  }

  if (summary.latestStress !== null) {
    return `Latest logged stress is ${summary.latestStress}/10.`;
  }

  if (summary.latestSleepHours !== null) {
    return `Latest logged sleep is ${summary.latestSleepHours.toFixed(1)} hours.`;
  }

  if (summary.latestWaterLiters !== null) {
    return `Latest logged water intake is ${summary.latestWaterLiters.toFixed(1)} L.`;
  }

  if (summary.latestBristol !== null) {
    return `Latest logged Bristol type is ${Math.round(summary.latestBristol)}.`;
  }

  return null;
}

function buildLimitation(summary: HealthSummary, profile: PersonalMemoryProfile | null): string {
  if (!summary.authenticated) {
    return "Sign in to unlock a personal brief from your logs.";
  }

  if (summary.totalRecords === 0) {
    return "";
  }

  if (summary.hasInsufficientData) {
    return "Not enough repeated logs yet for reliable personal patterns.";
  }

  if (profile && !profile.hasPersonalPatterns) {
    return "Your logs are growing, but personal patterns are still forming.";
  }

  return "";
}

function buildNextAction(summary: HealthSummary, counts: DailyBriefCounts): string {
  if (!summary.authenticated || summary.totalRecords === 0) {
    return "Log one meal and one symptom check-in today.";
  }

  if (!counts.meals) {
    return "Log your next meal while details are still fresh.";
  }

  if (!counts.symptoms) {
    return "Add a quick symptom check-in after your next meal.";
  }

  if (!counts.sleep) {
    return "Log last night's sleep to strengthen your daily picture.";
  }

  if (summary.latestWaterLiters !== null && summary.latestWaterLiters < 1.8) {
    return "Drink one extra glass of water before your next meal.";
  }

  if (summary.latestStress !== null && summary.latestStress >= 6) {
    return "Take five calm breaths before your next meal.";
  }

  if (summary.latestSleepHours !== null && summary.latestSleepHours < 7) {
    return "Plan a slightly earlier wind-down tonight.";
  }

  return "Keep today's logging simple: one meal, one symptom note.";
}

export type DailyBriefCounts = {
  meals: number;
  symptoms: number;
  sleep: number;
};

export type DailyBriefInput = {
  userName: string;
  summary: HealthSummary;
  memoryProfile: PersonalMemoryProfile | null;
  counts: DailyBriefCounts;
};

export function buildDailyBrief({ userName, summary, memoryProfile, counts }: DailyBriefInput): DailyBrief {
  const greeting = briefGreeting(userName);
  const dateLabel = formatTodayLabel();

  if (!summary.authenticated || summary.totalRecords === 0) {
    return {
      greeting,
      dateLabel,
      observation: EMPTY_BRIEF_BODY,
      limitation: "",
      nextAction: "Log one meal and one symptom check-in today.",
      body: trimToWordLimit([greeting, dateLabel, EMPTY_BRIEF_BODY, "Log one meal and one symptom check-in today."], 120),
      isEmpty: true,
    };
  }

  const observation =
    (memoryProfile ? firstAvailableMemoryObservation(memoryProfile) : null) ??
    buildLoggedObservation(summary) ??
    "You have started building a personal health log in MUNA.";

  const limitation = buildLimitation(summary, memoryProfile);
  const nextAction = buildNextAction(summary, counts);

  const body = trimToWordLimit(
    [greeting, dateLabel, observation, limitation, nextAction].filter(Boolean),
    120
  );

  return {
    greeting,
    dateLabel,
    observation,
    limitation,
    nextAction,
    body,
    isEmpty: false,
  };
}

export function validateDailyBriefWordLimit(brief: DailyBrief): boolean {
  return countWords(brief.body) <= 120;
}
