"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProfile } from "@/app/actions";
import { AudioNote } from "@/components/AudioNote";
import { Pills } from "@/components/Pills";
import { PREVIEW_LINES } from "@/lib/tts/preview";
import type { Gender, Setup } from "@/lib/register/types";
import { DEFAULT_SETUP, REGION_OPTIONS, RELATIONSHIP_OPTIONS, setupQuery } from "@/lib/setup";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export function SetupForm({ initial = DEFAULT_SETUP, audioModes = {} }: { initial?: Setup; audioModes?: Partial<Record<Setup["region"], "central" | "accent">> }) {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup>(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof Setup>(k: K, v: Setup[K]) => setSetup((s) => ({ ...s, [k]: v }));

  return (
    <form
      className="@container space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await saveProfile(setup).catch(() => undefined);
          router.push(`/scenes?${setupQuery(setup)}`);
        });
      }}
    >
      <p className="text-sm text-slate-500">Tap 🔈 to hear how each voice sounds.</p>
      <div className="grid gap-6 @xl:grid-cols-2">
        <Pills label="I am…" value={setup.speakerGender} onChange={(v) => set("speakerGender", v)} options={GENDERS} cols="grid-cols-1 @[17rem]:grid-cols-2" preview={(g) => ({ text: PREVIEW_LINES[g].th, gender: g, label: `a ${g} voice` })} />
        <Pills label="I'm talking to a…" value={setup.listenerGender} onChange={(v) => set("listenerGender", v)} options={GENDERS} cols="grid-cols-1 @[17rem]:grid-cols-2" preview={(g) => ({ text: PREVIEW_LINES[g].th, gender: g, label: `a ${g} voice` })} />
      </div>
      <Pills label="Who is that person to me?" value={setup.relationship} onChange={(v) => set("relationship", v)} options={RELATIONSHIP_OPTIONS} cols="grid-cols-2 sm:grid-cols-3" />
      <div className="space-y-2">
        <Pills label="Where are we?" value={setup.region} onChange={(v) => set("region", v)} options={REGION_OPTIONS} cols="grid-cols-2" />
        <AudioNote region={setup.region} mode={audioModes[setup.region] ?? "central"} />
      </div>
      <button
        disabled={pending}
        className="min-h-14 w-full touch-manipulation rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
      >
        {pending ? "Setting the scene…" : "Start playing →"}
      </button>
    </form>
  );
}
