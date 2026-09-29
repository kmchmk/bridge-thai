"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProfile } from "@/app/actions";
import type { Gender, Setup } from "@/lib/register/types";
import { DEFAULT_SETUP, REGION_OPTIONS, RELATIONSHIP_OPTIONS, setupQuery } from "@/lib/setup";

function Pills<T extends string>({
  label,
  value,
  onChange,
  options,
  cols,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
  cols: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-stone-600 dark:text-stone-300">{label}</legend>
      <div className={`grid gap-2 ${cols}`}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-14 touch-manipulation rounded-xl border px-3 py-2 text-left text-sm transition sm:px-4 ${
              value === o.value
                ? "border-amber-500 bg-amber-500 text-white shadow"
                : "border-stone-300 bg-white hover:border-amber-400 dark:border-stone-700 dark:bg-stone-900"
            }`}
          >
            <span className="block font-semibold">{o.label}</span>
            {o.hint && <span className="block text-xs opacity-75">{o.hint}</span>}
          </button>
        ))}
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
      <div className="grid gap-6 sm:grid-cols-2">
        <Pills label="I am…" value={setup.speakerGender} onChange={(v) => set("speakerGender", v)} options={GENDERS} cols="grid-cols-2" />
        <Pills label="I'm talking to a…" value={setup.listenerGender} onChange={(v) => set("listenerGender", v)} options={GENDERS} cols="grid-cols-2" />
      </div>
      <Pills label="Who is that person to me?" value={setup.relationship} onChange={(v) => set("relationship", v)} options={RELATIONSHIP_OPTIONS} cols="grid-cols-2 sm:grid-cols-3" />
      <Pills label="Where are we?" value={setup.region} onChange={(v) => set("region", v)} options={REGION_OPTIONS} cols="grid-cols-2" />
      <button
        disabled={pending}
        className="min-h-14 w-full touch-manipulation rounded-xl bg-stone-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-stone-700 disabled:opacity-60 dark:bg-amber-500 dark:hover:bg-amber-400"
      >
        {pending ? "Setting the scene…" : "Start playing →"}
      </button>
    </form>
  );
}
