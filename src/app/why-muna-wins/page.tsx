import Link from "next/link";
import {
  Brain,
  Check,
  Cloud,
  Code2,
  Database,
  Image,
  MoveDown,
  Sparkles,
  X,
} from "lucide-react";

const problemItems = ["bloating", "abdominal pain", "constipation", "diarrhoea", "food anxiety", "stress"];

const solutionItems = [
  "Artificial Intelligence",
  "Brain-Gut Science",
  "Food",
  "Stress",
  "Sleep",
  "Hydration",
  "Bowel Health",
  "Behaviour Change",
];

const comparisonRows = [
  ["Food diary", true, false, true],
  ["Symptom diary", true, false, true],
  ["Sleep", "basic", false, true],
  ["Stress", "basic", false, true],
  ["Water", "basic", false, true],
  ["AI chat", false, true, true],
  ["Personalised insights", false, "basic", true],
  ["Brain-Gut intelligence", false, false, true],
  ["Flare prediction", false, false, true],
  ["Food image analysis", false, false, "Planned"],
  ["Stool image analysis", false, false, "Planned"],
  ["Voice AI", false, true, "Planned"],
  ["Hypnotherapy", false, false, "Planned"],
  ["Wearables", false, false, "Planned"],
];

const techItems = [
  { label: "React", icon: Code2 },
  { label: "Next.js", icon: Sparkles },
  { label: "Supabase", icon: Database },
  { label: "OpenAI", icon: Brain },
  { label: "Progressive Web App", icon: Image },
  { label: "Cloud Sync", icon: Cloud },
];

const roadmap = [
  "Now",
  "AI Companion",
  "Brain-Gut Intelligence",
  "Computer Vision",
  "Voice AI",
  "Wearables",
  "Global Gut Intelligence",
];

export default function WhyMunaWinsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#0F172A]">
      <section className="relative px-4 py-8 md:px-6">
        <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[#D1FAE5] blur-3xl" />
        <div className="absolute right-[-8rem] top-40 h-96 w-96 rounded-full bg-[#10B981]/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-black text-[#0F766E]">
              MUNA
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-[#0F766E] px-5 py-3 text-sm font-black text-white shadow-[0_16px_34px_rgba(15,118,110,0.22)]"
            >
              Open App
            </Link>
          </nav>

          <div className="grid gap-10 py-20 md:py-28 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <p className="mb-4 w-fit rounded-full bg-[#ECFDF5] px-4 py-2 text-sm font-black uppercase tracking-[0.24em] text-[#0F766E]">
                Why MUNA Wins
              </p>
              <h1 className="max-w-5xl text-6xl font-black tracking-normal md:text-8xl">
                Building the world&apos;s first AI-powered Brain-Gut Health Platform.
              </h1>
            </div>

            <div className="muna-card rounded-[2.5rem] p-6">
              <div className="rounded-[2rem] bg-gradient-to-br from-[#0F766E] to-[#10B981] p-7 text-white">
                <Brain className="h-14 w-14" aria-hidden="true" />
                <p className="mt-8 text-4xl font-black">Not another tracker.</p>
                <p className="mt-4 text-base font-semibold leading-7 text-emerald-50">
                  MUNA turns daily logs into health intelligence, predictions, coaching, and prevention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section eyebrow="The Problem" title="IBS is common, complex and underserved.">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="muna-card rounded-[2rem] p-6">
            <p className="text-5xl font-black text-[#0F766E]">10-15%</p>
            <p className="mt-4 text-lg font-bold leading-8 text-slate-600">
              IBS affects approximately 10-15% of people worldwide.
            </p>
            <p className="mt-4 text-base font-semibold leading-7 text-slate-500">
              Current applications mostly collect information but provide limited personalised guidance.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {problemItems.map((item) => (
              <div key={item} className="rounded-[1.4rem] border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="text-lg font-black capitalize">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section eyebrow="Our Solution" title="MUNA combines the signals that matter.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {solutionItems.map((item) => (
            <GlassTile key={item} label={item} />
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-xl font-bold leading-9 text-slate-600">
          Together, these signals generate personalised health intelligence for digestive wellness.
        </p>
      </Section>

      <Section eyebrow="Competitive Comparison" title="Why MUNA is different.">
        <ComparisonTable />
      </Section>

      <Section eyebrow="Technology" title="A modern AI health stack.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {techItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="muna-card rounded-[1.75rem] p-6">
                <Icon className="h-7 w-7 text-[#10B981]" aria-hidden="true" />
                <p className="mt-5 text-2xl font-black">{item.label}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section eyebrow="Vision" title="Digestive healthcare should move forward.">
        <div className="mx-auto grid max-w-3xl gap-4 text-center">
          {["Tracking", "Understanding", "Prediction", "Personalised prevention"].map((item, index) => (
            <div key={item}>
              <div className="muna-soft-card rounded-[1.75rem] p-6">
                <p className="text-3xl font-black text-[#0F172A]">{item}</p>
              </div>
              {index < 3 ? <MoveDown className="mx-auto my-3 h-7 w-7 text-[#10B981]" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Roadmap Timeline" title="From companion to global gut intelligence.">
        <div className="mx-auto max-w-3xl">
          {roadmap.map((item, index) => (
            <div key={item}>
              <div className="muna-card rounded-[1.75rem] p-5">
                <p className="text-2xl font-black text-[#0F172A]">{item}</p>
              </div>
              {index < roadmap.length - 1 ? (
                <MoveDown className="mx-auto my-3 h-7 w-7 text-[#10B981]" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <footer className="muna-dark-panel mx-4 mb-6 rounded-[2.5rem] p-8 text-center md:mx-6 md:p-14">
        <p className="text-4xl font-black text-white md:text-6xl">MUNA</p>
        <p className="mt-4 text-lg font-bold text-emerald-50">Building the future of Brain-Gut Health.</p>
      </footer>
    </main>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-14 md:px-6 md:py-20">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#0F766E]">{eyebrow}</p>
        <h2 className="mt-3 mb-8 max-w-4xl text-4xl font-black leading-tight md:text-6xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function GlassTile({ label }: { label: string }) {
  return (
    <div className="muna-card rounded-[1.5rem] p-5">
      <Sparkles className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
      <p className="mt-4 text-lg font-black">{label}</p>
    </div>
  );
}

function ComparisonTable() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-[0_22px_70px_rgba(15,118,110,0.10)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-[#ECFDF5]">
            <tr>
              <th className="px-5 py-4 text-sm font-black text-slate-500">Capability</th>
              <th className="px-5 py-4 text-sm font-black text-slate-500">Traditional Tracker</th>
              <th className="px-5 py-4 text-sm font-black text-slate-500">Generic AI</th>
              <th className="px-5 py-4 text-sm font-black text-[#0F766E]">MUNA</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map(([capability, tracker, genericAi, muna]) => (
              <tr key={capability as string} className="border-t border-emerald-50">
                <td className="px-5 py-4 font-black text-[#0F172A]">{capability}</td>
                <ComparisonCell value={tracker} />
                <ComparisonCell value={genericAi} />
                <ComparisonCell value={muna} highlight />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComparisonCell({ value, highlight = false }: { value: string | boolean; highlight?: boolean }) {
  if (value === true) {
    return (
      <td className="px-5 py-4">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-black ${highlight ? "bg-[#D1FAE5] text-[#0F766E]" : "bg-slate-100 text-slate-600"}`}>
          <Check className="h-4 w-4" aria-hidden="true" />
          Yes
        </span>
      </td>
    );
  }

  if (value === false) {
    return (
      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-sm font-black text-slate-400">
          <X className="h-4 w-4" aria-hidden="true" />
          No
        </span>
      </td>
    );
  }

  return (
    <td className="px-5 py-4">
      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-black ${value === "Planned" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
        {value}
      </span>
    </td>
  );
}
