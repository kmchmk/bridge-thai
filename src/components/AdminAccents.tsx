"use client";

import { useRef, useState, useTransition } from "react";
import { saveAccentSettings } from "@/app/admin/actions";
import type { PaceKey } from "@/lib/tts/voices";

type Gender = "male" | "female";
interface Accent {
  id: string;
  label: string;
  flag: string;
  hint: string;
  reviewed: boolean;
  defaultHint: string;
  words: Record<string, string>;
}

const card = "rounded-2xl border bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900";

export function AdminAccents({ accents, pace, voices, configured }: { accents: Accent[]; pace: PaceKey; voices: Record<Gender, string>; configured: boolean }) {
  const [gender, setGender] = useState<Gender>("female");
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const play = (id: string, hint: string) => {
    audio.current?.pause();
    const a = new Audio(`/api/admin/tts/sample?${new URLSearchParams({ voice: voices[gender], pace, accent: id, hint })}`);
    audio.current = a;
    setPlaying(`loading:${id}`);
    a.onplaying = () => setPlaying(`playing:${id}`);
    a.onended = () => setPlaying(null);
    a.onerror = () => setPlaying(`error:${id}`);
    a.play().catch(() => setPlaying(`error:${id}`));
  };

  return (
    <section className="space-y-4" aria-labelledby="accents-h">
      <div className={card}>
        <h2 id="accents-h" className="text-lg font-semibold">English accents (US · UK · AU)</h2>
        <p className="mt-1 text-sm text-slate-500">
          The English course speaks with the accent the learner picks. The accent prompt is added to the voice style; changing it generates new audio on first play.
          Thai learners see an &ldquo;AI voice&rdquo; note next to the accent.
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
      {accents.map((a) => (
        <AccentCard key={a.id} a={a} playing={playing} onPlay={play} />
      ))}
    </section>
  );
}

function AccentCard({ a, playing, onPlay }: { a: Accent; playing: string | null; onPlay: (id: string, hint: string) => void }) {
  const [hint, setHint] = useState(a.hint);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = hint.trim() !== a.hint.trim();
  const state = playing?.endsWith(`:${a.id}`) ? playing.split(":")[0] : null;

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold">{a.flag} {a.label}</h3>
        <span className={`rounded px-2 py-0.5 text-xs ${a.reviewed ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"}`}>{a.reviewed ? "Reviewed" : "Draft"}</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {Object.entries(a.words).slice(0, 6).map(([k, v]) => `${k}: ${v}`).join(" · ")}
      </p>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-medium">Accent prompt</span>
        <textarea value={hint} onChange={(e) => setHint(e.target.value)} rows={3} maxLength={400} className="w-full rounded-xl border bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onPlay(a.id, hint)}
          aria-label={`Play sample: ${a.label}`}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border bg-white hover:bg-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <span className={state === "loading" ? "animate-pulse opacity-60" : ""}>{state === "error" ? "⚠️" : state === "playing" ? "🔊" : "🔈"}</span>
        </button>
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={() => start(async () => { await saveAccentSettings(a.id, hint); setMsg("Saved — live within ~15 seconds."); })}
          className="min-h-12 rounded-xl bg-brand-600 px-5 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setHint(a.defaultHint)} className="min-h-11 text-sm underline">Reset prompt</button>
        <span className="min-w-0 basis-full text-sm text-slate-500 sm:flex-1 sm:basis-0" role="status">{msg ?? (dirty ? "Unsaved changes" : "Active")}</span>
      </div>
    </div>
  );
}
