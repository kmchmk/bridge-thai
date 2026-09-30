"use client";

import { useRef, useState, useTransition } from "react";
import { saveVoiceSettings } from "@/app/admin/actions";
import { GEMINI_VOICES, PACES, type PaceKey } from "@/lib/tts/voices";

type Gender = "male" | "female";
interface Props {
  model: string | null;
  configured: boolean;
  settings: { male: string; female: string; pace: PaceKey };
  coverage: { total: number; cached: number; allClipsEver: number } | null;
  preview: Record<Gender, { th: string; rom: string; en: string }>;
}

const card = "rounded-2xl border bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900";

function VoiceList({
  gender, value, onChange, sample, playing, onAudition,
}: {
  gender: Gender; value: string; onChange: (v: string) => void; sample: string; playing: string | null; onAudition: (voice: string) => void;
}) {
  return (
    <div className={card}>
      <h2 className="font-semibold capitalize">{gender} voice</h2>
      <p lang="th" className="mb-3 text-sm text-slate-500">{sample}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {GEMINI_VOICES.filter((v) => v.gender === gender).map((v) => {
          const state = playing?.endsWith(`:${v.name}`) ? playing.split(":")[0] : null;
          return (
            <li key={v.name} className="flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => onChange(v.name)}
                aria-pressed={value === v.name}
                className={`min-h-11 flex-1 rounded-xl border px-3 py-2 text-left text-sm transition ${
                  value === v.name ? "border-brand-600 bg-brand-600 text-white" : "bg-white hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <span className="font-semibold">{v.name}</span> <span className="opacity-75">· {v.trait}</span>
              </button>
              <button
                type="button"
                onClick={() => onAudition(v.name)}
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
  );
}

export function AdminVoices({ model, configured, settings, coverage, preview }: Props) {
  const [male, setMale] = useState(settings.male);
  const [female, setFemale] = useState(settings.female);
  const [pace, setPace] = useState<PaceKey>(settings.pace);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const dirty = male !== settings.male || female !== settings.female || pace !== settings.pace;

  // src is the API URL itself, so play() stays inside the tap (iOS) while generation happens on first use.
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
        <p className="mt-1 text-sm text-slate-500">
          Previews generate once per voice and pace, then are cached. Gender labels follow Google&apos;s voice catalog — trust your ears.
        </p>
      </div>

      <VoiceList gender="male" value={male} onChange={setMale} sample={preview.male.th} playing={playing} onAudition={audition} />
      <VoiceList gender="female" value={female} onChange={setFemale} sample={preview.female.th} playing={playing} onAudition={audition} />

      <div className={card}>
        <h2 className="mb-3 font-semibold">Pace</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(PACES) as PaceKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPace(k)}
              aria-pressed={pace === k}
              className={`min-h-14 rounded-xl border px-3 py-2 text-left text-sm transition ${
                pace === k ? "border-brand-600 bg-brand-600 text-white" : "bg-white hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <span className="block font-semibold">{PACES[k].label}</span>
              <span className="block text-xs opacity-75">{PACES[k].hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 bg-[var(--background)]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-6 dark:sm:border-slate-700">
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              await saveVoiceSettings(male, female, pace);
              setSaved("Saved — live within ~15 seconds. New voices generate on first play; use “Generate all clips” below to pre-build them.");
            })
          }
          className="min-h-12 rounded-xl bg-brand-600 px-6 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save voices & pace"}
        </button>
        <span className="min-w-0 basis-full text-sm text-slate-500 sm:flex-1 sm:basis-0" role="status">
          {saved ?? (dirty ? "Unsaved changes" : `Active: ${settings.male} (male) · ${settings.female} (female) · ${PACES[settings.pace].label}`)}
        </span>
      </div>

      {coverage && <Coverage coverage={coverage} dirty={dirty} />}
    </div>
  );
}

function Coverage({ coverage, dirty }: { coverage: NonNullable<Props["coverage"]>; dirty: boolean }) {
  const [done, setDone] = useState(coverage.cached);
  const [running, setRunning] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  async function run() {
    setRunning(true); setErrors([]); setFinished(false);
    let offset = 0;
    while (true) {
      const res = await fetch("/api/admin/tts/warm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offset, limit: 6 }) });
      if (!res.ok) { setErrors((e) => [...e, `HTTP ${res.status}`]); break; }
      const j = (await res.json()) as { next: number | null; errors: string[] };
      setErrors((e) => [...e, ...j.errors]);
      setDone(Math.min(coverage.total, (j.next ?? coverage.total) - j.errors.length));
      if (j.next === null) break;
      offset = j.next;
    }
    setRunning(false); setFinished(true);
  }

  return (
    <div className={card}>
      <h2 className="font-semibold">Clip library</h2>
      <p className="text-sm text-slate-500">
        {done}/{coverage.total} of the app&apos;s lines have audio for the <em>saved</em> voices and pace ({coverage.allClipsEver} clips stored in total, including old voices).
        Optional: every clip is otherwise generated the first time someone plays it. Generating all of them takes roughly {Math.max(1, Math.round((coverage.total - done) * 4 / 3 / 60))} min and costs a few dollars at most.
      </p>
      <div className="my-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden>
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${(done / coverage.total) * 100}%` }} />
      </div>
      <button
        type="button"
        disabled={running || dirty}
        onClick={run}
        className="min-h-12 rounded-xl border px-5 font-medium transition hover:bg-brand-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        {running ? "Generating…" : finished ? "Done — run again" : "Generate all clips (optional)"}
      </button>
      {dirty && <p className="mt-2 text-sm text-slate-500">Save your changes first.</p>}
      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-rose-600">
          {errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}
