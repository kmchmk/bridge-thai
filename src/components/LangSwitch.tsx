"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setNative } from "@/app/actions";
import { useNative, useT } from "@/components/LangProvider";
import type { Native } from "@/lib/lang";

const OPTIONS: { value: Native; label: string; lang: string }[] = [
  { value: "en", label: "EN", lang: "en" },
  { value: "th", label: "ไทย", lang: "th" },
];

/** Header toggle: switching language switches the UI and the course. */
export function LangSwitch() {
  const native = useNative();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label={t.switchTo} className={`flex overflow-hidden rounded-xl border text-sm dark:border-slate-700 ${pending ? "opacity-60" : ""}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.lang}
          aria-pressed={native === o.value}
          disabled={pending}
          onClick={() => native !== o.value && start(async () => { await setNative(o.value); router.push("/"); router.refresh(); })}
          className={`min-h-11 min-w-11 touch-manipulation px-3 font-medium transition ${native === o.value ? "bg-brand-600 text-white" : "bg-white hover:bg-brand-50 dark:bg-slate-900 dark:hover:bg-slate-800"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
