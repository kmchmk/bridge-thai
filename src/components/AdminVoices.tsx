"use client";

import { useRef, useState } from "react";
import { GEMINI_VOICES, PACES, type PaceKey } from "@/lib/tts/voices";

type Gender = "male" | "female";
interface Coverage { total: number; shipped: number }
interface Props {
  model: string | null;
  configured: boolean;
  settings: { male: string; female: string; pace: PaceKey };
  coverage: { th: Coverage; en: Record<string, Coverage> } | null;
  preview: Record<Gender, { th: string; rom: string; en: string }>;
}

const card = "rounded-2xl border bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900";

/** Audition-only: the live voices are fixed in code because the shipped audio clips are made for them. */
export function AdminVoices({ model, configured, settings, coverage, preview }: Props) {
  const [pace, setPace] = useState<PaceKey>(settings.pace);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  // src is the API URL itself, so play() stays inside the tap (iOS). Auditions are generated on demand (a few seconds).
  const audition = (voice: string) => {
    audio.current?.pause();
    const a = new Audio(`/api/admin/tts/sample?${new URLSearchParams({ voice, pace })}`);
    audio.current = a;
    setPlaying(`loading:${voice}`);
    a.onplaying = () => setPlaying(`playing:${voice}`);
    a.onended = () => setPlaying(null);
    a.onerror = () => setPlaying(`error:${voice}`);
    a.play().catch(() => setPlaying(`error:${voice}`));
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <p className="text-sm">
          Model: <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{model ?? "not set"}</code>{" "}
          {configured ? <span className="text-emerald-600">● configured</span> : <span className="text-rose-600">● OPENROUTER_API_KEY / TTS_MODEL missing</span>}
        </p>
        <p className="mt-2 text-sm">
          Live voices: <b>{settings.male}</b> (male) · <b>{settings.female}</b> (female) · pace <b>{PACES[settings.pace].label}</b>
        </p>
        <p className="mt-1 text-sm text-slate-500">
          The app plays audio files that ship with it, made for exactly these voices (chosen by the native-speaker reviewer). This page is for auditioning
          other voices; auditions are generated on demand and not stored. To change the live voices, edit <code>src/lib/tts/settings.ts</code> and rebuild the clips with <code>npx tsx scripts/build-audio.ts</code>.
        </p>
        {coverage && (
          <p className="mt-2 text-sm text-slate-500">
            Shipped clips: Thai {coverage.th.shipped}/{coverage.th.total}
            {Object.entries(coverage.en).map(([a, c]) => ` · English ${a.toUpperCase()} ${c.shipped}/${c.total}`).join("")}
          </p>
        )}
      </div>

      {(["male", "female"] as Gender[]).map((gender) => (
        <div key={gender} className={card}>
          <h2 className="font-semibold capitalize">{gender} voices</h2>
          <p lang="th" className="mb-3 text-sm text-slate-500">{preview[gender].th}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {GEMINI_VOICES.filter((v) => v.gender === gender).map((v) => {
              const state = playing?.endsWith(`:${v.name}`) ? playing.split(":")[0] : null;
              const live = v.name === (gender === "male" ? settings.male : settings.female);
              return (
                <li key={v.name} className="flex items-stretch gap-1">
                  <span className={`flex min-h-11 flex-1 items-center rounded-xl border px-3 py-2 text-sm ${live ? "border-brand-600 bg-brand-600 text-white" : "bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
                    <span className="font-semibold">{v.name}</span>&nbsp;<span className="opacity-75">· {v.trait}</span>
                    {live && <span className="ml-auto text-xs font-semibold">● live</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => audition(v.name)}
                    aria-label={`Preview ${v.name}`}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border bg-white hover:bg-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                  >
                    <span className={state === "loading" ? "animate-pulse opacity-60" : ""}>{state === "error" ? "⚠️" : state === "playing" ? "🔊" : "🔈"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className={card}>
        <h2 className="mb-3 font-semibold">Audition pace</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(PACES) as PaceKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPace(k)}
              aria-pressed={pace === k}
              className={`min-h-14 rounded-xl border px-3 py-2 text-left text-sm transition ${pace === k ? "border-brand-600 bg-brand-600 text-white" : "bg-white hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900"}`}
            >
              <span className="block font-semibold">{PACES[k].label}</span>
              <span className="block text-xs opacity-75">{PACES[k].hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
