"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProfile } from "@/app/actions";
import { PlayButton } from "@/components/PlayButton";
import { PREVIEW_LINES } from "@/lib/tts/preview";
import type { Gender, Setup } from "@/lib/register/types";
import { DEFAULT_SETUP, REGION_OPTIONS, RELATIONSHIP_OPTIONS, setupQuery } from "@/lib/setup";

function Pills<T extends string>({
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
  /** Adds a "hear this voice" button beside each option. */
  preview?: (value: T) => { text: string; gender: Gender; label: string };
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
              <PlayButton text={p.text} gender={p.gender} label={p.label} className="min-h-14 min-w-12" />
            </div>
          ) : (
            button
          );
        })}
      </div>
    </fieldset>
  );
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export function SetupForm({ initial = DEFAULT_SETUP }: { initial?: Setup }) {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup>(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof Setup>(k: K, v: Setup[K]) => setSetup((s) => ({ ...s, [k]: v }));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await saveProfile(setup).catch(() => undefined);
          router.push(`/scenes?${setupQuery(setup)}`);
        });
      }}
    >
      <p className="text-sm text-slate-500">Tap 🔈 to hear how each voice sounds.</p>
      <div className="grid gap-6 sm:grid-cols-2">
        <Pills label="I am…" value={setup.speakerGender} onChange={(v) => set("speakerGender", v)} options={GENDERS} cols="grid-cols-2" preview={(g) => ({ text: PREVIEW_LINES[g].th, gender: g, label: `a ${g} voice` })} />
        <Pills label="I'm talking to a…" value={setup.listenerGender} onChange={(v) => set("listenerGender", v)} options={GENDERS} cols="grid-cols-2" preview={(g) => ({ text: PREVIEW_LINES[g].th, gender: g, label: `a ${g} voice` })} />
      </div>
      <Pills label="Who is that person to me?" value={setup.relationship} onChange={(v) => set("relationship", v)} options={RELATIONSHIP_OPTIONS} cols="grid-cols-2 sm:grid-cols-3" />
      <Pills label="Where are we?" value={setup.region} onChange={(v) => set("region", v)} options={REGION_OPTIONS} cols="grid-cols-2" />
      <button
        disabled={pending}
        className="min-h-14 w-full touch-manipulation rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
      >
        {pending ? "Setting the scene…" : "Start playing →"}
      </button>
    </form>
  );
}
