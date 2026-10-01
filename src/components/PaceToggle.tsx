"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setPace } from "@/app/actions";
import { useT } from "@/components/LangProvider";
import type { Pace } from "@/lib/tts/ctx";

/** Voice speed: slower (default, for learning) or normal (real-life speed). Remembered on this device. */
export function PaceToggle({ pace, className = "" }: { pace: Pace; className?: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const options: { value: Pace; label: string }[] = [
    { value: "learner", label: t.paceSlower },
    { value: "natural", label: t.paceNormal },
  ];
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm text-slate-500">{t.paceLabel}</span>
      <div role="radiogroup" aria-label={t.paceLabel} className={`flex overflow-hidden rounded-xl border dark:border-slate-700 ${pending ? "opacity-60" : ""}`}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={pace === o.value}
            disabled={pending}
            onClick={() => pace !== o.value && start(async () => { await setPace(o.value); router.refresh(); })}
            className={`min-h-11 touch-manipulation px-4 text-sm font-medium transition ${pace === o.value ? "bg-brand-600 text-white" : "bg-white hover:bg-brand-50 dark:bg-slate-900 dark:hover:bg-slate-800"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
