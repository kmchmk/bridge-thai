"use client";

import { useRef, useState, useTransition } from "react";
import { saveRegionAudioSettings } from "@/app/admin/actions";
import type { PaceKey } from "@/lib/tts/voices";

type Mode = "central" | "accent";
type Gender = "male" | "female";
interface Region {
  id: string;
  label: string;
  area: string;
  kind: "standard" | "dialect" | "accent";
  reviewed: boolean;
  notes: string;
  dialectWords: number;
  scenes: number;
  defaultHint: string;
  sample: Record<Gender, { th: string; rom: string; en: string }>;
  mode: Mode;
  hint: string;
}

const card = "rounded-2xl border bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900";
const KIND = { standard: "Standard", dialect: "Dialect", accent: "Accent only" } as const;

export function AdminRegions({ regions, pace, voices, configured }: { regions: Region[]; pace: PaceKey; voices: Record<Gender, string>; configured: boolean }) {
  const [gender, setGender] = useState<Gender>("female");
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  // src is the API URL itself so play() happens inside the tap (iOS); first play of a sample generates it once.
  const play = (key: string, region: string, mode: Mode, hint: string) => {
    audio.current?.pause();
    const q = new URLSearchParams({ voice: voices[gender], pace, region, mode });
    if (mode === "accent") q.set("hint", hint);
    const a = new Audio(`/api/admin/tts/sample?${q}`);
    audio.current = a;
    setPlaying(`loading:${key}`);
    a.onplaying = () => setPlaying(`playing:${key}`);
    a.onended = () => setPlaying(null);
    a.onerror = () => setPlaying(`error:${key}`);
    a.play().catch(() => setPlaying(`error:${key}`));
  };

  return (
    <section className="space-y-4" aria-labelledby="regions-h">
      <div className={card}>
        <h2 id="regions-h" className="text-lg font-semibold">Regions &amp; accents</h2>
        <p className="mt-1 text-sm text-slate-500">
          Learners always see a &ldquo;Central pronunciation&rdquo; label on dialect regions. Switch a region to <b>accent hint</b> to ask the voice to imitate the accent
          (experimental — an AI approximation; have a native speaker judge it). The label then reads &ldquo;AI-approximated accent&rdquo;.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Audition with the</span>
          {(["female", "male"] as Gender[]).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={gender === g}
              onClick={() => setGender(g)}
              className={`min-h-11 rounded-xl border px-3 transition ${gender === g ? "border-brand-600 bg-brand-600 text-white" : "bg-white hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900"}`}
            >
              {g} voice ({voices[g]})
            </button>
          ))}
        </div>
        {!configured && <p className="mt-2 text-sm text-rose-600">TTS isn&apos;t configured, so auditions won&apos;t play.</p>}
      </div>

      {regions.map((r) => (
        <RegionCard key={r.id} r={r} gender={gender} playing={playing} onPlay={play} />
      ))}
    </section>
  );
}

function RegionCard({ r, gender, playing, onPlay }: { r: Region; gender: Gender; playing: string | null; onPlay: (key: string, region: string, mode: Mode, hint: string) => void }) {
  const [mode, setMode] = useState<Mode>(r.mode);
  const [hint, setHint] = useState(r.hint);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = mode !== r.mode || hint.trim() !== r.hint.trim();
  const sample = r.sample[gender];
  const state = (k: string) => (playing?.endsWith(`:${r.id}-${k}`) ? playing.split(":")[0] : null);
  const icon = (k: string) => (state(k) === "error" ? "⚠️" : state(k) === "playing" ? "🔊" : "🔈");

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{r.label}</h3>
          <p className="text-sm text-slate-500">{r.area}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{KIND[r.kind]}</span>
          <span className={`rounded px-2 py-0.5 ${r.reviewed ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"}`}>{r.reviewed ? "Reviewed" : "Draft"}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{r.dialectWords} dialect words</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{r.scenes} scenes</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{r.notes}</p>

      {r.kind !== "standard" && (
        <div className="mt-4 space-y-3 border-t pt-4 dark:border-slate-700">
          <p lang="th" className="text-sm"><span className="font-semibold">{sample.th}</span> <span className="text-slate-500">· {sample.en}</span></p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["central", "accent"] as Mode[]).map((m) => (
              <div key={m} className="flex items-stretch gap-1">
                <button
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`min-h-12 min-w-0 flex-1 rounded-xl border px-3 py-2 text-left text-sm transition ${mode === m ? "border-brand-600 bg-brand-600 text-white" : "bg-white hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900"}`}
                >
                  <span className="block font-semibold">{m === "central" ? "Central pronunciation" : "Accent hint (experimental)"}</span>
                  <span className="block text-xs opacity-75">{m === "central" ? "Plain voice; learners see the label" : "AI imitates the regional accent"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPlay(`${r.id}-${m}`, r.id, m, hint)}
                  aria-label={`Play sample: ${m === "central" ? "central pronunciation" : "accent hint"}`}
                  className="flex min-h-12 min-w-11 items-center justify-center rounded-xl border bg-white hover:bg-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <span className={state(m) === "loading" ? "animate-pulse opacity-60" : ""}>{icon(m)}</span>
                </button>
              </div>
            ))}
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Accent prompt</span>
            <textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              rows={3}
              maxLength={400}
              className="w-full rounded-xl border bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!dirty || pending}
              onClick={() =>
                start(async () => {
                  await saveRegionAudioSettings(r.id, mode, hint);
                  setMsg("Saved — live within ~15 seconds. New audio is generated on first play.");
                })
              }
              className="min-h-12 rounded-xl bg-brand-600 px-5 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setHint(r.defaultHint)} className="min-h-11 text-sm underline">Reset prompt</button>
            <span className="min-w-0 basis-full text-sm text-slate-500 sm:flex-1 sm:basis-0" role="status">{msg ?? (dirty ? "Unsaved changes" : `Active: ${r.mode === "accent" ? "accent hint" : "central pronunciation"}`)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
