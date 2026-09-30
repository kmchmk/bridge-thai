"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveEnProfile } from "@/app/actions";
import { Pills } from "@/components/Pills";
import { ACCENTS } from "@/lib/accents";
import { DEFAULT_EN_SETUP, enSetupQuery, type EnSetup, type Formality } from "@/lib/english";
import type { Gender } from "@/lib/register/types";
import { PREVIEW_LINES_EN } from "@/lib/tts/preview";

// This form only appears in the Thai UI (learning English), so its text is Thai.
const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "ผู้ชาย" },
  { value: "female", label: "ผู้หญิง" },
];

const FORMALITY: { value: Formality; label: string; hint: string }[] = [
  { value: "casual", label: "เพื่อน / คนสนิท", hint: "คุยสบาย ๆ" },
  { value: "neutral", label: "คนทั่วไป / พนักงานบริการ", hint: "สุภาพ เป็นกลาง" },
  { value: "formal", label: "ผู้ใหญ่ / เจ้านาย / ลูกค้า", hint: "ทางการ สุภาพมาก" },
];

export function EnglishSetupForm({ initial = DEFAULT_EN_SETUP }: { initial?: EnSetup }) {
  const router = useRouter();
  const [setup, setSetup] = useState<EnSetup>(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof EnSetup>(k: K, v: EnSetup[K]) => setSetup((s) => ({ ...s, [k]: v }));
  const voice = (g: Gender) => ({ text: PREVIEW_LINES_EN[g].en, gender: g, label: g === "male" ? "เสียงผู้ชาย" : "เสียงผู้หญิง", audio: { lang: "en" as const, accent: setup.accent } });

  return (
    <form
      className="@container space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await saveEnProfile(setup).catch(() => undefined);
          router.push(`/scenes?${enSetupQuery(setup)}`);
        });
      }}
    >
      <p className="text-sm text-slate-500">แตะ 🔈 เพื่อฟังตัวอย่างเสียงและสำเนียง</p>
      <div className="grid gap-6 @xl:grid-cols-2">
        <Pills label="ฉันเป็น…" value={setup.speakerGender} onChange={(v) => set("speakerGender", v)} options={GENDERS} cols="grid-cols-1 @[17rem]:grid-cols-2" preview={voice} />
        <Pills label="ฉันกำลังคุยกับ…" value={setup.listenerGender} onChange={(v) => set("listenerGender", v)} options={GENDERS} cols="grid-cols-1 @[17rem]:grid-cols-2" preview={voice} />
      </div>
      <Pills label="คนที่ฉันคุยด้วยคือใคร?" value={setup.formality} onChange={(v) => set("formality", v)} options={FORMALITY} cols="grid-cols-1 @2xl:grid-cols-3" />
      <div className="space-y-2">
        <Pills
          label="ฉันอยากฝึกสำเนียงแบบไหน?"
          value={setup.accent}
          onChange={(v) => set("accent", v)}
          options={ACCENTS.map((a) => ({ value: a.id, label: `${a.flag} ${a.labelTh}`, hint: a.hintTh }))}
          cols="grid-cols-1 @2xl:grid-cols-3"
          preview={(a) => ({ text: PREVIEW_LINES_EN[setup.speakerGender].en, gender: setup.speakerGender, label: `สำเนียง${ACCENTS.find((x) => x.id === a)?.labelTh}`, audio: { lang: "en", accent: a } })}
        />
        <p className="text-xs text-slate-500">คำบางคำเปลี่ยนตามประเทศ เช่น ลิฟต์ = elevator (สหรัฐฯ) / lift (อังกฤษ, ออสเตรเลีย)</p>
      </div>
      <button
        disabled={pending}
        className="min-h-14 w-full touch-manipulation rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
      >
        {pending ? "กำลังเตรียมสถานการณ์…" : "เริ่มเล่น →"}
      </button>
    </form>
  );
}
