import { supabase } from "@/lib/supabase";

export type FoodItem = {
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

export async function searchFoods(query: string): Promise<FoodItem[]> {
  if (!supabase || !query.trim()) return [];

  const { data, error } = await supabase
    .from("food_items")
    .select("*")
    .or(
      `food_name.ilike.%${query}%,category.ilike.%${query}%,cuisine.ilike.%${query}%,country.ilike.%${query}%,ingredients_summary.ilike.%${query}%`
    )
    .order("food_name", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Food search error:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getFoodById(id: string): Promise<FoodItem | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("food_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Get food error:", error.message);
    return null;
  }

  return data;
}