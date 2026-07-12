import Link from "next/link";

const terms = [
  {
    title: "What MUNA Is",
    body: "MUNA is an educational IBS self-tracking and Brain-Gut Health Companion. It helps users log meals, symptoms, bowel movements, hydration, sleep, stress, medication reminders, and related lifestyle patterns.",
  },
  {
    title: "What MUNA Is Not",
    body: "MUNA is not a medical device, diagnostic tool, treatment service, emergency service, or replacement for professional healthcare. MUNA does not claim to cure IBS or any medical condition.",
  },
  {
    title: "Medical Safety",
    body: "Always speak with a qualified healthcare professional for medical advice, diagnosis, treatment, diet changes, medication decisions, or urgent symptoms. If you experience red-flag symptoms such as blood in stool, black stool, severe pain, fever, dehydration, fainting, or unexplained weight loss, seek urgent medical care.",
  },
  {
    title: "User Responsibility",
    body: "You are responsible for the information you enter and for how you use educational insights from MUNA. Do not rely on MUNA as the only basis for medical decisions.",
  },
  {
    title: "AI Responses",
    body: "MUNA AI provides educational and supportive information based on user-provided logs where available. AI responses may be incomplete or incorrect and should be discussed with a qualified professional when health decisions are involved.",
  },
  {
    title: "Account and Data",
    body: "You may request access, correction, export, or deletion of your account data through the Contact page.",
  },
  {
    title: "Acceptable Use",
    body: "You must not misuse the app, attempt to access another user's data, interfere with the service, or use MUNA for unlawful purposes.",
  },
  {
    title: "Intellectual Property",
    body: "MUNA's name, app design, content, software, and educational materials belong to MUNA or its licensors. You may use the app for personal, lawful wellness tracking only.",
  },
  {
    title: "Limitation of Liability",
    body: "To the fullest extent permitted by law, MUNA is not responsible for health decisions, outcomes, losses, or damages that arise from relying on educational app content instead of qualified professional care.",
  },
  {
    title: "Changes",
    body: "These terms may be updated as MUNA develops. Continued use of the app means acceptance of the updated terms.",
  },
];

export default function TermsPage() {
  return (
    <main className="muna-page-surface min-h-screen px-4 py-8">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
        <Link href="/" className="text-sm font-black text-[#0F766E]">
          MUNA
        </Link>
        <h1 className="mt-4 text-4xl font-black tracking-normal text-[#0F172A]">Terms of Use</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          By using MUNA, you agree to these Terms of Use.
        </p>

        <div className="mt-8 grid gap-4">
          {terms.map((term) => (
            <section key={term.title} className="rounded-2xl bg-white p-5 ring-1 ring-emerald-100">
              <h2 className="text-xl font-black text-[#0F172A]">{term.title}</h2>
              <p className="mt-2 leading-7 text-slate-600">{term.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-2xl bg-[#ECFDF5] p-5">
          <h2 className="text-xl font-black text-[#0F172A]">Contact</h2>
          <p className="mt-2 leading-7 text-slate-600">
            Questions about these terms can be sent to{" "}
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
