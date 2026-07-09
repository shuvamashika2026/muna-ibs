type TodayPlanCardProps = {
  items: string[];
};

export function TodayPlanCard({ items }: TodayPlanCardProps) {
  return (
    <div className="rounded-2xl bg-emerald-50 p-4 shadow-sm">
      <p className="font-bold text-emerald-950">Today&apos;s Plan</p>

      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-emerald-800">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}