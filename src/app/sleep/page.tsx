"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FormCard, inputClass, labelClass } from "@/components/form-card";
import { SaveEntryButton } from "@/components/save-entry-button";

export default function SleepPage() {
  const [hours, setHours] = useState(7.5);
  const [quality, setQuality] = useState("Good");
  const [notes, setNotes] = useState("");

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