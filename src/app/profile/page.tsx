"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/app-shell";
import { inputClass, labelClass } from "@/components/form-card";

export default function ProfilePage() {
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    age: "",
    date_of_birth: "",
    gender: "",
    country: "",
    ibs_type: "",
    diagnosis_year: "",
    height_cm: "",
    weight_kg: "",
    food_allergies: "",
    current_medication: "",
    dietary_preference: "",
    preferred_units: "metric",
    water_goal: "2500",
    sleep_goal: "7.5",
    emergency_contact: "",
  });

  useEffect(() => {
    async function loadProfile() {
      if (!supabase) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          age: data.age?.toString() ?? "",
          date_of_birth: data.date_of_birth ?? "",
          gender: data.gender ?? "",
          country: data.country ?? "",
          ibs_type: data.ibs_type ?? "",
          diagnosis_year: data.diagnosis_year?.toString() ?? "",
          height_cm: data.height_cm?.toString() ?? "",
          weight_kg: data.weight_kg?.toString() ?? "",
          food_allergies: data.food_allergies ?? "",
          current_medication: data.current_medication ?? "",
          dietary_preference: data.dietary_preference ?? "",
          preferred_units: data.preferred_units ?? "metric",
          water_goal: data.water_goal?.toString() ?? "2500",
          sleep_goal: data.sleep_goal?.toString() ?? "7.5",
          emergency_contact: data.emergency_contact ?? "",
        });
      }
    }

    loadProfile();
  }, []);

  async function handleSave() {
    if (!supabase) return;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: form.full_name,
      age: form.age ? Number(form.age) : null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender,
      country: form.country,
      ibs_type: form.ibs_type,
      diagnosis_year: form.diagnosis_year ? Number(form.diagnosis_year) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      food_allergies: form.food_allergies,
      current_medication: form.current_medication,
      dietary_preference: form.dietary_preference,
      preferred_units: form.preferred_units,
      water_goal: form.water_goal ? Number(form.water_goal) : 2500,
      sleep_goal: form.sleep_goal ? Number(form.sleep_goal) : 7.5,
      emergency_contact: form.emergency_contact,
      updated_at: new Date().toISOString(),
    });

    setMessage(error ? error.message : "Profile saved successfully.");
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <AppShell
      title="Profile"
      subtitle="Tell MUNA IBS about you so recommendations can become more personal."
    >
      <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Full name
            <input className={inputClass} value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} />
          </label>

          <label className={labelClass}>
            Age
            <input type="number" className={inputClass} value={form.age} onChange={(e) => updateField("age", e.target.value)} />
          </label>

          <label className={labelClass}>
            Date of birth
            <input type="date" className={inputClass} value={form.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} />
          </label>

          <label className={labelClass}>
            Gender
            <select className={inputClass} value={form.gender} onChange={(e) => updateField("gender", e.target.value)}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Prefer not to say</option>
              <option>Other</option>
            </select>
          </label>

          <label className={labelClass}>
            Country
            <input className={inputClass} value={form.country} onChange={(e) => updateField("country", e.target.value)} />
          </label>

          <label className={labelClass}>
            IBS type
            <select className={inputClass} value={form.ibs_type} onChange={(e) => updateField("ibs_type", e.target.value)}>
              <option value="">Select</option>
              <option>IBS-C</option>
              <option>IBS-D</option>
              <option>IBS-M</option>
              <option>IBS-U</option>
              <option>Not diagnosed yet</option>
            </select>
          </label>

          <label className={labelClass}>
            Diagnosis year
            <input type="number" className={inputClass} value={form.diagnosis_year} onChange={(e) => updateField("diagnosis_year", e.target.value)} />
          </label>

          <label className={labelClass}>
            Height cm
            <input type="number" className={inputClass} value={form.height_cm} onChange={(e) => updateField("height_cm", e.target.value)} />
          </label>

          <label className={labelClass}>
            Weight kg
            <input type="number" className={inputClass} value={form.weight_kg} onChange={(e) => updateField("weight_kg", e.target.value)} />
          </label>

          <label className={labelClass}>
            Preferred units
            <select className={inputClass} value={form.preferred_units} onChange={(e) => updateField("preferred_units", e.target.value)}>
              <option value="metric">Metric: mL, kg, cm</option>
              <option value="imperial">Imperial: oz, lb, ft/in</option>
            </select>
          </label>

          <label className={labelClass}>
            Water goal mL
            <input type="number" className={inputClass} value={form.water_goal} onChange={(e) => updateField("water_goal", e.target.value)} />
          </label>

          <label className={labelClass}>
            Sleep goal hours
            <input type="number" step="0.5" className={inputClass} value={form.sleep_goal} onChange={(e) => updateField("sleep_goal", e.target.value)} />
          </label>

          <label className={labelClass}>
            Dietary preference
            <input className={inputClass} value={form.dietary_preference} onChange={(e) => updateField("dietary_preference", e.target.value)} placeholder="Vegetarian, low FODMAP, gluten-free" />
          </label>

          <label className={labelClass}>
            Emergency contact
            <input className={inputClass} value={form.emergency_contact} onChange={(e) => updateField("emergency_contact", e.target.value)} />
          </label>
        </div>

        <label className={`${labelClass} mt-4`}>
          Food allergies
          <textarea className={inputClass} rows={3} value={form.food_allergies} onChange={(e) => updateField("food_allergies", e.target.value)} />
        </label>

        <label className={`${labelClass} mt-4`}>
          Current medication
          <textarea className={inputClass} rows={3} value={form.current_medication} onChange={(e) => updateField("current_medication", e.target.value)} />
        </label>

        <button onClick={handleSave} className="mt-6 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white">
          Save profile
        </button>

        {message && <p className="mt-4 text-sm font-semibold text-emerald-700">{message}</p>}
      </div>
    </AppShell>
  );
}