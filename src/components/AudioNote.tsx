import { InfoTip } from "@/components/InfoTip";
import { getAccent, type AccentId } from "@/lib/accents";
import { getRegion } from "@/lib/regions";
import type { Region } from "@/lib/register/types";

/** "Central pronunciation ⓘ" — shown for regional dialects so learners know what the audio really is. */
export function AudioNote({ region, mode, className = "" }: { region: Region; mode: "central" | "accent"; className?: string }) {
  const pack = getRegion(region);
  if (pack.kind === "standard") return null;
  const accent = mode === "accent";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${className}`}>
      <span aria-hidden>🔈</span>
      {accent ? "AI-approximated accent" : "Central pronunciation"}
      <InfoTip label="About this audio">
        {accent
          ? `The voice is asked to imitate a ${pack.speakers} accent. It's an AI approximation, so it may not sound like real ${pack.speakers} speakers.`
          : `The audio is generated with Central Thai pronunciation. Real ${pack.speakers} speakers pronounce the tones and some words differently.`}
      </InfoTip>
    </span>
  );
}

/** English course: the voices are AI, so real accents may differ a little. (Thai UI, so Thai text.) */
export function EnglishAudioNote({ accent, className = "" }: { accent: AccentId; className?: string }) {
  const a = getAccent(accent);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${className}`}>
      <span aria-hidden>{a.flag}</span>
      สำเนียง{a.labelTh} (เสียง AI)
      <InfoTip label="เกี่ยวกับเสียงนี้">
        เสียงสร้างด้วย AI เพื่อเลียนแบบสำเนียง{a.labelTh} ผู้พูดจริงอาจออกเสียงต่างไปเล็กน้อย
      </InfoTip>
    </span>
  );
}
