"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { completeScene, saveStep } from "@/app/actions";
import { starsFor, type LineView, type StepView } from "@/lib/game";
import type { AccentId } from "@/lib/accents";
import type { RegisterNote, Region } from "@/lib/register/types";
import { AudioNote, EnglishAudioNote } from "@/components/AudioNote";
import { useT } from "@/components/LangProvider";
import { PlayButton } from "@/components/PlayButton";
import { ctxKey, type AudioCtx } from "@/lib/tts/ctx";
import { prefetchLine, speakLine, stopSpeaking } from "@/lib/tts/speak";

function Line({ line, lang }: { line: LineView; lang: "th" | "en" }) {
  return (
    <div className="min-w-0">
      <p lang={lang} className="break-words text-xl font-semibold leading-snug sm:text-2xl">{line.text}</p>
      {line.sub && <p className="break-words text-sm italic text-slate-500 dark:text-slate-400">{line.sub}</p>}
      <p className="text-sm text-slate-700 sm:text-base dark:text-slate-300">{line.gloss}</p>
    </div>
  );
}

const noSubscribe = () => () => {};
function readCoachSeen() {
  try {
    return localStorage.getItem("bt_coach_done") === "1";
  } catch {
    return false;
  }
}

type SaveState = "idle" | "saved" | "anon";

export function PlayClient({
  sceneId,
  title,
  steps,
  audio,
  speakerGender,
  listenerGender,
  notes,
  signedIn,
  audioMode,
  initialStep,
  initialMistakes,
  backHref,
}: {
  sceneId: string;
  title: string;
  steps: StepView[];
  /** Which language/accent the audio speaks (also the language being learned). */
  audio: AudioCtx;
  speakerGender: "male" | "female";
  listenerGender: "male" | "female";
  notes: RegisterNote[];
  signedIn: boolean;
  /** Thai course only: how the region's audio is generated. */
  audioMode: "central" | "accent";
  initialStep: number;
  initialMistakes: number;
  backHref: string;
}) {
  const t = useT();
  const lang = audio.lang;
  const [i, setI] = useState(initialStep);
  const [mistakes, setMistakes] = useState(initialMistakes);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [resumed, setResumed] = useState(initialStep > 0);
  // First-time coaching: shown on the first step until dismissed (remembered on this device).
  const seenCoach = useSyncExternalStore(noSubscribe, readCoachSeen, () => true);
  const [coachDismissed, setCoachDismissed] = useState(false);
  const coach = !seenCoach && !coachDismissed;
  const dismissCoach = () => {
    setCoachDismissed(true);
    try {
      localStorage.setItem("bt_coach_done", "1");
    } catch {
      // Private mode: the tip just shows again next time.
    }
  };

  const done = i >= steps.length;
  const step = steps[i];
  const npcGender = listenerGender;
  const rapport = Math.max(0, steps.length - mistakes);

  // Warm the NPC line for this step; silence anything still playing when the step changes or we leave.
  const npcText = step?.npc.text;
  const audioKey = ctxKey(audio);
  useEffect(() => {
    if (npcText) prefetchLine(npcText, npcGender, audio);
    return stopSpeaking;
    // `audio` is derived from audioKey; depending on the object would re-fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npcText, npcGender, audioKey]);

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
        <h2 className="text-2xl font-bold sm:text-3xl">{t.sceneComplete}</h2>
        <p className="text-slate-600 dark:text-slate-300">
          {mistakes === 0 ? t.perfect : t.slips(mistakes)}
        </p>
        {notes.length > 0 && (
          <div className="rounded-xl border bg-white p-4 text-left dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-2 font-semibold">{t.whyThese}</h3>
            <ul className="space-y-1 text-sm sm:text-base">
              {notes.map((n) => (
                <li key={n.slot}><span lang={lang} className="mr-2 font-semibold">{n.word}</span>{n.why}</li>
              ))}
            </ul>
          </div>
        )}
        <p role="status" className="text-sm">
          {saveState === "saved" && <span className="text-emerald-600">{t.saved}</span>}
          {saveState === "anon" && <span className="text-slate-500">{signedIn ? t.saveFailed : t.saveSignIn}</span>}
          {saveState === "idle" && <span className="text-slate-400">{t.saving}</span>}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button className="min-h-12 rounded-xl border px-6 py-2 font-medium" onClick={restart}>{t.replay}</button>
          <Link className="flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-6 py-2 font-medium text-white dark:bg-brand-500" href={backHref}>
            {t.moreScenes}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 lg:max-w-none short-landscape:max-w-none">
      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <Link href={backHref} className="inline-flex min-h-11 items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200">
          <span aria-hidden>←</span> {t.scenesBack}
        </Link>
        <span className="flex min-w-0 items-baseline gap-1">
          <span className="truncate">{title}</span>
          <span className="shrink-0">· {i + 1}/{steps.length}</span>
        </span>
        <span aria-label={t.rapport(rapport, steps.length)} className="whitespace-nowrap">
          {"❤️".repeat(rapport)}{"🖤".repeat(steps.length - rapport)}
        </span>
      </div>

      {audio.lang === "th" ? <AudioNote region={audio.region as Region} mode={audioMode} /> : <EnglishAudioNote accent={audio.accent as AccentId} />}

      {coach && i === 0 && !resumed && (
        <div className="rounded-2xl border border-brand-300 bg-brand-50 p-4 dark:border-brand-700 dark:bg-slate-900">
          <p className="mb-2 font-semibold">{t.howToTitle}</p>
          <ol className="space-y-1.5 text-base sm:text-lg">
            {t.howTo.map((text, k) => (
              <li key={k}><span className="mr-2 font-bold text-brand-700 dark:text-brand-300">{k + 1}.</span>{text}</li>
            ))}
          </ol>
          <button type="button" onClick={dismissCoach} className="mt-3 min-h-12 rounded-xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700 dark:bg-brand-500">
            {t.gotIt}
          </button>
        </div>
      )}

      {resumed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-100 dark:bg-brand-900 px-4 py-2 text-sm text-brand-900 dark:text-brand-100">
          <span>{t.welcomeBack(i + 1)}</span>
          <button className="min-h-9 font-medium underline" onClick={() => { restart(); if (signedIn) saveStep(sceneId, 0, 0).catch(() => undefined); }}>
            {t.startOver}
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[2fr_3fr] lg:items-start lg:gap-10 short-landscape:grid-cols-[2fr_3fr] short-landscape:items-start short-landscape:gap-5">
        <div className="space-y-4 lg:sticky lg:top-6 short-landscape:sticky short-landscape:top-2">
          <div className="rounded-2xl border bg-brand-50 p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{t.theySay}</p>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1"><Line line={step.npc} lang={lang} /></div>
              <PlayButton text={step.npc.text} gender={npcGender} label={step.npc.sub ?? step.npc.text} audio={audio} />
            </div>
          </div>
          <p className="text-lg font-semibold sm:text-xl">🎯 <span className="text-brand-700 dark:text-brand-300">{t.yourTurn}</span> {step.prompt}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            {step.choices.map((c) => {
              const chosenWrong = picked === c.id && !c.correct;
              return (
                <div key={c.id} className="flex items-stretch gap-2">
                  <button
                    type="button"
                    disabled={picked === "ok"}
                    onClick={() => {
                      speakLine(c.line.text, speakerGender, audio);
                      if (picked === c.id) return;
                      setPicked(c.id);
                      if (!c.correct) {
                        setMistakes((m) => m + 1);
                        setFeedback(c.feedback);
                      } else {
                        setFeedback(null);
                      }
                    }}
                    className={`min-h-16 min-w-0 flex-1 touch-manipulation rounded-xl border p-4 text-left transition sm:p-5 ${
                      picked === "ok" && c.correct
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                        : chosenWrong
                          ? "border-rose-400 bg-rose-50 dark:bg-rose-950"
                          : "bg-white hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
                    }`}
                  >
                    <Line line={c.line} lang={lang} />
                  </button>
                  {/* Listen without choosing: a separate control, since buttons can't nest. */}
                  <PlayButton text={c.line.text} gender={speakerGender} label={c.line.sub ?? c.line.text} audio={audio} className="sm:min-w-14" />
                </div>
              );
            })}
          </div>

          {feedback && <p role="status" className="rounded-lg bg-rose-100 p-3 text-sm text-rose-800 sm:text-base dark:bg-rose-950 dark:text-rose-200">😬 {feedback} {t.tryAgain}</p>}

          {picked === "ok" && step.tip && (
            <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900 sm:text-base dark:bg-brand-900/40 dark:text-brand-100">💡 <span className="font-semibold">{t.tip}:</span> {step.tip}</p>
          )}

          {picked === "ok" && (
            // Sticky above the home indicator on phones so "Next" is always reachable; one compact row.
            <div className="sticky bottom-0 z-10 -mx-4 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:p-0 dark:bg-slate-950/95 dark:lg:bg-transparent">
              <div className="flex flex-wrap items-stretch gap-3">
                <p role="status" className="flex min-h-12 min-w-[9rem] flex-1 items-center rounded-lg bg-emerald-100 px-3 text-sm text-emerald-800 sm:text-base dark:bg-emerald-950 dark:text-emerald-200">
                  {t.natural}
                </p>
                <button className="min-h-12 min-w-[8.5rem] flex-1 touch-manipulation rounded-xl bg-brand-600 px-6 text-base font-semibold text-white hover:bg-brand-700 sm:flex-none sm:px-10 dark:bg-brand-500" onClick={next}>
                  {i + 1 === steps.length ? t.finish : t.next}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
