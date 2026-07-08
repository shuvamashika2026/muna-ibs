"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FormCard, inputClass, labelClass } from "@/components/form-card";
import { SaveEntryButton } from "@/components/save-entry-button";

export default function AddMealPage() {
  const [mealType, setMealType] = useState("Breakfast");
  const [foods, setFoods] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <AppShell title="Add meal" subtitle="Record what you ate and any notes you want to compare later.">
      <FormCard>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Meal time
            <select className={inputClass} value={mealType} onChange={(event) => setMealType(event.target.value)}>
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Dinner</option>
              <option>Snack</option>
            </select>
          </label>
          <label className={labelClass}>
            Foods eaten
            <input className={inputClass} value={foods} onChange={(event) => setFoods(event.target.value)} placeholder="Rice, dal, curd" />
          </label>
        </div>
        <label className={`${labelClass} mt-4`}>
          Notes
          <textarea className={inputClass} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Portion, spice level, outside food" />
        </label>
        <SaveEntryButton
  table="meals"
  getPayload={() => ({
    meal_type: mealType,
    meal_name: foods,
    ingredients: foods,
    notes,
    meal_date: new Date().toISOString().slice(0, 10),
  })}
/>
      </FormCard>
    </AppShell>
  );
}
