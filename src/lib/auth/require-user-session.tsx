"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUserSession } from "@/lib/auth/use-user-session";

type RequireUserSessionProps = {
  children: (session: { userId: string; generation: number }) => ReactNode;
  loading?: ReactNode;
};

export function RequireUserSession({ children, loading = null }: RequireUserSessionProps) {
  const { userId, generation, isReady } = useUserSession();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !userId) {
      router.replace("/login");
    }
  }, [isReady, router, userId]);

  if (!isReady) {
    return loading;
  }

  if (!userId) {
    return null;
  }

  return <>{children({ userId, generation })}</>;
}
