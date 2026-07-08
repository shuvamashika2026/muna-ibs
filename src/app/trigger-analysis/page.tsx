import { AppShell } from "@/components/app-shell";

const rows = [
  { food: "Milk tea", count: 4, confidence: "Watch" },
  { food: "Fried snacks", count: 3, confidence: "Watch" },
  { food: "Onion", count: 2, confidence: "Possible" },
];

export default function TriggerAnalysisPage() {
  return (
    <AppShell title="Trigger analysis" subtitle="Patterns are suggestions for discussion with a qualified clinician, not a diagnosis.">
      <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-sm text-slate-500">
                <th className="py-3">Food</th>
                <th className="py-3">Times near symptoms</th>
                <th className="py-3">Signal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.food} className="border-b border-slate-100 last:border-0">
                  <td className="py-4 font-semibold text-emerald-950">{row.food}</td>
                  <td className="py-4 text-slate-700">{row.count}</td>
                  <td className="py-4">
                    <span className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">{row.confidence}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
