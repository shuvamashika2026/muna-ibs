import { Sparkles } from "lucide-react";

type AIInsightCardProps = {
  insight: string;
};

export function AIInsightCard({ insight }: AIInsightCardProps) {
  return (
    <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-1 h-6 w-6 text-amber-700" />
        <div>
          <h2 className="text-xl font-bold text-amber-950">AI Insight v1</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">{insight}</p>
        </div>
      </div>
    </div>
  );
}