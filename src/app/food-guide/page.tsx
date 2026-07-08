import { AppShell } from "@/components/app-shell";
import { lowFodmapFoods } from "@/lib/data";

export default function FoodGuidePage() {
  return (
    <AppShell title="Low-FODMAP food guide" subtitle="A simple reference list for conversations with your doctor or dietitian.">
      <div className="grid gap-4 md:grid-cols-2">
        {lowFodmapFoods.map((item) => (
          <div key={item.group} className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-emerald-950">{item.group}</h2>
            <div className="mt-4 grid gap-3">
              <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950">
                <span className="font-semibold">Often lower FODMAP: </span>
                {item.try}
              </p>
              <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-950">
                <span className="font-semibold">Often limited: </span>
                {item.limit}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
