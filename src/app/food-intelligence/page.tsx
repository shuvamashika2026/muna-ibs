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

  const filteredFoods = foods.filter((food) =>
    food.food_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell
      title="Food Intelligence"
      subtitle="Explore foods, FODMAP levels, and common IBS triggers."
    >
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <input
          className="w-full rounded-xl border border-slate-200 px-4 py-3"
          placeholder="Search food, e.g. onion, rice, milk"
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
            <h2 className="text-xl font-bold text-emerald-950">
              {food.food_name}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Category: {food.category ?? "Not classified"}
            </p>

            <p className="mt-2 text-sm font-semibold">
              FODMAP: {food.fodmap_level ?? "Unknown"}
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Triggers:{" "}
              {food.common_triggers?.length
                ? food.common_triggers.join(", ")
                : "None listed"}
            </p>

            {food.notes && (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {food.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}