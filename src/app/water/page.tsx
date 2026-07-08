"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FormCard, primaryButtonClass } from "@/components/form-card";
import { SaveEntryButton } from "@/components/save-entry-button";

export default function WaterPage() {
  const [amountMl, setAmountMl] = useState(250);
  const [notes, setNotes] = useState("");

  return (
    <AppShell title="Water Tracker" subtitle="Track your water intake in millilitres.">
      <FormCard>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-slate-700">Water amount</p>
            <p className="mt-3 text-5xl font-bold text-emerald-950">{amountMl} mL</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[250, 500, 750, 1000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => setAmountMl(amount)}
                >
                  {amount} mL
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Custom amount in mL
            <input
              type="number"
              className="rounded-lg border border-slate-200 px-4 py-3 text-base font-normal"
              value={amountMl}
              onChange={(e) => setAmountMl(Number(e.target.value))}
              min={1}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Notes
            <textarea
              className="rounded-lg border border-slate-200 px-4 py-3 text-base font-normal"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Example: after breakfast, after workout"
            />
          </label>

          <SaveEntryButton
            table="water_logs"
            getPayload={() => ({
              amount_ml: amountMl,
              source: "manual",
              notes,
              log_date: new Date().toISOString().slice(0, 10),
            })}
          />
        </div>
      </FormCard>
    </AppShell>
  );
}