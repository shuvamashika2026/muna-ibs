"use client";

import { useState } from "react";
import Link from "next/link";
import { DisclaimerNotice } from "@/components/disclaimer-notice";
import { FormCard, inputClass, labelClass, primaryButtonClass } from "@/components/form-card";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase is not connected yet. Add the public URL and anon key to .env.local.");
      setIsLoading(false);
      return;
    }

    const result =
      mode === "sign-up"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
  setMessage(result.error.message);
} else if (mode === "sign-up") {
  setMessage("Account created. Please check your email if confirmation is required.");
} else {
  window.location.href = "/dashboard";
}
    setIsLoading(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm font-semibold text-emerald-800">
        MUNA IBS
      </Link>
      <h1 className="mt-6 text-4xl font-bold text-emerald-950">{mode === "sign-up" ? "Create account" : "Welcome back"}</h1>
      <p className="mt-2 text-slate-600">Use email and password authentication with Supabase.</p>

      <div className="mt-6 grid gap-5">
        <DisclaimerNotice compact />
        <FormCard>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-emerald-50 p-1">
            <button
              type="button"
              onClick={() => setMode("sign-up")}
              className={`rounded-lg px-4 py-3 font-semibold ${mode === "sign-up" ? "bg-white text-emerald-950 shadow-sm" : "text-emerald-800"}`}
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className={`rounded-lg px-4 py-3 font-semibold ${mode === "sign-in" ? "bg-white text-emerald-950 shadow-sm" : "text-emerald-800"}`}
            >
              Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <label className={labelClass}>
              Email
              <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className={labelClass}>
              Password
              <input
                className={inputClass}
                type="password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button className={primaryButtonClass} type="submit" disabled={isLoading}>
              {isLoading ? "Please wait..." : mode === "sign-up" ? "Create account" : "Login"}
            </button>
            {message ? <p className="text-sm font-medium text-slate-600">{message}</p> : null}
          </form>
        </FormCard>
      </div>
    </main>
  );
}
