"use client";

import { useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { primaryButtonClass } from "./form-card";

type SaveEntryButtonProps = {
  table: string;
  getPayload: () => Record<string, unknown>;
  label?: string;
};

export function SaveEntryButton({ table, getPayload, label = "Save entry" }: SaveEntryButtonProps) {
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setMessageTone("error");
      setMessage("Supabase is not connected yet. Add your environment variables, then try again.");
      setIsSaving(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setMessageTone("error");
      setMessage("Please sign in first.");
      setIsSaving(false);
      window.location.href = "/login";
      return;
    }

    let payload: Record<string, unknown>;
    try {
      payload = getPayload();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not prepare this entry.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from(table).insert({
      ...payload,
      user_id: userData.user.id,
    });

    if (error) {
      setMessageTone("error");
      setMessage(error.message);
    } else {
      setMessageTone("success");
      setMessage("Saved.");
    }

    setIsSaving(false);
  }

  return (
    <div className="mt-5">
      <button type="button" onClick={handleSave} className={primaryButtonClass} disabled={isSaving}>
        {isSaving ? "Saving..." : label}
      </button>
      {message ? (
        <p
          className={`mt-3 text-sm font-medium ${messageTone === "success" ? "text-slate-600" : "text-rose-700"}`}
          role={messageTone === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
