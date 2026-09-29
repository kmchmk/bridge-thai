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
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-stone-600 dark:text-stone-300">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-xl border px-4 py-2 text-left text-sm transition ${
              value === o.value
                ? "border-amber-500 bg-amber-500 text-white shadow"
                : "border-stone-300 bg-white hover:border-amber-400 dark:border-stone-700 dark:bg-stone-900"
            }`}
          >
            <span className="font-semibold">{o.label}</span>
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
      <Pills label="I am…" value={setup.speakerGender} onChange={(v) => set("speakerGender", v)} options={GENDERS} />
      <Pills label="I'm talking to a…" value={setup.listenerGender} onChange={(v) => set("listenerGender", v)} options={GENDERS} />
      <Pills label="Who is that person to me?" value={setup.relationship} onChange={(v) => set("relationship", v)} options={RELATIONSHIP_OPTIONS} />
      <Pills label="Where are we?" value={setup.region} onChange={(v) => set("region", v)} options={REGION_OPTIONS} />
      <button
        disabled={pending}
        className="w-full rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white transition hover:bg-stone-700 disabled:opacity-60 dark:bg-amber-500 dark:hover:bg-amber-400"
      >
        {pending ? "Setting the scene…" : "Start playing →"}
      </button>
    </form>
  );
}
