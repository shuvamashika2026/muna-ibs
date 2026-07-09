import { LucideIcon } from "lucide-react";

type Card = {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
};

type StatsCardsProps = {
  cards: Card[];
};

export function StatsCards({ cards }: StatsCardsProps) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <Icon className="h-6 w-6 text-emerald-700" />

            <p className="mt-4 text-sm font-semibold text-slate-500">
              {card.label}
            </p>

            <p className="mt-1 text-3xl font-bold text-emerald-950">
              {card.value}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {card.hint}
            </p>
          </div>
        );
      })}
    </div>
  );
}