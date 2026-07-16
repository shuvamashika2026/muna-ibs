/** Typical recipe components — inferences only, never presented as confirmed facts. */

export type RecipeTemplate = {
  mealPattern: RegExp;
  label: string;
  likelyComponents: Array<{ ingredient: string; confidence: "Moderate" | "High" }>;
};

export const RECIPE_TEMPLATES: RecipeTemplate[] = [
  {
    mealPattern: /\bbiryani\b/i,
    label: "Biryani-style dish",
    likelyComponents: [
      { ingredient: "rice", confidence: "High" },
      { ingredient: "onion", confidence: "Moderate" },
      { ingredient: "garlic", confidence: "Moderate" },
      { ingredient: "yoghurt", confidence: "Moderate" },
      { ingredient: "chilli", confidence: "Moderate" },
      { ingredient: "high-fat foods", confidence: "Moderate" },
    ],
  },
  {
    mealPattern: /\bburger\b/i,
    label: "Burger",
    likelyComponents: [
      { ingredient: "bread", confidence: "High" },
      { ingredient: "beef", confidence: "Moderate" },
      { ingredient: "onion", confidence: "Moderate" },
      { ingredient: "garlic", confidence: "Moderate" },
      { ingredient: "cheese", confidence: "Moderate" },
      { ingredient: "fried foods", confidence: "Moderate" },
    ],
  },
  {
    mealPattern: /\bcurry\b|\bmasala\b|\bkorma\b/i,
    label: "Curry-style dish",
    likelyComponents: [
      { ingredient: "onion", confidence: "Moderate" },
      { ingredient: "garlic", confidence: "Moderate" },
      { ingredient: "chilli", confidence: "Moderate" },
      { ingredient: "high-fat foods", confidence: "Moderate" },
      { ingredient: "cream", confidence: "Moderate" },
    ],
  },
  {
    mealPattern: /\bsalad\b/i,
    label: "Salad",
    likelyComponents: [
      { ingredient: "lettuce", confidence: "Moderate" },
      { ingredient: "cucumber", confidence: "Moderate" },
      { ingredient: "tomato", confidence: "Moderate" },
    ],
  },
  {
    mealPattern: /\bpizza\b/i,
    label: "Pizza",
    likelyComponents: [
      { ingredient: "pizza", confidence: "High" },
      { ingredient: "cheese", confidence: "High" },
      { ingredient: "onion", confidence: "Moderate" },
      { ingredient: "garlic", confidence: "Moderate" },
    ],
  },
];
