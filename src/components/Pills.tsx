"use client";

import { PlayButton } from "@/components/PlayButton";
import type { AudioCtx } from "@/lib/tts/ctx";
import type { Gender } from "@/lib/register/types";

/** A labelled group of single-choice buttons, optionally with a "hear this voice" button beside each. */
export function Pills<T extends string>({
  label,
  value,
  onChange,
  options,
  cols,
  preview,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
  cols: string;
  preview?: (value: T) => { text: string; gender: Gender; label: string; audio?: AudioCtx };
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">{label}</legend>
      <div className={`grid gap-2 ${cols}`}>
        {options.map((o) => {
          const p = preview?.(o.value);
          const button = (
            <button
              key={o.value}
              type="button"
              aria-pressed={value === o.value}
              onClick={() => onChange(o.value)}
              className={`min-h-14 min-w-0 flex-1 touch-manipulation rounded-xl border px-3 py-2 text-left text-sm transition sm:px-4 ${
                value === o.value
                  ? "border-brand-600 bg-brand-600 text-white shadow"
                  : "border-slate-300 bg-white hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <span className="block font-semibold">{o.label}</span>
              {o.hint && <span className="block text-xs opacity-75">{o.hint}</span>}
            </button>
          );
          return p ? (
            <div key={o.value} className="flex items-stretch gap-1">
              {button}
              <PlayButton text={p.text} gender={p.gender} label={p.label} audio={p.audio} className="min-h-14 min-w-11" />
            </div>
          ) : (
            button
          );
        })}
      </div>
    </fieldset>
  );
}
