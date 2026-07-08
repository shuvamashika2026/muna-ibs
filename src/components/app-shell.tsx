"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { navItems } from "@/lib/data";

type AppShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
};

export function AppShell({ children, title, subtitle }: AppShellProps) {

  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
  async function getUser() {
    if (!supabase) return;

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    setUserEmail(data.user.email ?? null);
  }

  getUser();
}, []);

  async function handleSignOut() {
    if (!supabase) return;

    await supabase.auth.signOut();
    setUserEmail(null);
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/90 backdrop-blur no-print">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-emerald-950">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-600 text-white">
              <HeartPulse className="h-5 w-5" aria-hidden="true" />
            </span>
            MUNA IBS
          </Link>
          {userEmail ? (
  <button
    onClick={handleSignOut}
    className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
  >
    Sign out
  </button>
) : (
  <Link
    href="/login"
    className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
  >
    Sign in
  </Link>
)}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-normal text-emerald-950 md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">{subtitle}</p> : null}
        </div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-100 bg-white no-print md:hidden">
        <div className="grid grid-cols-5">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-emerald-900"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label.split(" ")[0]}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
