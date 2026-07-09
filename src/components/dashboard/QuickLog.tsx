import Link from "next/link";

const quickLinks = [
  { href: "/add-meal", label: "Add meal", className: "bg-emerald-600" },
  { href: "/add-symptoms", label: "Add symptoms", className: "bg-sky-600" },
  { href: "/bowel-movement", label: "Log bowel", className: "bg-teal-700" },
  { href: "/water", label: "Log water", className: "bg-cyan-600" },
  { href: "/medication", label: "Medication", className: "bg-purple-600" },
  { href: "/history", label: "History", className: "bg-slate-700" },
];

export function QuickLog() {
  return (
    <div className="mt-6 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-emerald-950">Quick log</h2>

      <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-xl px-5 py-4 text-center font-semibold text-white ${link.className}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}