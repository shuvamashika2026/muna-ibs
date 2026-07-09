"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FormCard, inputClass, labelClass } from "@/components/form-card";
import { SaveEntryButton } from "@/components/save-entry-button";

export default function SleepPage() {
  const [hours, setHours] = useState(7.5);
  const [quality, setQuality] = useState("Good");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const draft = localStorage.getItem("munaVoiceSleepDraft");
    if (!draft) return;

    try {
      const parsed = JSON.parse(draft) as { note?: string };
      const text = parsed.note || "";
      const hourMatch = text.match(/(?:slept|sleep)\s*(\d+(?:\.\d+)?)/i);
      if (hourMatch?.[1]) {
        setHours(Math.min(12, Math.max(0, Number(hourMatch[1]))));
      }
      setNotes(`Voice draft: ${text}`);
    } finally {
      localStorage.removeItem("munaVoiceSleepDraft");
    }
  }, []);

  return (
    <AppShell title="Sleep Tracker" subtitle="Track your sleep because poor sleep can affect IBS symptoms.">
      <FormCard>
        <div className="grid gap-5">
          <label className={labelClass}>
            Sleep hours: {hours}
            <input
              className="mt-3 w-full accent-emerald-600"
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            />
          </label>

          <label className={labelClass}>
            Sleep quality
            <select className={inputClass} value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option>Excellent</option>
              <option>Good</option>
              <option>Average</option>
              <option>Poor</option>
              <option>Very poor</option>
            </select>
          </label>

          <label className={labelClass}>
            Notes
            <textarea
              className={inputClass}
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Example: woke up twice, late night, stress before sleep"
            />
          </label>
        </div>

        <SaveEntryButton
          table="sleep_logs"
          getPayload={() => ({
            sleep_date: new Date().toISOString().slice(0, 10),
            hours,
            quality,
            notes,
          })}
        />
      </FormCard>
    </AppShell>
  );
}
