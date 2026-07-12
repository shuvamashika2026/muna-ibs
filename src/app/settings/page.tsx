import { AppShell } from "@/components/app-shell";
import { DisclaimerNotice } from "@/components/disclaimer-notice";
import { FormCard, inputClass, labelClass } from "@/components/form-card";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Profile preferences, reminders, and safety notes.">
      <div className="grid gap-5">
        <DisclaimerNotice />
        <FormCard>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>
              Display name
              <input className={inputClass} placeholder="Your name" />
            </label>
            <label className={labelClass}>
              Daily water goal
              <input className={inputClass} type="number" min="1" placeholder="8" />
            </label>
            <label className={labelClass}>
              Medication reminder
              <input className={inputClass} type="time" />
            </label>
            <label className={labelClass}>
              Report day
              <select className={inputClass} defaultValue="Sunday">
                <option>Sunday</option>
                <option>Monday</option>
                <option>Friday</option>
                <option>Saturday</option>
              </select>
            </label>
          </div>
        </FormCard>
        <FormCard>
          <h2 className="text-xl font-black text-[#0F172A]">Legal and support</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link className="rounded-2xl bg-[#ECFDF5] px-4 py-3 text-center font-black text-[#0F766E]" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="rounded-2xl bg-[#ECFDF5] px-4 py-3 text-center font-black text-[#0F766E]" href="/terms">
              Terms of Use
            </Link>
            <Link className="rounded-2xl bg-[#ECFDF5] px-4 py-3 text-center font-black text-[#0F766E]" href="/about">
              About MUNA
            </Link>
            <Link className="rounded-2xl bg-[#ECFDF5] px-4 py-3 text-center font-black text-[#0F766E]" href="/contact">
              Contact
            </Link>
          </div>
        </FormCard>
      </div>
    </AppShell>
  );
}
