import {
  Activity,
  Apple,
  Bed,
  Brain,
  ClipboardList,
  Droplet,
  FileText,
  HeartPulse,
  Pill,
  Salad,
  Settings,
  Sparkles,
  Utensils,
} from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Activity },
  { href: "/ai-chat", label: "🧠 MUNA AI", icon: Brain },
  { href: "/add-meal", label: "Add meal", icon: Utensils },
  { href: "/add-symptoms", label: "Symptoms", icon: HeartPulse },
  { href: "/bowel-movement", label: "Bowel", icon: ClipboardList },
  { href: "/trigger-analysis", label: "Triggers", icon: Sparkles },
  { href: "/food-guide", label: "Food guide", icon: Apple },
  { href: "/meal-planner", label: "Meal planner", icon: Salad },
  { href: "/weekly-report", label: "Report", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const dashboardCards = [
  { label: "Water today", value: "6 cups", hint: "Goal: 8 cups", icon: Droplet },
  { label: "Sleep", value: "7.5 h", hint: "Last night", icon: Bed },
  { label: "Medication", value: "1 reminder", hint: "After dinner", icon: Pill },
  { label: "Symptoms", value: "Mild", hint: "Latest check-in", icon: HeartPulse },
];

export const lowFodmapFoods = [
  { group: "Grains", try: "Rice, oats, quinoa", limit: "Wheat bread, pasta" },
  { group: "Protein", try: "Eggs, chicken, tofu", limit: "Beans, lentils" },
  { group: "Fruit", try: "Banana, orange, grapes", limit: "Apple, mango, pear" },
  { group: "Vegetables", try: "Carrot, cucumber, spinach", limit: "Onion, garlic, cauliflower" },
  { group: "Dairy", try: "Lactose-free milk, hard cheese", limit: "Regular milk, soft cheese" },
];

export const bristolScale = [
  { type: 1, label: "Separate hard lumps", note: "Often hard to pass" },
  { type: 2, label: "Lumpy sausage shape", note: "May suggest constipation" },
  { type: 3, label: "Cracked sausage shape", note: "Common stool form" },
  { type: 4, label: "Smooth soft sausage", note: "Often considered typical" },
  { type: 5, label: "Soft blobs", note: "Easy to pass" },
  { type: 6, label: "Mushy pieces", note: "Loose stool" },
  { type: 7, label: "Watery", note: "No solid pieces" },
];
