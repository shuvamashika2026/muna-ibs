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
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase is not connected yet. Add your environment variables, then try again.");
      setIsSaving(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

if (!userData.user) {
  setMessage("Please sign in first.");
  setIsSaving(false);
  window.location.href = "/login";
  return;
}

const { error } = await supabase.from(table).insert({
  ...getPayload(),
  user_id: userData.user.id,
});
    setMessage(error ? error.message : "Saved.");
    setIsSaving(false);
  }

  return (
    <div className="mt-5">
      <button type="button" onClick={handleSave} className={primaryButtonClass} disabled={isSaving}>
        {isSaving ? "Saving..." : label}
      </button>
      {message ? <p className="mt-3 text-sm font-medium text-slate-600">{message}</p> : null}
    </div>
  );
}
