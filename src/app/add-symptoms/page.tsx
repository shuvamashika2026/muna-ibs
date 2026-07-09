"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FormCard, inputClass, labelClass } from "@/components/form-card";
import { SaveEntryButton } from "@/components/save-entry-button";

export default function AddSymptomsPage() {
  const [painLevel, setPainLevel] = useState(3);
  const [bloatingLevel, setBloatingLevel] = useState(3);
  const [gasLevel, setGasLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [mood, setMood] = useState("Okay");
  const [nausea, setNausea] = useState(false);
  const [constipation, setConstipation] = useState(false);
  const [diarrhea, setDiarrhea] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const symptomDraft = localStorage.getItem("munaVoiceSymptomDraft");
    const stressDraft = localStorage.getItem("munaVoiceStressDraft");
    const draft = symptomDraft || stressDraft;
    if (!draft) return;

    try {
      const parsed = JSON.parse(draft) as { symptoms?: string; note?: string };
      const text = parsed.symptoms || parsed.note || "";
      const stressMatch = text.match(/stress(?: level)?\s*(\d+)/i);
      if (stressMatch?.[1]) {
        setStressLevel(Math.min(10, Math.max(0, Number(stressMatch[1]))));
      }
      if (/bloating/i.test(text)) setBloatingLevel(6);
      if (/pain|cramp/i.test(text)) setPainLevel(6);
      setNotes(`Voice draft: ${text}`);
    } finally {
      localStorage.removeItem("munaVoiceSymptomDraft");
      localStorage.removeItem("munaVoiceStressDraft");
    }
  }, []);

  return (
    <AppShell title="Add symptoms" subtitle="Log your IBS symptoms and stress level for pattern tracking.">
      <FormCard>
        <div className="grid gap-5">
          <label className={labelClass}>
            Pain level: {painLevel}/10
            <input className="mt-3 w-full accent-emerald-600" type="range" min="0" max="10" value={painLevel} onChange={(e) => setPainLevel(Number(e.target.value))} />
          </label>

          <label className={labelClass}>
            Bloating level: {bloatingLevel}/10
            <input className="mt-3 w-full accent-emerald-600" type="range" min="0" max="10" value={bloatingLevel} onChange={(e) => setBloatingLevel(Number(e.target.value))} />
          </label>

          <label className={labelClass}>
            Gas level: {gasLevel}/10
            <input className="mt-3 w-full accent-emerald-600" type="range" min="0" max="10" value={gasLevel} onChange={(e) => setGasLevel(Number(e.target.value))} />
          </label>

          <label className={labelClass}>
            Stress level: {stressLevel}/10
            <input className="mt-3 w-full accent-sky-600" type="range" min="0" max="10" value={stressLevel} onChange={(e) => setStressLevel(Number(e.target.value))} />
          </label>

          <label className={labelClass}>
            Energy level: {energyLevel}/10
            <input className="mt-3 w-full accent-sky-600" type="range" min="0" max="10" value={energyLevel} onChange={(e) => setEnergyLevel(Number(e.target.value))} />
          </label>

          <label className={labelClass}>
            Mood
            <select className={inputClass} value={mood} onChange={(e) => setMood(e.target.value)}>
              <option>Good</option>
              <option>Okay</option>
              <option>Low</option>
              <option>Anxious</option>
              <option>Tired</option>
            </select>
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <label className={labelClass}>
              <input type="checkbox" checked={nausea} onChange={(e) => setNausea(e.target.checked)} />
              Nausea
            </label>

            <label className={labelClass}>
              <input type="checkbox" checked={constipation} onChange={(e) => setConstipation(e.target.checked)} />
              Constipation
            </label>

            <label className={labelClass}>
              <input type="checkbox" checked={diarrhea} onChange={(e) => setDiarrhea(e.target.checked)} />
              Diarrhea
            </label>
          </div>

          <label className={labelClass}>
            Notes
            <textarea className={inputClass} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Example: bloating after lunch, mild cramps, stressful day" />
          </label>
        </div>

        <SaveEntryButton
          table="symptoms"
          getPayload={() => ({
            symptom_date: new Date().toISOString().slice(0, 10),
            symptom_time: new Date().toISOString(),
            pain_level: painLevel,
            bloating_level: bloatingLevel,
            gas_level: gasLevel,
            stress_level: stressLevel,
            energy_level: energyLevel,
            mood,
            nausea,
            constipation,
            diarrhea,
            notes,
          })}
        />
      </FormCard>
    </AppShell>
  );
}
