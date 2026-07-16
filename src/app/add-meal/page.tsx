"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FormCard, inputClass, labelClass } from "@/components/form-card";
import { MealAnalysisPreview } from "@/components/meal-analysis-preview";
import { MealAnalysisResultPanel } from "@/components/meal-analysis-result";
import { SaveEntryButton } from "@/components/save-entry-button";
import { FoodItem, searchFoods } from "@/lib/food";
import type { MealAnalysisInput, MealAnalysisResult } from "@/lib/meal-analysis/types";
import { hasMealInputContent } from "@/lib/meal-analysis/types";
import { supabase } from "@/lib/supabase";
import { readUserScopedDraft, removeUserScopedDraft } from "@/lib/auth/user-scoped-storage";

export default function AddMealPage() {
  const [foodSearch, setFoodSearch] = useState("");
  const [foodResults, setFoodResults] = useState<FoodItem[]>([]);

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

  const [mealAnalysis, setMealAnalysis] = useState<MealAnalysisResult | null>(null);
  const [mealAnalysisCached, setMealAnalysisCached] = useState(false);
  const [mealAnalysisError, setMealAnalysisError] = useState("");
  const [mealAnalysisNotice, setMealAnalysisNotice] = useState("");
  const [isAnalyzingMeal, setIsAnalyzingMeal] = useState(false);
  const [savedMealId, setSavedMealId] = useState<string | null>(null);

  useEffect(() => {
    async function loadVoiceDraft() {
      if (!supabase) return;

      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      const draft = readUserScopedDraft(userId, "munaVoiceMealDraft");

      if (!draft) {
        return;
      }

      try {
        const parsed = JSON.parse(draft) as {
          mealType?: string;
          note?: string;
        };

        if (parsed.mealType) {
          setMealType(parsed.mealType);
        }

        if (parsed.note) {
          setMealName(parsed.mealType || "Voice meal");
          setIngredients(parsed.note);
          setNotes(`Voice draft: ${parsed.note}`);
        }
      } catch (error) {
        console.error("Unable to load voice meal draft:", error);
      } finally {
        removeUserScopedDraft(userId, "munaVoiceMealDraft");
      }
    }

    void loadVoiceDraft();
  }, []);

  async function handleFoodSearch(value: string) {
    setFoodSearch(value);

    if (value.trim().length < 2) {
      setFoodResults([]);
      return;
    }

    try {
      const results = await searchFoods(value);
      setFoodResults(results);
    } catch (error) {
      console.error("Food search failed:", error);
      setFoodResults([]);
    }
  }

  function selectFood(food: FoodItem) {
    setMealName(food.food_name);
    setIngredients(food.ingredients_summary ?? food.food_name);
    setFodmapLevel(food.fodmap_level ?? "Unknown");

    const triggers = food.common_triggers ?? [];

    setHasOnion(triggers.includes("onion"));
    setHasGarlic(triggers.includes("garlic"));
    setHasDairy(
      triggers.includes("dairy") || triggers.includes("lactose")
    );
    setHasGluten(
      triggers.includes("gluten") || triggers.includes("wheat")
    );
    setHasCaffeine(triggers.includes("caffeine"));
    setHasAlcohol(triggers.includes("alcohol"));
    setIsSpicy(triggers.includes("spicy"));

    setFoodResults([]);
    setFoodSearch(food.food_name);
  }

  function resetMealForm() {
    setFoodSearch("");
    setFoodResults([]);

    setMealType("Breakfast");
    setMealName("");
    setIngredients("");
    setDrinks("");
    setPortionSize("Medium");
    setLocationType("Home");
    setCookingMethod("");
    setFodmapLevel("Unknown");
    setNotes("");

    setIsSpicy(false);
    setHasDairy(false);
    setHasGluten(false);
    setHasOnion(false);
    setHasGarlic(false);
    setHasCaffeine(false);
    setHasAlcohol(false);
    setMealAnalysis(null);
    setMealAnalysisCached(false);
    setMealAnalysisError("");
    setMealAnalysisNotice("");
    setSavedMealId(null);
  }

  function buildMealAnalysisInput(): MealAnalysisInput {
    const tags = [
      isSpicy && "spicy",
      hasDairy && "dairy",
      hasGluten && "gluten",
      hasOnion && "onion",
      hasGarlic && "garlic",
      hasCaffeine && "caffeine",
      hasAlcohol && "alcohol",
    ].filter((tag): tag is string => Boolean(tag));

    return {
      mealType,
      mealName,
      ingredients,
      drinks,
      portionSize,
      locationType,
      cookingMethod,
      fodmapLevel,
      notes,
      tags,
    };
  }

  async function getAccessToken() {
    if (!supabase) {
      return null;
    }

    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function persistMealAnalysis(mealId: string, analysis: MealAnalysisResult) {
    const token = await getAccessToken();
    if (!token) {
      return;
    }

    await fetch("/api/meal-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        persistOnly: true,
        mealId,
        analysis,
      }),
    });
  }

  async function runMealAnalysis(force = false) {
    const meal = buildMealAnalysisInput();
    if (!hasMealInputContent(meal)) {
      setMealAnalysisError("Add at least one food, ingredient, drink, or note before analysis.");
      return;
    }

    if (isAnalyzingMeal) {
      return;
    }

    setIsAnalyzingMeal(true);
    setMealAnalysisError("");
    setMealAnalysisNotice("");

    try {
      const token = await getAccessToken();
      if (!token) {
        setMealAnalysisError("Please sign in to use MUNA AI meal analysis.");
        return;
      }

      const response = await fetch("/api/meal-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          meal,
          mealId: savedMealId ?? undefined,
          force,
        }),
      });

      const payload = (await response.json()) as {
        analysis?: MealAnalysisResult;
        cached?: boolean;
        error?: string;
        notice?: string;
      };

      if (!response.ok || !payload.analysis) {
        setMealAnalysisError(payload.error || "Meal analysis is unavailable right now.");
        return;
      }

      setMealAnalysis(payload.analysis);
      setMealAnalysisCached(Boolean(payload.cached));
      setMealAnalysisNotice(payload.notice ?? "");
    } catch {
      setMealAnalysisError("Meal analysis is unavailable right now.");
    } finally {
      setIsAnalyzingMeal(false);
    }
  }

  async function handleMealSaved(result?: { id: string }) {
    if (result?.id) {
      setSavedMealId(result.id);
      if (mealAnalysis) {
        await persistMealAnalysis(result.id, mealAnalysis);
        setMealAnalysisCached(true);
      }
    }

    resetMealForm();
  }

  const mealPreviewText = useMemo(() => {
    return [mealName, ingredients, drinks]
      .filter(Boolean)
      .join(", ");
  }, [mealName, ingredients, drinks]);

  const triggerTags = [
    {
      label: "Spicy",
      value: isSpicy,
      setter: setIsSpicy,
    },
    {
      label: "Dairy",
      value: hasDairy,
      setter: setHasDairy,
    },
    {
      label: "Gluten",
      value: hasGluten,
      setter: setHasGluten,
    },
    {
      label: "Onion",
      value: hasOnion,
      setter: setHasOnion,
    },
    {
      label: "Garlic",
      value: hasGarlic,
      setter: setHasGarlic,
    },
    {
      label: "Caffeine",
      value: hasCaffeine,
      setter: setHasCaffeine,
    },
    {
      label: "Alcohol",
      value: hasAlcohol,
      setter: setHasAlcohol,
    },
  ];

  return (
    <AppShell
      title="Add meal"
      subtitle="Search foods and auto-fill meal details for better trigger analysis."
    >
      <FormCard>
        <label className={labelClass}>
          Search Food Intelligence Database

          <input
            className={inputClass}
            value={foodSearch}
            onChange={(event) =>
              handleFoodSearch(event.target.value)
            }
            placeholder="Search food, e.g. rice, milk, onion, coffee"
          />
        </label>

        {foodResults.length > 0 && (
          <div className="mt-3 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
            {foodResults.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => selectFood(food)}
                className="block w-full rounded-xl px-4 py-3 text-left hover:bg-emerald-50"
              >
                <p className="font-bold text-emerald-950">
                  {food.food_name}
                </p>

                <p className="text-sm text-slate-500">
                  {food.cuisine ?? "Global"} • FODMAP:{" "}
                  {food.fodmap_level ?? "Unknown"}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Meal time

            <select
              className={inputClass}
              value={mealType}
              onChange={(event) =>
                setMealType(event.target.value)
              }
            >
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
              <option value="Snack">Snack</option>
            </select>
          </label>

          <label className={labelClass}>
            Meal name

            <input
              className={inputClass}
              value={mealName}
              onChange={(event) =>
                setMealName(event.target.value)
              }
              placeholder="Example: Chicken and rice"
            />
          </label>

          <label className={labelClass}>
            Ingredients / foods eaten

            <input
              className={inputClass}
              value={ingredients}
              onChange={(event) =>
                setIngredients(event.target.value)
              }
              placeholder="Example: Rice, chicken, vegetables"
            />
          </label>

          <label className={labelClass}>
            Drinks

            <input
              className={inputClass}
              value={drinks}
              onChange={(event) =>
                setDrinks(event.target.value)
              }
              placeholder="Example: Water, coffee"
            />
          </label>

          <label className={labelClass}>
            Portion size

            <select
              className={inputClass}
              value={portionSize}
              onChange={(event) =>
                setPortionSize(event.target.value)
              }
            >
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
              <option value="Very large">Very large</option>
            </select>
          </label>

          <label className={labelClass}>
            Location

            <select
              className={inputClass}
              value={locationType}
              onChange={(event) =>
                setLocationType(event.target.value)
              }
            >
              <option value="Home">Home</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Office">Office</option>
              <option value="Travel">Travel</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label className={labelClass}>
            Cooking method

            <select
              className={inputClass}
              value={cookingMethod}
              onChange={(event) =>
                setCookingMethod(event.target.value)
              }
            >
              <option value="">Select</option>
              <option value="Boiled">Boiled</option>
              <option value="Steamed">Steamed</option>
              <option value="Grilled">Grilled</option>
              <option value="Fried">Fried</option>
              <option value="Baked">Baked</option>
              <option value="Raw">Raw</option>
              <option value="Mixed">Mixed</option>
            </select>
          </label>

          <label className={labelClass}>
            Estimated FODMAP level

            <select
              className={inputClass}
              value={fodmapLevel}
              onChange={(event) =>
                setFodmapLevel(event.target.value)
              }
            >
              <option value="Unknown">Unknown</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-950">
            Possible trigger tags
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {triggerTags.map((tag) => (
              <label
                key={tag.label}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={tag.value}
                  onChange={(event) =>
                    tag.setter(event.target.checked)
                  }
                />

                {tag.label}
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
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Add any extra details about the meal"
          />
        </label>

        <MealAnalysisPreview mealText={mealPreviewText} />

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void runMealAnalysis(false)}
            disabled={isAnalyzingMeal || !hasMealInputContent(buildMealAnalysisInput())}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#10B981] px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(16,185,129,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAnalyzingMeal ? "MUNA is analysing your meal…" : "Analyse meal"}
          </button>
          <p className="self-center text-xs font-semibold leading-5 text-slate-500">
            Analysis runs only when you tap the button. Results stay on this screen until you save the meal.
          </p>
        </div>

        {mealAnalysis ? (
          <MealAnalysisResultPanel
            analysis={mealAnalysis}
            cached={mealAnalysisCached}
            isLoading={isAnalyzingMeal}
            error={mealAnalysisError}
            notice={mealAnalysisNotice}
            onAnalyzeAgain={() => void runMealAnalysis(true)}
          />
        ) : mealAnalysisError ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">
            {mealAnalysisError}
          </p>
        ) : null}

        <SaveEntryButton
          table="meals"
          onSuccess={handleMealSaved}
          getPayload={() => ({
            meal_type: mealType,

            foods:
              [mealName, ingredients, drinks]
                .filter(Boolean)
                .join(" | ") || "Meal not specified",

            eaten_at: new Date().toISOString(),

            notes: [
              notes,
              `Portion: ${portionSize}`,
              `Location: ${locationType}`,
              cookingMethod
                ? `Cooking: ${cookingMethod}`
                : "",
              `FODMAP: ${fodmapLevel}`,

              `Tags: ${
                [
                  isSpicy && "spicy",
                  hasDairy && "dairy",
                  hasGluten && "gluten",
                  hasOnion && "onion",
                  hasGarlic && "garlic",
                  hasCaffeine && "caffeine",
                  hasAlcohol && "alcohol",
                ]
                  .filter(Boolean)
                  .join(", ") || "none"
              }`,
            ]
              .filter(Boolean)
              .join("\n"),
          })}
        />
      </FormCard>
    </AppShell>
  );
}