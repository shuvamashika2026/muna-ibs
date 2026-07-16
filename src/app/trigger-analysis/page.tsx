"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";
import { RequireUserSession } from "@/lib/auth/require-user-session";

type TriggerRow = {
  food_name: string;
  symptom_count: number | null;
  confidence: string | null;
};

export default function TriggerAnalysisPage() {
  return (
    <RequireUserSession
      loading={
        <AppShell title="Trigger analysis" subtitle="Patterns are suggestions for discussion with a qualified clinician, not a diagnosis.">
          <p className="text-sm font-semibold text-slate-600">Loading your trigger patterns…</p>
        </AppShell>
      }
    >
      {({ userId, generation }) => (
        <TriggerAnalysisPageLoaded key={generation} userId={userId} generation={generation} />
      )}
    </RequireUserSession>
  );
}

function TriggerAnalysisPageLoaded({
  userId,
  generation,
}: {
  userId: string;
  generation: number;
}) {
  const [rows, setRows] = useState<TriggerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGeneration = generation;

    async function loadTriggers() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || user.id !== userId || fetchGeneration !== generation) {
        return;
      }

      const { data, error } = await supabase
        .from("trigger_foods")
        .select("food_name, symptom_count, confidence")
        .eq("user_id", user.id)
        .order("symptom_count", { ascending: false })
        .limit(20);

      if (fetchGeneration !== generation) {
        return;
      }

      if (!error) {
        setRows((data ?? []) as TriggerRow[]);
      }

      setIsLoading(false);
    }

    void loadTriggers();
  }, [generation, userId]);

  return (
    <AppShell title="Trigger analysis" subtitle="Patterns are suggestions for discussion with a qualified clinician, not a diagnosis.">
      <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        {isLoading ? (
          <p className="text-sm font-semibold text-slate-600">Loading your trigger patterns…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm leading-6 text-slate-600">
            No personal trigger patterns yet. Mark foods in your logs or trigger list and MUNA will show patterns here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-sm text-slate-500">
                  <th className="py-3">Food</th>
                  <th className="py-3">Times near symptoms</th>
                  <th className="py-3">Signal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.food_name} className="border-b border-slate-100 last:border-0">
                    <td className="py-4 font-semibold text-emerald-950">{row.food_name}</td>
                    <td className="py-4 text-slate-700">{row.symptom_count ?? 0}</td>
                    <td className="py-4">
                      <span className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
                        {row.confidence ?? "Possible"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
