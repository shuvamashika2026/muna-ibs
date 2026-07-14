export type MemoryEntryKind = "observation" | "association" | "user_marked" | "unavailable";

export type MemoryEntry = {
  kind: MemoryEntryKind;
  label: string;
  value: string;
};

export type PersonalMemoryProfile = {
  version: number;
  generatedAt: string;
  hasPersonalPatterns: boolean;
  generalFodmapFoods: MemoryEntry[];
  likelyTriggerFoods: MemoryEntry[];
  userMarkedTriggerFoods: MemoryEntry[];
  toleratedFoods: MemoryEntry[];
  averageSleep: MemoryEntry;
  hydrationHabits: MemoryEntry;
  stressTrends: MemoryEntry;
  bowelTrends: MemoryEntry;
  ibsSubtype: MemoryEntry;
  userPreferences: MemoryEntry[];
};
