"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FormCard, inputClass, labelClass } from "@/components/form-card";
import { SaveEntryButton } from "@/components/save-entry-button";
import { bristolScale } from "@/lib/data";

export default function BowelMovementPage() {
  const [type, setType] = useState(4);
  const [urgency, setUrgency] = useState("Normal");
  const selected = bristolScale.find((item) => item.type === type);

  return (
    <AppShell title="Bowel movement" subtitle="Use the Bristol stool scale for consistent tracking.">
      <FormCard>
        <div className="grid gap-3 md:grid-cols-7">
          {bristolScale.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => setType(item.type)}
              className={`min-h-24 rounded-lg border p-3 text-left ${type === item.type ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white"}`}
            >
              <span className="text-xl font-bold text-emerald-950">Type {item.type}</span>
              <span className="mt-2 block text-sm text-slate-600">{item.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 rounded-lg bg-sky-50 p-4 text-sm text-sky-950">{selected?.note}</p>
        <label className={`${labelClass} mt-4`}>
          Urgency
          <select className={inputClass} value={urgency} onChange={(event) => setUrgency(event.target.value)}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
            <option>Accident</option>
          </select>
        </label>
        <SaveEntryButton
  table="bowel_movements"
  getPayload={() => ({
    movement_date: new Date().toISOString().slice(0, 10),
    bristol_type: type,
    urgency_level:
      urgency === "Low" ? 2 :
      urgency === "Normal" ? 5 :
      urgency === "High" ? 8 :
      10,
    notes: `Urgency: ${urgency}`,
  })}
/>
      </FormCard>
    </AppShell>
  );
}
