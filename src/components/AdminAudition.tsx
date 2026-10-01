"use client";

import { useRef, useState } from "react";

type Gender = "male" | "female";
type Pace = "natural" | "learner" | "slow";
type Mode = "central" | "accent";
export interface AuditionClip { gender: Gender; pace: Pace; region: string; mode: Mode; file: string }
export interface AuditionRegion { id: string; name: string; area: string; hasAccent: boolean; sample: Record<Gender, string> }

// This page is for the Thai reviewer, so its text is Thai.
const GENDERS: { value: Gender; label: string }[] = [
  { value: "female", label: "เสียงผู้หญิง" },
  { value: "male", label: "เสียงผู้ชาย" },
];
const PACES: { value: Pace; label: string; hint: string }[] = [
  { value: "natural", label: "ปกติ", hint: "Natural" },
  { value: "learner", label: "ช้าลงเล็กน้อย", hint: "Learner" },
  { value: "slow", label: "ช้า", hint: "Slow" },
];
const MODES: { value: Mode; label: string }[] = [
  { value: "central", label: "สำเนียงกลาง" },
  { value: "accent", label: "สำเนียงถิ่น (AI)" },
];

const card = "rounded-2xl border bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900";

function Choice({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`flex min-h-14 flex-1 touch-manipulation flex-col items-center justify-center rounded-xl border-2 px-3 py-2 text-center transition ${
        on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white hover:border-brand-400 dark:border-slate-600 dark:bg-slate-900"
      }`}
    >
      <span className="text-lg font-semibold leading-tight">{label}</span>
      {hint && <span className="text-xs opacity-75">{hint}</span>}
    </button>
  );
}

/** Mobile-first audition: pick a voice, pick a pace, then play each region with Central pronunciation or the AI accent hint. */
export function AdminAudition({ voices, livePace, regions, clips }: { voices: Record<Gender, string>; livePace: Pace; regions: AuditionRegion[]; clips: AuditionClip[] }) {
  const [gender, setGender] = useState<Gender>("female");
  const [pace, setPace] = useState<Pace>(livePace);
  const [active, setActive] = useState<{ file: string; state: "loading" | "playing" | "error" } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const clipFor = (region: string, mode: Mode) => clips.find((c) => c.gender === gender && c.pace === pace && c.region === region && c.mode === mode);

  const play = (file: string) => {
    audio.current?.pause();
    const a = new Audio(`/audio/audition/${file}`);
    audio.current = a;
    setActive({ file, state: "loading" });
    a.onplaying = () => setActive({ file, state: "playing" });
    a.onended = () => setActive(null);
    a.onerror = () => setActive({ file, state: "error" });
    a.play().catch(() => setActive({ file, state: "error" }));
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-lg font-semibold">ขอความช่วยเหลือฟังเสียงอีกครั้ง</h2>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-base text-slate-700 dark:text-slate-200">
          <li>เลือกเสียงผู้หญิงหรือผู้ชาย</li>
          <li>เลือกความเร็ว</li>
          <li>กดปุ่มลำโพงของแต่ละภาค ทั้งสำเนียงกลางและสำเนียงถิ่น</li>
        </ol>
        <p className="mt-2 text-sm text-slate-500">ไม่ต้องกดบันทึกอะไร ตอบทางอีเมลได้เลย</p>
      </div>

      <div className={card}>
        <h3 className="mb-2 font-semibold">1. เสียง</h3>
        <div role="radiogroup" aria-label="เสียง" className="flex gap-2">
          {GENDERS.map((g) => (
            <Choice key={g.value} on={gender === g.value} onClick={() => setGender(g.value)} label={g.label} hint={voices[g.value]} />
          ))}
        </div>
        <h3 className="mb-2 mt-5 font-semibold">2. ความเร็ว</h3>
        <div role="radiogroup" aria-label="ความเร็ว" className="grid grid-cols-3 gap-2">
          {PACES.map((p) => (
            <Choice key={p.value} on={pace === p.value} onClick={() => setPace(p.value)} label={p.label} hint={p.hint} />
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-500">ตอนนี้แอปใช้งานจริงที่ความเร็ว “{PACES.find((p) => p.value === livePace)?.label}”</p>
      </div>

      <h3 className="px-1 font-semibold">3. ฟังแต่ละภาค</h3>
      {regions.map((r) => (
        <div key={r.id} className={card}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h4 className="text-lg font-semibold">{r.name}</h4>
            <span className="text-sm text-slate-500">{r.area}</span>
          </div>
          <p lang="th" className="my-2 text-lg">{r.sample[gender]}</p>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => {
              if (m.value === "accent" && !r.hasAccent) return <span key={m.value} aria-hidden />;
              const clip = clipFor(r.id, m.value);
              const state = clip && active?.file === clip.file ? active.state : null;
              return (
                <button
                  key={m.value}
                  type="button"
                  disabled={!clip || state === "loading" || state === "playing"}
                  onClick={() => clip && play(clip.file)}
                  aria-label={`ฟัง ${r.name} ${m.label}`}
                  aria-busy={state === "loading"}
                  className={`flex min-h-14 touch-manipulation items-center justify-center gap-2 rounded-xl border-2 px-3 text-base font-medium transition enabled:hover:bg-brand-100 disabled:cursor-wait dark:border-slate-600 dark:enabled:hover:bg-slate-800 ${
                    state === "playing" ? "border-brand-500 bg-brand-50 dark:bg-slate-800" : "border-slate-300 bg-white dark:bg-slate-900"
                  }`}
                >
                  {state === "loading" ? (
                    <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                  ) : (
                    <span aria-hidden className={state === "playing" ? "animate-pulse" : ""}>{state === "error" ? "⚠️" : state === "playing" ? "🔊" : "🔈"}</span>
                  )}
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="px-1 text-sm text-slate-500">“สำเนียงถิ่น (AI)” คือให้เสียง AI ลองเลียนแบบสำเนียงของภาคนั้น อาจไม่เหมือนคนในพื้นที่จริง</p>
    </div>
  );
}
