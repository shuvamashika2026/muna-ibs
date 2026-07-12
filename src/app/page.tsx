import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, FileText, Globe2, HeartPulse, Salad } from "lucide-react";
import { DisclaimerNotice } from "@/components/disclaimer-notice";

const highlights = [
  { label: "Track meals and symptoms", icon: Salad },
  { label: "Log bowel movements", icon: HeartPulse },
  { label: "Plan three daily meals", icon: CalendarCheck },
  { label: "Export weekly reports", icon: FileText },
];

export default function LandingPage() {
  return (
    <main className="muna-page-surface min-h-screen">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-14">
        <div>
          <p className="mb-3 inline-flex rounded-2xl bg-[#D1FAE5] px-4 py-2 text-sm font-black text-[#065F46]">
            IBS support companion
          </p>
          <h1 className="text-5xl font-black tracking-normal text-[#0F172A] md:text-6xl">
            Your AI <span className="text-[#10B981]">Brain-Gut</span> Health Companion
          </h1>
          <p className="mt-5 max-w-xl text-lg font-medium leading-8 text-slate-600">
            A calm, mobile-first tracker for food, symptoms, possible triggers, bowel movements, stress,
            water, sleep, meal planning, and weekly summaries.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-6 py-4 text-base font-bold text-white shadow-[0_16px_34px_rgba(15,118,110,0.24)]"
            >
              Get started <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-emerald-200 bg-white px-6 py-4 text-base font-bold text-[#065F46] shadow-sm"
            >
              View dashboard
            </Link>
          </div>

          <div className="muna-dark-panel mt-8 max-w-xl rounded-[1.7rem] p-5">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#10B981]">
                <Globe2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-[#10B981]">
                  Community Impact
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  95,000+ IBS community members available for early testing
                </p>
                <Link
                  href="/login"
                  className="mt-4 inline-flex rounded-2xl bg-[#10B981] px-5 py-3 text-sm font-black text-white shadow-lg"
                >
                  Join the waitlist
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="muna-card rounded-[2rem] p-5">
          <div className="mb-5 overflow-hidden rounded-3xl bg-white">
            <Image
              src="/brand/muna-logo.png"
              alt="MUNA IBS Brain Gut Intelligence logo"
              width={900}
              height={900}
              className="h-auto w-full"
              priority
            />
          </div>
          <div className="grid gap-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-4 rounded-2xl bg-[#ECFDF5] p-4">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#10B981] shadow-sm">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="text-lg font-black text-[#0F172A]">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <DisclaimerNotice />
        <nav className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-[#0F766E]" aria-label="Legal and support links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Use</Link>
          <Link href="/about">About MUNA</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </section>
    </main>
  );
}
