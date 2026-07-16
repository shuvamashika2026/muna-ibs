"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearUserScopedBrowserState } from "@/lib/auth/user-scoped-storage";

export type UserSession = {
  userId: string | null;
  /** Increments whenever the authenticated user changes. Use to abort stale fetches. */
  generation: number;
  isReady: boolean;
};

export function useUserSession(): UserSession {
  const [session, setSession] = useState<UserSession>(() => ({
    userId: null,
    generation: 0,
    isReady: !supabase,
  }));
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let cancelled = false;

    function commitUser(userId: string | null) {
      if (cancelled) return;

      const userChanged = previousUserIdRef.current !== userId;
      previousUserIdRef.current = userId;

      if (userId === null && userChanged) {
        clearUserScopedBrowserState();
      }

      setSession((current) => ({
        userId,
        generation: userChanged ? current.generation + 1 : current.generation,
        isReady: true,
      }));
    }

    supabase.auth.getUser().then(({ data }) => {
      commitUser(data.user?.id ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (event === "SIGNED_OUT") {
        clearUserScopedBrowserState();
      }

      commitUser(authSession?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return session;
}
