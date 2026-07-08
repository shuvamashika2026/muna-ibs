"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FormCard, inputClass, labelClass } from "@/components/form-card";
import { SaveEntryButton } from "@/components/save-entry-button";

export default function MedicationPage() {
  const [medicineName, setMedicineName] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("Once daily");
  const [notes, setNotes] = useState("");

  return (
    <AppShell title="Medication Tracker" subtitle="Record your IBS-related medicines and supplements.">
      <FormCard>
        <div className="grid gap-5">
          <label className={labelClass}>
            Medicine name
            <input
              className={inputClass}
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              placeholder="Example: Mebeverine, probiotic, peppermint oil"
            />
          </label>

          <label className={labelClass}>
            Dose
            <input
              className={inputClass}
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="Example: 200 mg, 1 capsule"
            />
          </label>

          <label className={labelClass}>
            Frequency
            <select className={inputClass} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option>Once daily</option>
              <option>Twice daily</option>
              <option>Three times daily</option>
              <option>Before meals</option>
              <option>After meals</option>
              <option>As needed</option>
            </select>
          </label>

          <label className={labelClass}>
            Notes
            <textarea
              className={inputClass}
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Example: prescribed by doctor, take after dinner"
            />
          </label>
        </div>

        <SaveEntryButton
          table="medications"
          getPayload={() => ({
            medicine_name: medicineName,
            dose,
            frequency,
            notes,
            active: true,
          })}
        />
      </FormCard>
    </AppShell>
  );
}