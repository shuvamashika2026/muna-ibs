type FormCardProps = {
  children: React.ReactNode;
};

export function FormCard({ children }: FormCardProps) {
  return <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">{children}</div>;
}

export const inputClass =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export const labelClass = "block text-sm font-semibold text-slate-700";

export const primaryButtonClass =
  "inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto";
