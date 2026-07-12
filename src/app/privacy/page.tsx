import Link from "next/link";

const dataCategories = [
  "Account information, such as your email address and authentication details.",
  "Profile information, such as your name and optional preferences you choose to enter.",
  "Health and wellness logs, including meals, foods, symptoms, bowel movements, Bristol stool type, stress, sleep, hydration, medication reminders, trigger notes, weekly reports, and related app activity.",
  "AI chat content, including questions and messages you choose to send to MUNA AI.",
  "Technical information needed to operate and protect the service, such as basic device, browser, app, and security information.",
];

const dataUses = [
  "Create and protect your account.",
  "Save and show your personal logs.",
  "Help you understand patterns across food, symptoms, bowel habits, stress, sleep, water, and medication reminders.",
  "Generate educational summaries, dashboards, and AI-supported insights.",
  "Improve app safety, reliability, and user experience.",
];

export default function PrivacyPage() {
  return (
    <main className="muna-page-surface min-h-screen px-4 py-8">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
        <Link href="/" className="text-sm font-black text-[#0F766E]">
          MUNA
        </Link>
        <h1 className="mt-4 text-4xl font-black tracking-normal text-[#0F172A]">Privacy Policy</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          MUNA is an educational Brain-Gut Health Companion for IBS self-tracking. MUNA does not provide
          medical diagnosis, treatment, or emergency care, and it does not replace a qualified doctor,
          dietitian, psychologist, or other healthcare professional.
        </p>

        <Section title="Data We Collect" items={dataCategories} />
        <Section title="Why We Collect This Data" items={dataUses} />

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-black text-[#0F172A]">Sensitive Health Data</h2>
          <p className="leading-7 text-slate-600">
            MUNA may store sensitive health-related information that you choose to enter. Only enter
            information you are comfortable storing in the app.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-black text-[#0F172A]">AI Processing</h2>
          <p className="leading-7 text-slate-600">
            When you ask MUNA AI a question, relevant user-provided logs may be used to generate a more
            personalised educational response. MUNA AI is not a doctor and does not diagnose, prescribe, or
            treat medical conditions.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-black text-[#0F172A]">Your Rights</h2>
          <p className="leading-7 text-slate-600">
            You may request access, correction, export, or deletion of your data. You may also request
            deletion of your account and associated data by submitting a data deletion request. Some
            deletion steps may require verification of account ownership.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-black text-[#0F172A]">Security</h2>
          <p className="leading-7 text-slate-600">
            MUNA uses Supabase authentication and database access controls. No online system can be
            guaranteed to be completely secure.
          </p>
        </section>

        <section className="mt-8 rounded-2xl bg-[#ECFDF5] p-5">
          <h2 className="text-xl font-black text-[#0F172A]">Contact</h2>
          <p className="mt-2 leading-7 text-slate-600">
            For privacy requests, contact{" "}
            <a className="font-black text-[#0F766E]" href="mailto:support.munaibs@gmail.com">
              support.munaibs@gmail.com
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-black text-[#0F172A]">{title}</h2>
      <ul className="mt-4 grid gap-3">
        {items.map((item) => (
          <li key={item} className="rounded-2xl bg-emerald-50 px-4 py-3 font-semibold leading-7 text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
