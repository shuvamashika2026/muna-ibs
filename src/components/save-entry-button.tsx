"use client";

import { useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { primaryButtonClass } from "./form-card";

type SaveEntryButtonProps = {
  table: string;
  getPayload: () => Record<string, unknown>;
  label?: string;
  onSuccess?: (result?: { id: string }) => void;
};

export function SaveEntryButton({
  table,
  getPayload,
  label = "Save entry",
  onSuccess,
}: SaveEntryButtonProps) {
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (!isSupabaseConfigured || !supabase) {
        setMessageTone("error");
        setMessage(
          "Supabase is not connected yet. Add your environment variables, then try again."
        );
        return;
      }

      const { data: userData, error: authError } = await supabase.auth.getUser();

      if (authError || !userData.user) {
        setMessageTone("error");
        setMessage("Please sign in first.");
        window.location.href = "/login";
        return;
      }

      let pagePayload: Record<string, unknown>;

      try {
        pagePayload = getPayload();
      } catch (error) {
        setMessageTone("error");
        setMessage(
          error instanceof Error ? error.message : "Could not prepare this entry."
        );
        return;
      }

      const safePayload = { ...pagePayload };
      delete safePayload.user_id;
      delete safePayload.id;

      const payload = {
        ...safePayload,
        user_id: userData.user.id,
      };

      const { data: inserted, error } = await supabase.from(table).insert(payload).select("id").single();

      if (error) {
        setMessageTone("error");
        setMessage(error.message);
        return;
      }

      setMessageTone("success");
      setMessage("Saved.");
      onSuccess?.(inserted?.id ? { id: inserted.id } : undefined);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save this entry.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={handleSave}
        className={primaryButtonClass}
        disabled={isSaving}
      >
        {isSaving ? "Saving..." : label}
      </button>

      {message ? (
        <p
          className={`mt-3 text-sm font-medium ${
            messageTone === "success" ? "text-slate-600" : "text-rose-700"
          }`}
          role={messageTone === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
