"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProfile } from "@/app/actions";
import { AudioNote } from "@/components/AudioNote";
import { Wizard, type WizardStep } from "@/components/Wizard";
import { PREVIEW_LINES } from "@/lib/tts/preview";
import { DEFAULT_PACE, type Pace } from "@/lib/tts/ctx";
import type { Gender, Setup } from "@/lib/register/types";
import { DEFAULT_SETUP, REGION_OPTIONS, RELATIONSHIP_OPTIONS, setupQuery } from "@/lib/setup";

/** Learning Thai (English UI): four plain questions, one per screen, then a check screen. */
export function SetupForm({ initial = DEFAULT_SETUP, audioModes = {}, pace = DEFAULT_PACE }: { initial?: Setup; audioModes?: Partial<Record<Setup["region"], "central" | "accent">>; pace?: Pace }) {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup>(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof Setup>(k: K, v: string) => setSetup((s) => ({ ...s, [k]: v as Setup[K] }));
  const voice = (g: Gender, label: string) => ({ text: PREVIEW_LINES[g].th, gender: g, label, audio: { lang: "th" as const, region: "bangkok", pace } });

  const steps: WizardStep[] = [
    {
      id: "me",
      title: "First, are you a man or a woman?",
      help: "Thai uses different words for men and women, so we need to know how you'll sound.",
      summaryLabel: "You are",
      value: setup.speakerGender,
      onChange: (v) => set("speakerGender", v),
      options: [
        { value: "male", label: "I'm a man", preview: voice("male", "a man's voice") },
        { value: "female", label: "I'm a woman", preview: voice("female", "a woman's voice") },
      ],
    },
    {
      id: "them",
      title: "Who will you be talking to?",
      help: "Pick the other person in the conversation.",
      summaryLabel: "Talking to",
      value: setup.listenerGender,
      onChange: (v) => set("listenerGender", v),
      options: [
        { value: "male", label: "A man", preview: voice("male", "a man's voice") },
        { value: "female", label: "A woman", preview: voice("female", "a woman's voice") },
      ],
    },
    {
      id: "rel",
      title: "How do you know this person?",
      help: "This decides how polite your Thai should be.",
      summaryLabel: "They are",
      value: setup.relationship,
      onChange: (v) => set("relationship", v),
      options: RELATIONSHIP_OPTIONS.map((o) => ({ value: o.value, label: o.label, hint: o.hint })),
    },
    {
      id: "region",
      title: "Where in Thailand are you?",
      help: "New to Thai? Start with Bangkok: it's Central Thai, understood everywhere. Other places change some words (the audio stays Central Thai), so try them once the basics feel easy.",
      summaryLabel: "Place",
      value: setup.region,
      onChange: (v) => set("region", v),
      cols: "grid-cols-1 @xl:grid-cols-2",
      options: REGION_OPTIONS.map((o) => ({ value: o.value, label: o.label, hint: o.hint })),
      note: <AudioNote region={setup.region} mode={audioModes[setup.region] ?? "central"} />,
    },
  ];

  return (
    <Wizard
      steps={steps}
      pending={pending}
      pendingLabel="Setting the scene…"
      onFinish={() =>
        start(async () => {
          await saveProfile(setup).catch(() => undefined);
          router.push(`/scenes?${setupQuery(setup)}`);
        })
      }
    />
  );
}
