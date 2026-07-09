"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FormCard, inputClass, labelClass } from "@/components/form-card";
import { SaveEntryButton } from "@/components/save-entry-button";

export default function AddMealPage() {
  const [mealType, setMealType] = useState("Breakfast");
  const [mealName, setMealName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [drinks, setDrinks] = useState("");
  const [portionSize, setPortionSize] = useState("Medium");
  const [locationType, setLocationType] = useState("Home");
  const [cookingMethod, setCookingMethod] = useState("");
  const [fodmapLevel, setFodmapLevel] = useState("Unknown");
  const [notes, setNotes] = useState("");

  const [isSpicy, setIsSpicy] = useState(false);
  const [hasDairy, setHasDairy] = useState(false);
  const [hasGluten, setHasGluten] = useState(false);
  const [hasOnion, setHasOnion] = useState(false);
  const [hasGarlic, setHasGarlic] = useState(false);
  const [hasCaffeine, setHasCaffeine] = useState(false);
  const [hasAlcohol, setHasAlcohol] = useState(false);

  return (
    <AppShell
      title="Add meal"
      subtitle="Record detailed meal information for future trigger analysis."
    >
      <FormCard>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Meal time
            <select
              className={inputClass}
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
            >
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Dinner</option>
              <option>Snack</option>
            </select>
          </label>

          <label className={labelClass}>
            Meal name
            <input
              className={inputClass}
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="Example: Rice with chicken curry"
            />
          </label>

          <label className={labelClass}>
            Ingredients / foods eaten
            <input
              className={inputClass}
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Rice, chicken, onion, garlic, spices"
            />
          </label>

          <label className={labelClass}>
            Drinks
            <input
              className={inputClass}
              value={drinks}
              onChange={(e) => setDrinks(e.target.value)}
              placeholder="Water, coffee, tea, soft drink"
            />
          </label>

          <label className={labelClass}>
            Portion size
            <select
              className={inputClass}
              value={portionSize}
              onChange={(e) => setPortionSize(e.target.value)}
            >
              <option>Small</option>
              <option>Medium</option>
              <option>Large</option>
              <option>Very large</option>
            </select>
          </label>

          <label className={labelClass}>
            Location
            <select
              className={inputClass}
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
            >
              <option>Home</option>
              <option>Restaurant</option>
              <option>Office</option>
              <option>Travel</option>
              <option>Other</option>
            </select>
          </label>

          <label className={labelClass}>
            Cooking method
            <select
              className={inputClass}
              value={cookingMethod}
              onChange={(e) => setCookingMethod(e.target.value)}
            >
              <option value="">Select</option>
              <option>Boiled</option>
              <option>Steamed</option>
              <option>Grilled</option>
              <option>Fried</option>
              <option>Baked</option>
              <option>Raw</option>
              <option>Mixed</option>
            </select>
          </label>

          <label className={labelClass}>
            Estimated FODMAP level
            <select
              className={inputClass}
              value={fodmapLevel}
              onChange={(e) => setFodmapLevel(e.target.value)}
            >
              <option>Unknown</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-950">
            Possible trigger tags
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ["Spicy", isSpicy, setIsSpicy],
              ["Dairy", hasDairy, setHasDairy],
              ["Gluten", hasGluten, setHasGluten],
              ["Onion", hasOnion, setHasOnion],
              ["Garlic", hasGarlic, setHasGarlic],
              ["Caffeine", hasCaffeine, setHasCaffeine],
              ["Alcohol", hasAlcohol, setHasAlcohol],
            ].map(([label, value, setter]) => (
              <label
                key={label as string}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={(e) =>
                    (setter as (value: boolean) => void)(e.target.checked)
                  }
                />
                {label as string}
              </label>
            ))}
          </div>
        </div>

        <label className={`${labelClass} mt-5`}>
          Notes
          <textarea
            className={inputClass}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Example: spicy restaurant food, heavy portion, ate late night"
          />
        </label>

        <SaveEntryButton
          table="meals"
          getPayload={() => ({
            meal_date: new Date().toISOString().slice(0, 10),
            meal_time: new Date().toISOString(),
            meal_type: mealType,
            meal_name: mealName,
            ingredients,
            drinks,
            portion_size: portionSize,
            location_type: locationType,
            cooking_method: cookingMethod,
            fodmap_level: fodmapLevel,
            is_spicy: isSpicy,
            has_dairy: hasDairy,
            has_gluten: hasGluten,
            has_onion: hasOnion,
            has_garlic: hasGarlic,
            has_caffeine: hasCaffeine,
            has_alcohol: hasAlcohol,
            notes,
          })}
        />
      </FormCard>
    </AppShell>
  );
}