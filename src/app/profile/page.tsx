"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  buildProfileUpsertRow,
  mapUsersRowToProfileForm,
  type ProfileFormState,
} from "@/lib/profile/persistence";
import { RequireUserSession } from "@/lib/auth/require-user-session";
import { AppShell } from "@/components/app-shell";
import { inputClass, labelClass } from "@/components/form-card";

const initialForm: ProfileFormState = {
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
};

export default function ProfilePage() {
  return (
    <RequireUserSession
      loading={
        <AppShell title="Profile" subtitle="Tell MUNA IBS about you so recommendations can become more personal.">
          <p className="text-sm font-semibold text-slate-600">Loading profile…</p>
        </AppShell>
      }
    >
      {({ userId, generation }) => (
        <ProfilePageLoaded key={generation} userId={userId} generation={generation} />
      )}
    </RequireUserSession>
  );
}

function ProfilePageLoaded({
  userId,
  generation,
}: {
  userId: string;
  generation: number;
}) {
  const [form, setForm] = useState<ProfileFormState>(initialForm);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchGeneration = generation;

    async function loadProfile() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user || user.id !== userId || fetchGeneration !== generation) {
        return;
      }

      const { data, error } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();

      if (fetchGeneration !== generation) {
        return;
      }

      if (error) {
        setMessageTone("error");
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        setForm(mapUsersRowToProfileForm(data as Record<string, unknown>));
      }

      setIsLoading(false);
    }

    void loadProfile();
  }, [generation, userId]);

  async function handleSave() {
    if (!supabase || isSaving) return;

    setIsSaving(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const built = buildProfileUpsertRow(user.id, form);
    if (!built.ok) {
      setMessageTone("error");
      setMessage(built.error);
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("users").upsert(built.row, { onConflict: "id" });

    if (error) {
      setMessageTone("error");
      setMessage(error.message);
    } else {
      setMessageTone("success");
      setMessage("Profile saved successfully.");
    }

    setIsSaving(false);
  }

  function updateField(field: keyof ProfileFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <AppShell
      title="Profile"
      subtitle="Tell MUNA IBS about you so recommendations can become more personal."
    >
      <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        {isLoading ? (
          <p className="text-sm font-semibold text-slate-600">Loading profile…</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Full name
                <input
                  className={inputClass}
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                />
              </label>

              <label className={labelClass}>
                Age
                <input
                  type="number"
                  min={0}
                  max={120}
                  className={inputClass}
                  value={form.age}
                  onChange={(e) => updateField("age", e.target.value)}
                />
              </label>

              <label className={labelClass}>
                Date of birth
                <input
                  type="date"
                  className={inputClass}
                  value={form.date_of_birth}
                  onChange={(e) => updateField("date_of_birth", e.target.value)}
                />
              </label>

              <label className={labelClass}>
                Gender
                <select
                  className={inputClass}
                  value={form.gender}
                  onChange={(e) => updateField("gender", e.target.value)}
                >
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Prefer not to say</option>
                  <option>Other</option>
                </select>
              </label>

              <label className={labelClass}>
                Country
                <input
                  className={inputClass}
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                />
              </label>

              <label className={labelClass}>
                IBS type
                <select
                  className={inputClass}
                  value={form.ibs_type}
                  onChange={(e) => updateField("ibs_type", e.target.value)}
                >
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
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  className={inputClass}
                  value={form.diagnosis_year}
                  onChange={(e) => updateField("diagnosis_year", e.target.value)}
                />
              </label>

              <label className={labelClass}>
                Height cm
                <input
                  type="number"
                  min={50}
                  max={250}
                  step="0.1"
                  className={inputClass}
                  value={form.height_cm}
                  onChange={(e) => updateField("height_cm", e.target.value)}
                />
              </label>

              <label className={labelClass}>
                Weight kg
                <input
                  type="number"
                  min={20}
                  max={300}
                  step="0.1"
                  className={inputClass}
                  value={form.weight_kg}
                  onChange={(e) => updateField("weight_kg", e.target.value)}
                />
              </label>

              <label className={labelClass}>
                Preferred units
                <select
                  className={inputClass}
                  value={form.preferred_units}
                  onChange={(e) => updateField("preferred_units", e.target.value)}
                >
                  <option value="metric">Metric: mL, kg, cm</option>
                  <option value="imperial">Imperial: oz, lb, ft/in</option>
                </select>
              </label>

              <label className={labelClass}>
                Water goal mL
                <input
                  type="number"
                  min={250}
                  max={10000}
                  className={inputClass}
                  value={form.water_goal}
                  onChange={(e) => updateField("water_goal", e.target.value)}
                />
              </label>

              <label className={labelClass}>
                Sleep goal hours
                <input
                  type="number"
                  min={0}
                  max={24}
                  step="0.5"
                  className={inputClass}
                  value={form.sleep_goal}
                  onChange={(e) => updateField("sleep_goal", e.target.value)}
                />
              </label>

              <label className={labelClass}>
                Dietary preference
                <input
                  className={inputClass}
                  value={form.dietary_preference}
                  onChange={(e) => updateField("dietary_preference", e.target.value)}
                  placeholder="Vegetarian, low FODMAP, gluten-free"
                />
              </label>

              <label className={labelClass}>
                Emergency contact
                <input
                  className={inputClass}
                  value={form.emergency_contact}
                  onChange={(e) => updateField("emergency_contact", e.target.value)}
                />
              </label>
            </div>

            <label className={`${labelClass} mt-4`}>
              Food allergies
              <textarea
                className={inputClass}
                rows={3}
                value={form.food_allergies}
                onChange={(e) => updateField("food_allergies", e.target.value)}
              />
            </label>

            <label className={`${labelClass} mt-4`}>
              Current medication
              <textarea
                className={inputClass}
                rows={3}
                value={form.current_medication}
                onChange={(e) => updateField("current_medication", e.target.value)}
              />
            </label>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="mt-6 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save profile"}
            </button>

            {message ? (
              <p
                className={`mt-4 text-sm font-semibold ${
                  messageTone === "success" ? "text-emerald-700" : "text-rose-700"
                }`}
                role={messageTone === "error" ? "alert" : "status"}
              >
                {message}
              </p>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
