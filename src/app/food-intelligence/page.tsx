"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type FoodItem = {
  id: string;
  food_name: string;
  category: string | null;
  fodmap_level: string | null;
  common_triggers: string[] | null;
  cuisine: string | null;
  country: string | null;
  aliases: string[] | null;
  ingredients_summary: string | null;
  user_verified: boolean | null;
  ai_confidence: number | null;
  notes: string | null;
};

export default function FoodIntelligencePage() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadFoods() {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("food_items")
        .select("*")
        .order("food_name", { ascending: true });

      if (!error) setFoods(data ?? []);
    }

    loadFoods();
  }, []);

  const filteredFoods = foods.filter((food) => {
    const text = [
      food.food_name,
      food.category,
      food.fodmap_level,
      food.cuisine,
      food.country,
      food.ingredients_summary,
      ...(food.aliases ?? []),
      ...(food.common_triggers ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <AppShell
      title="Global Food Intelligence"
      subtitle="Explore foods, cuisines, FODMAP levels, aliases, and common IBS triggers."
    >
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <input
          className="w-full rounded-xl border border-slate-200 px-4 py-3"
          placeholder="Search food, cuisine, country, alias, trigger..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {filteredFoods.map((food) => (
          <div
            key={food.id}
            className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-emerald-950">
                  {food.food_name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {food.cuisine ?? "Cuisine not set"} •{" "}
                  {food.country ?? "Country not set"}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  food.fodmap_level === "Low"
                    ? "bg-emerald-100 text-emerald-800"
                    : food.fodmap_level === "Medium"
                    ? "bg-amber-100 text-amber-800"
                    : food.fodmap_level === "High"
                    ? "bg-red-100 text-red-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {food.fodmap_level ?? "Unknown"}
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>
                <strong>Category:</strong> {food.category ?? "Not classified"}
              </p>

              <p>
                <strong>Ingredients:</strong>{" "}
                {food.ingredients_summary ?? "Not available"}
              </p>

              <p>
                <strong>Triggers:</strong>{" "}
                {food.common_triggers?.length
                  ? food.common_triggers.join(", ")
                  : "None listed"}
              </p>

              <p>
                <strong>Aliases:</strong>{" "}
                {food.aliases?.length ? food.aliases.join(", ") : "None"}
              </p>

              <p>
                <strong>AI confidence:</strong>{" "}
                {food.ai_confidence ? `${food.ai_confidence}%` : "Not scored"}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {food.user_verified ? "User verified" : "Not verified"}
              </p>
            </div>

            {food.notes && (
              <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-slate-700">
                {food.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}