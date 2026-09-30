"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveEnProfile } from "@/app/actions";
import { Wizard, type WizardStep } from "@/components/Wizard";
import { ACCENTS } from "@/lib/accents";
import { DEFAULT_EN_SETUP, enSetupQuery, type EnSetup, type Formality } from "@/lib/english";
import type { Gender } from "@/lib/register/types";
import { PREVIEW_LINES_EN } from "@/lib/tts/preview";

// This form only appears in the Thai UI (learning English), so its text is Thai.
const FORMALITY: { value: Formality; label: string; hint: string }[] = [
  { value: "casual", label: "เพื่อนหรือคนสนิท", hint: "คุยสบาย ๆ" },
  { value: "neutral", label: "คนทั่วไป หรือพนักงานบริการ", hint: "สุภาพ เป็นกลาง เช่น พนักงานร้านกาแฟ" },
  { value: "formal", label: "ผู้ใหญ่ เจ้านาย หรือลูกค้า", hint: "ทางการ สุภาพมาก" },
];

/** Learning English (Thai UI): four plain questions, one per screen, then a check screen. */
export function EnglishSetupForm({ initial = DEFAULT_EN_SETUP }: { initial?: EnSetup }) {
  const router = useRouter();
  const [setup, setSetup] = useState<EnSetup>(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof EnSetup>(k: K, v: string) => setSetup((s) => ({ ...s, [k]: v as EnSetup[K] }));
  const voice = (g: Gender) => ({ text: PREVIEW_LINES_EN[g].en, gender: g, label: g === "male" ? "เสียงผู้ชาย" : "เสียงผู้หญิง", audio: { lang: "en" as const, accent: setup.accent } });

  const steps: WizardStep[] = [
    {
      id: "me",
      title: "ก่อนอื่น คุณเป็นผู้ชายหรือผู้หญิง?",
      help: "เราใช้เลือกเสียงของคุณในบทสนทนา",
      summaryLabel: "คุณเป็น",
      value: setup.speakerGender,
      onChange: (v) => set("speakerGender", v),
      options: [
        { value: "male", label: "ฉันเป็นผู้ชาย", preview: voice("male") },
        { value: "female", label: "ฉันเป็นผู้หญิง", preview: voice("female") },
      ],
    },
    {
      id: "them",
      title: "คุณจะคุยกับใคร?",
      help: "เลือกเสียงของอีกฝ่ายในบทสนทนา",
      summaryLabel: "คุยกับ",
      value: setup.listenerGender,
      onChange: (v) => set("listenerGender", v),
      options: [
        { value: "male", label: "ผู้ชาย", preview: voice("male") },
        { value: "female", label: "ผู้หญิง", preview: voice("female") },
      ],
    },
    {
      id: "who",
      title: "คนที่คุยด้วยคือใคร?",
      help: "ใช้เลือกว่าประโยคควรสุภาพแค่ไหน",
      summaryLabel: "เขาคือ",
      value: setup.formality,
      onChange: (v) => set("formality", v),
      options: FORMALITY,
    },
    {
      id: "accent",
      title: "อยากฝึกสำเนียงแบบไหน?",
      help: "ไม่แน่ใจ เลือกอเมริกันได้เลย คำบางคำจะเปลี่ยนตามประเทศ เช่น ลิฟต์ = elevator (สหรัฐฯ) / lift (อังกฤษ, ออสเตรเลีย)",
      summaryLabel: "สำเนียง",
      value: setup.accent,
      onChange: (v) => set("accent", v),
      options: ACCENTS.map((a) => ({
        value: a.id,
        label: `${a.flag} ${a.labelTh}`,
        hint: a.hintTh,
        preview: { text: PREVIEW_LINES_EN[setup.speakerGender].en, gender: setup.speakerGender, label: `สำเนียง${a.labelTh}`, audio: { lang: "en" as const, accent: a.id } },
      })),
    },
  ];

  return (
    <Wizard
      steps={steps}
      pending={pending}
      pendingLabel="กำลังเตรียมสถานการณ์…"
      onFinish={() =>
        start(async () => {
          await saveEnProfile(setup).catch(() => undefined);
          router.push(`/scenes?${enSetupQuery(setup)}`);
        })
      }
    />
  );
}
