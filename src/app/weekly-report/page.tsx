import { AppShell } from "@/components/app-shell";
import { DisclaimerNotice } from "@/components/disclaimer-notice";
import { PrintButton } from "./print-button";

export default function WeeklyReportPage() {
  return (
    <AppShell title="Weekly report" subtitle="Export this summary as a PDF using your browser print dialog.">
      <div className="grid gap-5">
        <DisclaimerNotice compact />
        <div className="no-print">
          <PrintButton />
        </div>
        <section className="print-card rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-bold text-emerald-950">MUNA IBS weekly summary</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">Meals logged</p>
              <p className="mt-2 text-3xl font-bold text-emerald-950">18</p>
            </div>
            <div className="rounded-lg bg-sky-50 p-4">
              <p className="text-sm font-semibold text-sky-800">Avg symptom severity</p>
              <p className="mt-2 text-3xl font-bold text-sky-950">3/10</p>
            </div>
            <div className="rounded-lg bg-teal-50 p-4">
              <p className="text-sm font-semibold text-teal-800">Avg sleep</p>
              <p className="mt-2 text-3xl font-bold text-teal-950">7.2 h</p>
            </div>
          </div>
          <div className="mt-5 rounded-lg border border-slate-100 p-4">
            <h3 className="font-bold text-emerald-950">Notes for clinician visit</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review repeated symptom timing, stress levels, sleep, and food logs with a qualified doctor or dietitian.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
