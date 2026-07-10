import Link from "next/link";
import {
  Brain,
  CalendarDays,
  Eye,
  Heart,
  Moon,
  Sparkles,
  Target,
  Utensils,
  Waves,
} from "lucide-react";

const solutionItems = [
  "Artificial Intelligence",
  "Brain-Gut Science",
  "Food Tracking",
  "Sleep",
  "Stress",
  "Hydration",
  "Bowel Patterns",
];

const productItems = [
  "Working Mobile App",
  "AI Companion",
  "Food Diary",
  "Symptom Diary",
  "Water Tracking",
  "Sleep Tracking",
  "Gut Score",
  "Brain-Gut Dashboard",
];

const roadmapItems = [
  { label: "AI Food Vision", icon: Eye },
  { label: "AI Stool Vision", icon: Waves },
  { label: "Voice AI", icon: Sparkles },
  { label: "Sleep Intelligence", icon: Moon },
  { label: "Hypnotherapy", icon: Brain },
  { label: "Meditation", icon: Heart },
  { label: "Wearables", icon: CalendarDays },
  { label: "Predictive Flare Engine", icon: Target },
];

export default function VisionPage() {
  return (
    <main className="min-h-screen bg-white text-[#0F172A]">
      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[#D1FAE5] blur-3xl" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-[#10B981]/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
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

          <div className="grid gap-10 py-20 md:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="mb-4 w-fit rounded-full bg-[#ECFDF5] px-4 py-2 text-sm font-black uppercase tracking-[0.24em] text-[#0F766E]">
                MUNA
              </p>
              <h1 className="max-w-4xl text-6xl font-black tracking-normal md:text-8xl">
                AI Brain-Gut Health Companion
              </h1>
              <p className="mt-7 max-w-2xl text-2xl font-bold leading-10 text-slate-600">
                Helping people understand their gut, not just track their symptoms.
              </p>
            </div>

            <div className="muna-card rounded-[2.5rem] p-6 md:p-8">
              <div className="rounded-[2rem] bg-gradient-to-br from-[#0F766E] to-[#10B981] p-7 text-white shadow-[0_24px_70px_rgba(15,118,110,0.25)]">
                <Brain className="h-14 w-14" aria-hidden="true" />
                <p className="mt-8 text-4xl font-black">Brain-Gut Intelligence</p>
                <p className="mt-4 text-base font-semibold leading-7 text-emerald-50">
                  Personal insights across food, stress, sleep, hydration, bowel patterns and daily routines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section eyebrow="Problem" title="IBS is common, complex, and deeply personal.">
        <div className="grid gap-5 lg:grid-cols-3">
          <GlassStat value="10-15%" label="of the global population is affected by IBS." />
          <GlassStat
            value="Millions"
            label="struggle with pain, bloating, constipation, diarrhoea, food anxiety and stress."
          />
          <GlassStat
            value="Tracking is not enough"
            label="Existing applications mostly record symptoms rather than helping people understand why symptoms occur."
          />
        </div>
      </Section>

      <Section eyebrow="Our Solution" title="MUNA connects the dots across the brain-gut system.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {solutionItems.map((item) => (
            <div key={item} className="rounded-[1.5rem] border border-emerald-100 bg-white p-5 shadow-sm">
              <Sparkles className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
              <p className="mt-4 text-lg font-black text-[#0F172A]">{item}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-xl font-bold leading-9 text-slate-600">
          Together, these signals generate personalised health insights that help users understand their unique patterns.
        </p>
      </Section>

      <Section eyebrow="Current Product" title="A working product foundation is already live.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {productItems.map((item) => (
            <div key={item} className="muna-soft-card rounded-[1.5rem] p-5">
              <CheckIcon />
              <p className="mt-4 text-lg font-black text-[#0F172A]">{item}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Roadmap" title="The path toward a full AI digestive health platform.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roadmapItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-[0_18px_55px_rgba(15,118,110,0.08)]">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ECFDF5] text-[#0F766E]">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="mt-5 text-lg font-black">{item.label}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <section className="px-4 py-16 md:px-6 md:py-24">
        <div className="muna-dark-panel mx-auto max-w-7xl rounded-[2.5rem] p-8 md:p-14">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#10B981]">Mission</p>
          <h2 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-7xl">
            Build the world&apos;s most trusted AI Brain-Gut Health Platform.
          </h2>
        </div>
      </section>

      <footer className="border-t border-emerald-100 px-4 py-10 text-center">
        <p className="text-lg font-black text-[#0F172A]">Made with ❤️ for the IBS community.</p>
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

function GlassStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="muna-card rounded-[2rem] p-6">
      <p className="text-4xl font-black text-[#0F766E]">{value}</p>
      <p className="mt-4 text-base font-bold leading-7 text-slate-600">{label}</p>
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#10B981] text-white">
      <Utensils className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}
