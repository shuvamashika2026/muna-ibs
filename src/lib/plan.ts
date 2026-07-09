export type TodayPlanInput = {
  waterToday: number;
  waterGoal: number;
  sleepHours: number;
  sleepGoal: number;
  riskLevel: "Low" | "Moderate" | "High";
  hasHighFodmapMeal: boolean;
  painLevel: number;
  stressLevel: number;
};

export function generateTodayPlan(input: TodayPlanInput): string[] {
  const plan: string[] = [];

  // Hydration
  if (input.waterToday < input.waterGoal) {
    const remaining = Math.max(0, input.waterGoal - input.waterToday);
    plan.push(`💧 Drink another ${remaining} mL of water today.`);
  } else {
    plan.push("💧 Great job! You've reached your hydration goal.");
  }

  // Sleep
  if (input.sleepHours < input.sleepGoal) {
    plan.push(
      `😴 Try to get at least ${input.sleepGoal} hours of sleep tonight.`
    );
  }

  // Stress
  if (input.stressLevel >= 7) {
    plan.push("🧘 Spend 10 minutes on breathing or relaxation exercises.");
  }

  // Pain
  if (input.painLevel >= 7) {
    plan.push("🍲 Choose gentle, easy-to-digest meals today.");
  }

  // Food
  if (input.hasHighFodmapMeal) {
    plan.push("🥗 Choose a low-FODMAP meal for your next meal.");
  }

  // Overall risk
  if (input.riskLevel === "High") {
    plan.push("⚠️ Your IBS flare risk is high today. Log symptoms carefully.");
  } else if (input.riskLevel === "Moderate") {
    plan.push("📋 Continue healthy habits to reduce today's flare risk.");
  } else {
    plan.push("✅ You're doing well. Keep following your current routine.");
  }

  return plan;
}