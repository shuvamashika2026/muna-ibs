import Link from "next/link";
import { ArrowRight, CalendarCheck, FileText, HeartPulse, Salad } from "lucide-react";
import { DisclaimerNotice } from "@/components/disclaimer-notice";

const highlights = [
  { label: "Track meals and symptoms", icon: Salad },
  { label: "Log bowel movements", icon: HeartPulse },
  { label: "Plan three daily meals", icon: CalendarCheck },
  { label: "Export weekly reports", icon: FileText },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-14">
        <div>
          <p className="mb-3 inline-flex rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900">
            IBS support companion
          </p>
          <h1 className="text-5xl font-bold tracking-normal text-emerald-950 md:text-6xl">MUNA IBS</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            A calm, mobile-first tracker for food, symptoms, possible triggers, bowel movements, stress,
            water, sleep, meal planning, and weekly summaries.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-sm"
            >
              Get started <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-14 items-center justify-center rounded-lg border border-emerald-200 bg-white px-6 py-4 text-base font-semibold text-emerald-900"
            >
              View dashboard
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-lg">
          <div className="grid gap-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-4 rounded-lg bg-emerald-50 p-4">
                  <span className="grid h-12 w-12 place-items-center rounded-lg bg-white text-emerald-700">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="text-lg font-semibold text-emerald-950">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <DisclaimerNotice />
      </section>
    </main>
  );
}
