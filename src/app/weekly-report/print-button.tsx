"use client";

import { Download } from "lucide-react";
import { primaryButtonClass } from "@/components/form-card";

export function PrintButton() {
  return (
    <button type="button" className={`${primaryButtonClass} gap-2`} onClick={() => window.print()}>
      <Download className="h-5 w-5" aria-hidden="true" />
      Export PDF
    </button>
  );
}
