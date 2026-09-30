"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { completeScene, saveStep } from "@/app/actions";
import { MISTAKE_FEEDBACK, starsFor, type StepView } from "@/lib/game";
import type { RegisterNote, Setup } from "@/lib/register/types";
import { PlayButton } from "@/components/PlayButton";
import { prefetchThai, speakThai, stopSpeaking } from "@/lib/tts/speak";

function Line({ th, rom, en }: { th: string; rom: string; en: string }) {
  return (
    <div className="min-w-0">
      <p lang="th" className="break-words text-xl font-semibold leading-snug sm:text-2xl">{th}</p>
      <p className="break-words text-sm italic text-slate-500 dark:text-slate-400">{rom}</p>
      <p className="text-sm text-slate-700 sm:text-base dark:text-slate-300">{en}</p>
    </div>
  );
}

type SaveState = "idle" | "saved" | "anon";

export function PlayClient({
  sceneId,
  title,
  steps,
  setup,
  notes,
  signedIn,
  initialStep,
  initialMistakes,
  backHref,
}: {
  sceneId: string;
  title: string;
  steps: StepView[];
  setup: Setup;
  notes: RegisterNote[];
  signedIn: boolean;
  initialStep: number;
  initialMistakes: number;
  backHref: string;
}) {
  const [i, setI] = useState(initialStep);
  const [mistakes, setMistakes] = useState(initialMistakes);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [resumed, setResumed] = useState(initialStep > 0);

  const done = i >= steps.length;
  const step = steps[i];
  const npcGender = setup.listenerGender;
  const rapport = Math.max(0, steps.length - mistakes);

  // Warm the NPC line for this step; silence anything still playing when the step changes or we leave.
  const npcText = step?.npc.th;
  useEffect(() => {
    if (npcText) prefetchThai(npcText, npcGender);
    return stopSpeaking;
  }, [npcText, npcGender]);

  const restart = () => {
    setI(0); setMistakes(0); setFeedback(null); setPicked(null); setSaveState("idle"); setResumed(false);
  };

  const next = () => {
    const n = i + 1;
    setI(n); setPicked(null); setFeedback(null); setResumed(false);
    // Auto-save: fire-and-forget so the UI never waits on the network.
    if (n >= steps.length) {
      completeScene(sceneId, mistakes)
        .then((r) => setSaveState(r.saved ? "saved" : "anon"))
        .catch(() => setSaveState("anon"));
    } else {
      saveStep(sceneId, n, mistakes).catch(() => undefined);
    }
  };

  if (done) {
    const stars = starsFor(mistakes);
    return (
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <p className="text-5xl sm:text-6xl">{"⭐".repeat(stars)}{"☆".repeat(3 - stars)}</p>
        <h2 className="text-2xl font-bold sm:text-3xl">Scene complete!</h2>
        <p className="text-slate-600 dark:text-slate-300">
          {mistakes === 0 ? "Perfect register — they felt totally at ease." : `${mistakes} register slip${mistakes > 1 ? "s" : ""}. Try again for 3 stars.`}
        </p>
        <div className="rounded-xl border bg-white p-4 text-left dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-2 font-semibold">Why these words?</h3>
          <ul className="space-y-1 text-sm sm:text-base">
            {notes.map((n) => (
              <li key={n.slot}><span lang="th" className="mr-2 font-semibold">{n.th}</span>{n.why}</li>
            ))}
          </ul>
        </div>
        <p role="status" className="text-sm">
          {saveState === "saved" && <span className="text-emerald-600">Progress saved ✓</span>}
          {saveState === "anon" && <span className="text-slate-500">{signedIn ? "Couldn't save just now." : "Sign in (top right) to save progress across devices."}</span>}
          {saveState === "idle" && <span className="text-slate-400">Saving…</span>}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button className="min-h-12 rounded-xl border px-6 py-2 font-medium" onClick={restart}>Replay</button>
          <Link className="flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-6 py-2 font-medium text-white dark:bg-brand-500" href={backHref}>
            More scenes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 lg:max-w-none short-landscape:max-w-none">
      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <Link href={backHref} className="inline-flex min-h-11 items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200">
          <span aria-hidden>←</span> Scenes
        </Link>
        <span className="flex min-w-0 items-baseline gap-1">
          <span className="truncate">{title}</span>
          <span className="shrink-0">· {i + 1}/{steps.length}</span>
        </span>
        <span aria-label={`Rapport ${rapport} of ${steps.length}`} className="whitespace-nowrap">
          {"❤️".repeat(rapport)}{"🖤".repeat(steps.length - rapport)}
        </span>
      </div>

      {resumed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-100 dark:bg-brand-900 px-4 py-2 text-sm text-brand-900 dark:text-brand-100">
          <span>Welcome back — picking up at step {i + 1}.</span>
          <button className="min-h-9 font-medium underline" onClick={() => { restart(); if (signedIn) saveStep(sceneId, 0, 0).catch(() => undefined); }}>
            Start over
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[2fr_3fr] lg:items-start lg:gap-10 short-landscape:grid-cols-[2fr_3fr] short-landscape:items-start short-landscape:gap-5">
        <div className="space-y-4 lg:sticky lg:top-6 short-landscape:sticky short-landscape:top-2">
          <div className="rounded-2xl border bg-brand-50 p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">They say</p>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1"><Line {...step.npc} /></div>
              <PlayButton text={step.npc.th} gender={npcGender} label={step.npc.rom} />
            </div>
          </div>
          <p className="font-medium sm:text-lg">🎯 {step.prompt}</p>
        </div>

        <div className="space-y-4">
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
                    className={`min-h-16 min-w-0 flex-1 touch-manipulation rounded-xl border p-4 text-left transition sm:p-5 ${
                      picked === "ok" && !c.mistake
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                        : chosenWrong
                          ? "border-rose-400 bg-rose-50 dark:bg-rose-950"
                          : "bg-white hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
                    }`}
                  >
                    <Line {...c.line} />
                  </button>
                  {/* Listen without choosing: a separate control, since buttons can't nest. */}
                  <PlayButton text={c.line.th} gender={setup.speakerGender} label={c.line.rom} className="sm:min-w-14" />
                </div>
              );
            })}
          </div>

          {feedback && <p role="status" className="rounded-lg bg-rose-100 p-3 text-sm text-rose-800 sm:text-base dark:bg-rose-950 dark:text-rose-200">😬 {feedback} Try again.</p>}

          {picked === "ok" && (
            // Sticky above the home indicator on phones so "Next" is always reachable; one compact row.
            <div className="sticky bottom-0 z-10 -mx-4 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:p-0 dark:bg-slate-950/95 dark:lg:bg-transparent">
              <div className="flex flex-wrap items-stretch gap-3">
                <p role="status" className="flex min-h-12 min-w-[9rem] flex-1 items-center rounded-lg bg-emerald-100 px-3 text-sm text-emerald-800 sm:text-base dark:bg-emerald-950 dark:text-emerald-200">
                  ✅ Natural for this setup.
                </p>
                <button className="min-h-12 min-w-[8.5rem] flex-1 touch-manipulation rounded-xl bg-brand-600 px-6 text-base font-semibold text-white hover:bg-brand-700 sm:flex-none sm:px-10 dark:bg-brand-500" onClick={next}>
                  {i + 1 === steps.length ? "Finish" : "Next →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
