import Link from "next/link";

const values = [
  {
    title: "Mission",
    body: "Help people living with IBS understand their personal brain-gut patterns through compassionate tracking, education, and habit support.",
  },
  {
    title: "Vision",
    body: "Build a trusted Brain-Gut Health Companion that helps users move from tracking symptoms to understanding patterns and preparing better conversations with qualified healthcare professionals.",
  },
  {
    title: "Founder Story",
    body: "MUNA was created from a simple belief: people living with IBS deserve calm, practical tools that make daily patterns easier to understand without fear, confusion, or false promises.",
  },
  {
    title: "Responsible AI",
    body: "MUNA AI is designed to provide educational support, explain its reasoning, encourage safer choices, and remind users to seek qualified professional care for medical concerns.",
  },
];

export default function AboutPage() {
  return (
    <main className="muna-page-surface min-h-screen px-4 py-8">
      <article className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-black text-[#0F766E]">
          MUNA
        </Link>

        <section className="mt-5 overflow-hidden rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm md:p-10">
          <p className="inline-flex rounded-full bg-[#D1FAE5] px-4 py-2 text-sm font-black text-[#065F46]">
            About MUNA
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-normal text-[#0F172A] md:text-6xl">
            Brain-Gut support built with care.
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
            MUNA is an AI-powered IBS companion for logging food, symptoms, bowel habits, stress,
            sleep, hydration, medication reminders, and daily routines.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {values.map((item) => (
            <div key={item.title} className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-black text-[#0F172A]">{item.title}</h2>
              <p className="mt-3 leading-7 text-slate-600">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-[1.75rem] bg-[#ECFDF5] p-5 ring-1 ring-emerald-100">
          <h2 className="text-xl font-black text-[#0F172A]">Medical Safety</h2>
          <p className="mt-3 leading-7 text-slate-700">
            MUNA provides educational information and wellness coaching only. It does not diagnose,
            treat, or cure medical conditions, and it does not replace doctors, dietitians,
            psychologists, or other qualified healthcare professionals.
          </p>
        </section>
      </article>
    </main>
  );
}
