"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FormCard, inputClass, labelClass } from "@/components/form-card";

const mealSlots = ["Breakfast", "Lunch", "Dinner"];

export default function MealPlannerPage() {
  const [plan, setPlan] = useState<Record<string, string>>({
    Breakfast: "Oats with banana",
    Lunch: "Rice with chicken and carrots",
    Dinner: "Quinoa with tofu and spinach",
  });

  return (
    <AppShell title="3-time meal planner" subtitle="Plan breakfast, lunch, and dinner before the day gets busy.">
      <FormCard>
        <div className="grid gap-4">
          {mealSlots.map((slot) => (
            <label key={slot} className={labelClass}>
              {slot}
              <input
                className={inputClass}
                value={plan[slot]}
                onChange={(event) => setPlan((current) => ({ ...current, [slot]: event.target.value }))}
              />
            </label>
          ))}
        </div>
      </FormCard>
    </AppShell>
  );
}
