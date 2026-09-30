"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/LangProvider";
import { PlayButton } from "@/components/PlayButton";
import type { AudioCtx } from "@/lib/tts/ctx";

export interface WizardOption {
  value: string;
  label: string;
  hint?: string;
  /** Adds a "hear it" button beside the option. */
  preview?: { text: string; gender: "male" | "female"; label: string; audio?: AudioCtx };
}

export interface WizardStep {
  id: string;
  /** The question, in plain words. */
  title: string;
  /** One line on why we ask. */
  help?: string;
  /** Row label on the final check screen. */
  summaryLabel: string;
  options: WizardOption[];
  value: string;
  onChange: (v: string) => void;
  /** Grid columns for the options (Tailwind classes). */
  cols?: string;
  /** Extra content under the options (e.g. an audio note). */
  note?: React.ReactNode;
}

/**
 * One question per screen: Question → pick → Next … → check your choices → Start.
 * Big targets, plain words, a visible "Step n of N", and a Back button that never loses answers.
 */
export function Wizard({ steps, pending, pendingLabel, onFinish }: { steps: WizardStep[]; pending: boolean; pendingLabel: string; onFinish: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const total = steps.length + 1; // + the final "check your choices" screen
  const summary = i === steps.length;
  const step = steps[i];
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Move to the top and read out the new question whenever the screen changes.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [i]);

  return (
    <div className="@container space-y-5">
      <div>
        <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{t.stepOf(i + 1, total)}</p>
        <div role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={i + 1} className="mt-2 flex gap-1.5">
          {Array.from({ length: total }, (_, k) => (
            <span key={k} className={`h-2 flex-1 rounded-full ${k <= i ? "bg-brand-600 dark:bg-brand-400" : "bg-slate-200 dark:bg-slate-700"}`} />
          ))}
        </div>
      </div>

      <h2 ref={heading} tabIndex={-1} className="scroll-mt-4 text-2xl font-bold leading-snug outline-none sm:text-3xl">
        {summary ? t.summaryTitle : step.title}
      </h2>
      <p className="text-base text-slate-600 sm:text-lg dark:text-slate-300">{summary ? t.summaryHelp : step.help}</p>

      {summary ? (
        <ul className="divide-y rounded-2xl border bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
          {steps.map((s, k) => {
            const chosen = s.options.find((o) => o.value === s.value);
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                <span className="min-w-0">
                  <span className="block text-sm text-slate-500">{s.summaryLabel}</span>
                  <span className="block text-lg font-semibold">{chosen?.label}</span>
                </span>
                <button type="button" onClick={() => setI(k)} className="min-h-12 shrink-0 rounded-xl border px-4 font-medium text-brand-700 hover:bg-brand-50 dark:border-slate-700 dark:text-brand-300 dark:hover:bg-slate-800">
                  {t.change}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <div role="radiogroup" aria-label={step.title} className={`grid gap-3 ${step.cols ?? "grid-cols-1"}`}>
            {step.options.map((o) => {
              const on = step.value === o.value;
              const button = (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => step.onChange(o.value)}
                  className={`flex min-h-16 min-w-0 flex-1 touch-manipulation items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
                    on ? "border-brand-600 bg-brand-600 text-white shadow" : "border-slate-300 bg-white hover:border-brand-400 dark:border-slate-600 dark:bg-slate-900"
                  }`}
                >
                  <span aria-hidden className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-base ${on ? "border-white bg-white text-brand-700" : "border-slate-400"}`}>{on ? "✓" : ""}</span>
                  <span className="min-w-0">
                    <span className="block text-lg font-semibold leading-snug">{o.label}</span>
                    {o.hint && <span className="block text-sm opacity-80">{o.hint}</span>}
                  </span>
                </button>
              );
              return o.preview ? (
                <div key={o.value} className="flex items-stretch gap-2">
                  {button}
                  <PlayButton text={o.preview.text} gender={o.preview.gender} label={o.preview.label} audio={o.preview.audio} className="min-h-16 min-w-14" />
                </div>
              ) : (
                button
              );
            })}
          </div>
          {step.options.some((o) => o.preview) && <p className="text-sm text-slate-500">{t.hearTip}</p>}
          {step.note}
        </>
      )}

      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        {i > 0 ? (
          <button type="button" onClick={() => setI(i - 1)} className="min-h-14 rounded-xl border px-6 text-lg font-medium dark:border-slate-600">
            {t.back}
          </button>
        ) : (
          <span />
        )}
        {summary ? (
          <button type="button" disabled={pending} onClick={onFinish} className="min-h-14 touch-manipulation rounded-xl bg-brand-600 px-8 text-lg font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500 sm:min-w-56">
            {pending ? pendingLabel : t.startPlaying}
          </button>
        ) : (
          <button type="button" onClick={() => setI(i + 1)} className="min-h-14 touch-manipulation rounded-xl bg-brand-600 px-8 text-lg font-semibold text-white transition hover:bg-brand-700 dark:bg-brand-500 sm:min-w-56">
            {t.next}
          </button>
        )}
      </div>
    </div>
  );
}
