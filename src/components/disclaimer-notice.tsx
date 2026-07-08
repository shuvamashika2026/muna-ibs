import { ShieldCheck } from "lucide-react";
import { medicalDisclaimer } from "@/lib/disclaimer";

type DisclaimerNoticeProps = {
  compact?: boolean;
};

export function DisclaimerNotice({ compact = false }: DisclaimerNoticeProps) {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-950">
      <div className="flex gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Medical disclaimer</p>
          <p className={compact ? "mt-1 text-sm leading-6" : "mt-2 text-sm leading-6"}>
            {medicalDisclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
