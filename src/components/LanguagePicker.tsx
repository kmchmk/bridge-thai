"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setNative } from "@/app/actions";
import type { Native } from "@/lib/lang";

const CHOICES: { value: Native; flag: string; title: string; sub: string; lang: string }[] = [
  { value: "en", flag: "🇬🇧", title: "I speak English", sub: "Learn Thai", lang: "en" },
  { value: "th", flag: "🇹🇭", title: "ฉันพูดภาษาไทย", sub: "เรียนภาษาอังกฤษ", lang: "th" },
];

/** First visit: pick your own language. The UI switches to it and you learn the other one. */
export function LanguagePicker() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 pt-6 text-center sm:pt-14">
      <Image src="/logo.png" alt="" width={72} height={72} priority className="size-16 rounded-2xl sm:size-[72px]" />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bridge Thai</h1>
        <p className="text-slate-600 dark:text-slate-300">
          <span lang="en">Choose your language · </span>
          <span lang="th">เลือกภาษาของคุณ</span>
        </p>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-2">
        {CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            disabled={pending}
            onClick={() => start(async () => { await setNative(c.value); router.refresh(); })}
            lang={c.lang}
            className="flex min-h-32 touch-manipulation flex-col items-center justify-center gap-1 rounded-3xl border bg-white p-6 shadow-sm transition hover:border-brand-500 hover:shadow disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
          >
            <span className="text-4xl" aria-hidden>{c.flag}</span>
            <span className="text-xl font-semibold">{c.title}</span>
            <span className="text-sm text-brand-700 dark:text-brand-300">{c.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
