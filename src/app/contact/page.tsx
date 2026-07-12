import Link from "next/link";

const requestTypes = [
  "Access to your data.",
  "Correction of your data.",
  "Export of your data.",
  "Deletion of your account and associated data.",
  "Help with login or app issues.",
  "Feedback about your MUNA experience.",
  "Bug reports for anything that is not working correctly.",
  "Feature requests for future improvements.",
];

export default function ContactPage() {
  return (
    <main className="muna-page-surface min-h-screen px-4 py-8">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
        <Link href="/" className="text-sm font-black text-[#0F766E]">
          MUNA
        </Link>
        <h1 className="mt-4 text-4xl font-black tracking-normal text-[#0F172A]">Contact MUNA</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          For support, privacy requests, data requests, or account deletion requests, contact{" "}
          <a className="font-black text-[#0F766E]" href="mailto:support.munaibs@gmail.com">
            support.munaibs@gmail.com
          </a>
          .
        </p>

        <section className="mt-8">
          <h2 className="text-2xl font-black text-[#0F172A]">You May Contact Us To Request</h2>
          <ul className="mt-4 grid gap-3">
            {requestTypes.map((item) => (
              <li key={item} className="rounded-2xl bg-emerald-50 px-4 py-3 font-semibold leading-7 text-slate-700">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-emerald-100">
          <h2 className="text-xl font-black text-[#0F172A]">Account Verification</h2>
          <p className="mt-2 leading-7 text-slate-600">
            Please include the email address linked to your MUNA account so we can verify ownership before
            making changes to account data.
          </p>
        </section>

        <section className="mt-8 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
          <h2 className="text-xl font-black text-amber-950">Medical Note</h2>
          <p className="mt-2 leading-7 text-amber-900">
            MUNA cannot provide medical diagnosis, treatment, emergency advice, or personalised medical
            instructions. For medical concerns, speak with a qualified healthcare professional. For urgent
            symptoms, seek urgent medical care.
          </p>
        </section>
      </article>
    </main>
  );
}
