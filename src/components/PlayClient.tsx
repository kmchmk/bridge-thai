"use client";

import Link from "next/link";
import { useState } from "react";
import { saveProgress } from "@/app/actions";
import { MISTAKE_FEEDBACK, starsFor, type StepView } from "@/lib/game";
import type { RegisterNote, Setup } from "@/lib/register/types";
import { setupQuery } from "@/lib/setup";
import { speakThai } from "@/lib/tts/browser";

function Line({ th, rom, en, onSpeak }: { th: string; rom: string; en: string; onSpeak?: () => void }) {
  return (
    <div>
      <div className="flex items-start gap-2">
        <p lang="th" className="text-2xl font-semibold leading-snug">{th}</p>
        {onSpeak && (
          <button type="button" onClick={onSpeak} aria-label="Play audio" className="mt-1 rounded-full border px-2 py-0.5 text-sm hover:bg-amber-100 dark:hover:bg-stone-800">
            🔊
          </button>
        )}
      </div>
      <p className="text-sm italic text-stone-500 dark:text-stone-400">{rom}</p>
      <p className="text-sm text-stone-700 dark:text-stone-300">{en}</p>
    </div>
  );
}

export function PlayClient({
  sceneId,
  title,
  steps,
  setup,
  notes,
}: {
  sceneId: string;
  title: string;
  steps: StepView[];
  setup: Setup;
  notes: RegisterNote[];
}) {
  const [i, setI] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean | null>(null);

  const done = i >= steps.length;
  const step = steps[i];
  const npcGender = setup.listenerGender;
  const rapport = Math.max(0, steps.length - mistakes);

  if (done) {
    const stars = starsFor(mistakes);
    return (
      <div className="space-y-6 text-center">
        <p className="text-5xl">{"⭐".repeat(stars)}{"☆".repeat(3 - stars)}</p>
        <h2 className="text-2xl font-bold">Scene complete!</h2>
        <p className="text-stone-600 dark:text-stone-300">
          {mistakes === 0 ? "Perfect register — they felt totally at ease." : `${mistakes} register slip${mistakes > 1 ? "s" : ""}. Try again for 3 stars.`}
        </p>
        <div className="rounded-xl border bg-white p-4 text-left dark:border-stone-700 dark:bg-stone-900">
          <h3 className="mb-2 font-semibold">Why these words?</h3>
          <ul className="space-y-1 text-sm">
            {notes.map((n) => (
              <li key={n.slot}><span lang="th" className="mr-2 font-semibold">{n.th}</span>{n.why}</li>
            ))}
          </ul>
        </div>
        {saved === null && (
          <button
            className="rounded-xl bg-amber-500 px-5 py-2 font-semibold text-white"
            onClick={async () => setSaved((await saveProgress(sceneId, mistakes).catch(() => ({ saved: false }))).saved)}
          >
            Save my progress
          </button>
        )}
        {saved === true && <p className="text-emerald-600">Progress saved ✓</p>}
        {saved === false && <p className="text-stone-500">Sign in to save progress across devices.</p>}
        <div className="flex justify-center gap-3">
          <button className="rounded-xl border px-5 py-2" onClick={() => { setI(0); setMistakes(0); setFeedback(null); setPicked(null); setSaved(null); }}>
            Replay
          </button>
          <Link className="rounded-xl bg-stone-900 px-5 py-2 text-white dark:bg-stone-100 dark:text-stone-900" href={`/scenes?${setupQuery(setup)}`}>
            More scenes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-stone-500">
        <span>{title} · {i + 1}/{steps.length}</span>
        <span aria-label={`Rapport ${rapport} of ${steps.length}`}>{"❤️".repeat(rapport)}{"🖤".repeat(steps.length - rapport)}</span>
      </div>

      <div className="rounded-2xl border bg-amber-50 p-5 dark:border-stone-700 dark:bg-stone-900">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">They say</p>
        <Line {...step.npc} onSpeak={() => speakThai(step.npc.th, npcGender)} />
      </div>

      <p className="font-medium">🎯 {step.prompt}</p>

      <div className="space-y-3">
        {step.choices.map((c) => {
          const chosenWrong = picked === c.id && c.mistake;
          return (
            <div key={c.id} className="flex items-stretch gap-2">
              <button
                type="button"
                disabled={picked === "ok"}
                onClick={() => {
                  speakThai(c.line.th, setup.speakerGender);
                  if (picked === c.id) return;
                  setPicked(c.id);
                  if (c.mistake) {
                    setMistakes((m) => m + 1);
                    setFeedback(MISTAKE_FEEDBACK[c.mistake]);
                  } else {
                    setFeedback(null);
                  }
                }}
                className={`min-w-0 flex-1 rounded-xl border p-4 text-left transition ${
                  picked === "ok" && !c.mistake
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                    : chosenWrong
                      ? "border-rose-400 bg-rose-50 dark:bg-rose-950"
                      : "bg-white hover:border-amber-400 dark:border-stone-700 dark:bg-stone-900"
                }`}
              >
                <Line {...c.line} />
              </button>
              {/* Listen without choosing: a separate control, since buttons can't nest. */}
              <button
                type="button"
                onClick={() => speakThai(c.line.th, setup.speakerGender)}
                aria-label={`Play audio: ${c.line.rom}`}
                className="shrink-0 rounded-xl border bg-white px-3 text-lg hover:bg-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
              >
                🔊
              </button>
            </div>
          );
        })}
      </div>

      {feedback && <p role="status" className="rounded-lg bg-rose-100 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">😬 {feedback} Try again.</p>}

      {picked === "ok" && (
        <div className="space-y-3">
          <p role="status" className="rounded-lg bg-emerald-100 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            ✅ Natural for this setup.
          </p>
          <button
            className="w-full rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white dark:bg-amber-500"
            onClick={() => { setI((n) => n + 1); setPicked(null); setFeedback(null); }}
          >
            {i + 1 === steps.length ? "Finish" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}
