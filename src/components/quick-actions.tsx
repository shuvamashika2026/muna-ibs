import Link from "next/link";
import { navItems } from "@/lib/data";

export function QuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {navItems.slice(1).map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-24 items-center gap-4 rounded-lg border border-emerald-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold text-emerald-950">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

