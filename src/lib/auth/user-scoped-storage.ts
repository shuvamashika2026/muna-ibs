const LEGACY_SHARED_DRAFT_KEYS = [
  "munaVoiceMealDraft",
  "munaVoiceSymptomDraft",
  "munaVoiceSleepDraft",
  "munaVoiceStressDraft",
  "munaDashboardVoicePrompt",
] as const;

export type UserScopedDraftKey =
  | "munaVoiceMealDraft"
  | "munaVoiceSymptomDraft"
  | "munaVoiceSleepDraft"
  | "munaVoiceStressDraft"
  | "munaDashboardVoicePrompt";

function scopedKey(baseKey: UserScopedDraftKey, userId: string): string {
  return `${baseKey}:${userId}`;
}

export function readUserScopedDraft(userId: string | null | undefined, baseKey: UserScopedDraftKey): string | null {
  if (typeof window === "undefined" || !userId) {
    return null;
  }

  try {
    const scoped = localStorage.getItem(scopedKey(baseKey, userId));
    if (scoped) {
      return scoped;
    }

    const legacy = localStorage.getItem(baseKey);
    if (legacy) {
      localStorage.removeItem(baseKey);
    }

    return null;
  } catch {
    return null;
  }
}

export function writeUserScopedDraft(
  userId: string | null | undefined,
  baseKey: UserScopedDraftKey,
  value: string
): void {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  try {
    localStorage.setItem(scopedKey(baseKey, userId), value);
    localStorage.removeItem(baseKey);
  } catch {
    // Storage may be blocked in private mode.
  }
}

export function removeUserScopedDraft(userId: string | null | undefined, baseKey: UserScopedDraftKey): void {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  try {
    localStorage.removeItem(scopedKey(baseKey, userId));
    localStorage.removeItem(baseKey);
  } catch {
    // Ignore storage failures.
  }
}

export function clearUserScopedBrowserState(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const keysToRemove: string[] = [...LEGACY_SHARED_DRAFT_KEYS, "munaMedicalDisclaimerAccepted"];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;

      if (
        key.startsWith("munaVoiceMealDraft:") ||
        key.startsWith("munaVoiceSymptomDraft:") ||
        key.startsWith("munaVoiceSleepDraft:") ||
        key.startsWith("munaVoiceStressDraft:") ||
        key.startsWith("munaDashboardVoicePrompt:") ||
        key.startsWith("munaMedicalDisclaimerAccepted:")
      ) {
        keysToRemove.push(key);
      }
    }

    for (const key of new Set(keysToRemove)) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage failures.
  }
}
