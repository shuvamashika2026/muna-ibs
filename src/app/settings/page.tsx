import { AppShell } from "@/components/app-shell";
import { DisclaimerNotice } from "@/components/disclaimer-notice";
import { FormCard, inputClass, labelClass } from "@/components/form-card";

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
      </div>
    </AppShell>
  );
}
