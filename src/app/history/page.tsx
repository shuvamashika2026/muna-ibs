"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type HistoryRow = { id: string } & Record<string, string | number | boolean | null>;

export default function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [data, setData] = useState({
    meals: [] as HistoryRow[],
    symptoms: [] as HistoryRow[],
    bowel: [] as HistoryRow[],
    water: [] as HistoryRow[],
    sleep: [] as HistoryRow[],
    medications: [] as HistoryRow[],
  });

  useEffect(() => {
    async function loadHistory() {
      if (!supabase) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const nextDate = new Date(`${selectedDate}T00:00:00`);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateString = nextDate.toISOString().slice(0, 10);

      const [meals, symptoms, bowel, water, sleep, medications] =
        await Promise.all([
          supabase.from("meals").select("*").eq("user_id", user.id).gte("eaten_at", selectedDate).lt("eaten_at", nextDateString),
          supabase.from("symptoms").select("*").eq("user_id", user.id).gte("logged_at", selectedDate).lt("logged_at", nextDateString),
          supabase.from("bowel_movements").select("*").eq("user_id", user.id).gte("logged_at", selectedDate).lt("logged_at", nextDateString),
          supabase.from("water_logs").select("*").eq("user_id", user.id).eq("logged_on", selectedDate),
          supabase.from("sleep_logs").select("*").eq("user_id", user.id).eq("slept_on", selectedDate),
          supabase.from("medication_reminders").select("*").eq("user_id", user.id).eq("is_active", true),
        ]);

      setData({
        meals: meals.data ?? [],
        symptoms: symptoms.data ?? [],
        bowel: bowel.data ?? [],
        water: water.data ?? [],
        sleep: sleep.data ?? [],
        medications: (medications.data ?? []).map((row) => ({
          ...row,
          dose: row.reminder_time,
          frequency: row.notes ?? "",
        })),
      });
    }

    loadHistory();
  }, [selectedDate]);

  const waterTotal = data.water.reduce(
    (sum, item) => sum + Number(item.cups || 0) * 250,
    0
  );

  return (
    <AppShell
      title="History"
      subtitle="Review your meals, symptoms, water, sleep, bowel movement, and medication history by date."
    >
      <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Select date
          <input
            type="date"
            className="rounded-lg border border-slate-200 px-4 py-3 text-base font-normal"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-6 grid gap-5">
        <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-emerald-950">Meals</h2>
          {data.meals.length ? (
            <ul className="mt-3 space-y-2">
              {data.meals.map((meal) => (
                <li key={meal.id} className="rounded-lg bg-emerald-50 p-3">
                  <strong>{meal.meal_type}</strong>: {meal.foods}
                  {meal.notes ? <p className="text-sm text-slate-600">{meal.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No meals logged.</p>
          )}
        </section>

        <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-emerald-950">Symptoms</h2>
          {data.symptoms.length ? (
            <ul className="mt-3 space-y-2">
              {data.symptoms.map((symptom) => (
                <li key={symptom.id} className="rounded-lg bg-sky-50 p-3">
                  Severity {symptom.severity}/10, Stress {symptom.stress_level}/10
                  <p className="text-sm text-slate-600">{symptom.symptoms}</p>
                  {symptom.notes ? <p className="text-sm text-slate-600">{symptom.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No symptoms logged.</p>
          )}
        </section>

        <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-emerald-950">Bowel Movements</h2>
          {data.bowel.length ? (
            <ul className="mt-3 space-y-2">
              {data.bowel.map((item) => (
                <li key={item.id} className="rounded-lg bg-teal-50 p-3">
                  Bristol Type {item.bristol_type}, Urgency {item.urgency}
                  {item.notes ? <p className="text-sm text-slate-600">{item.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No bowel movements logged.</p>
          )}
        </section>

        <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-emerald-950">Water</h2>
          <p className="mt-2 text-3xl font-bold text-emerald-950">{waterTotal} mL</p>
          <p className="mt-1 text-sm text-slate-500">Total water logged on this date.</p>
        </section>

        <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-emerald-950">Sleep</h2>
          {data.sleep.length ? (
            <ul className="mt-3 space-y-2">
              {data.sleep.map((sleep) => (
                <li key={sleep.id} className="rounded-lg bg-indigo-50 p-3">
                  {sleep.hours} hours — {sleep.quality}
                  {sleep.notes ? <p className="text-sm text-slate-600">{sleep.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No sleep logged.</p>
          )}
        </section>

        <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-emerald-950">Active Medications</h2>
          {data.medications.length ? (
            <ul className="mt-3 space-y-2">
              {data.medications.map((med) => (
                <li key={med.id} className="rounded-lg bg-purple-50 p-3">
                  <strong>{med.medicine_name}</strong> — {med.dose} — {med.frequency}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No active medications.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
