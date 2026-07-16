export type DashboardStats = {
  userName: string;
  gutScore: number | null;
  flareRisk: "Low" | "Medium" | "High" | null;
  confidence: number | null;
  pain: number;
  bloating: number;
  stress: number;
  sleepHours: number;
  waterLiters: number;
  bristolType: number;
};

export function createEmptyDashboardStats(userName = ""): DashboardStats {
  return {
    userName,
    gutScore: null,
    flareRisk: null,
    confidence: null,
    pain: 0,
    bloating: 0,
    stress: 0,
    sleepHours: 0,
    waterLiters: 0,
    bristolType: 0,
  };
}

export type DashboardTrendPoint = {
  day: string;
  gut: number;
  stress: number;
  sleep: number;
  water: number;
  bristol: number;
};

export function createEmptyTrendData(): DashboardTrendPoint[] {
  return [];
}
