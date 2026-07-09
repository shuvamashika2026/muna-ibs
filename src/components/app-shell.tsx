"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { navItems } from "@/lib/data";

type AppShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  hidePageHeader?: boolean;
  showDefaultBottomNav?: boolean;
};

export function AppShell({
  children,
  title,
  subtitle,
  hidePageHeader = false,
  showDefaultBottomNav = true,
}: AppShellProps) {

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
    <div className="muna-page-surface min-h-screen pb-24 md:pb-8">
      <header className="sticky top-0 z-20 border-b border-emerald-100/70 bg-white/75 shadow-sm backdrop-blur-xl no-print">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3 font-black text-[#0F172A]">
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_10px_26px_rgba(15,118,110,0.14)]">
              <Image
                src="/brand/muna-logo.png"
                alt="MUNA IBS logo"
                width={44}
                height={44}
                className="h-full w-full object-cover"
                priority
              />
            </span>
            MUNA IBS
          </Link>
          {userEmail ? (
  <button
    onClick={handleSignOut}
    className="rounded-2xl bg-[#0F766E] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(15,118,110,0.22)]"
  >
    Sign out
  </button>
) : (
  <Link
    href="/login"
    className="rounded-2xl bg-[#0F766E] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(15,118,110,0.22)]"
  >
    Sign in
  </Link>
)}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        {!hidePageHeader ? (
          <div className="mb-6">
            <h1 className="text-3xl font-black tracking-normal text-[#0F172A] md:text-4xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-base font-medium leading-7 text-slate-600">{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </main>

      {showDefaultBottomNav ? <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-100 bg-white/90 shadow-[0_-18px_44px_rgba(15,118,110,0.12)] backdrop-blur-xl no-print md:hidden">
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
      </nav> : null}
    </div>
  );
}
