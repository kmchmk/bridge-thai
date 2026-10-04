"use client";
import { useEffect, useState } from "react";
import { useNative } from "@/components/LangProvider";
import { AudioWarmup } from "@/components/AudioWarmup";
import { LessonFeedback } from "./LessonFeedback";
import { PlayButton } from "@/components/PlayButton";
import { stopSpeaking } from "@/lib/tts/speak";
import type { AtlasContent } from "@/lib/atlas/content";
import { LOCATIONS } from "@/lib/atlas/catalog";
import {
  advancePicnic,
  PICNIC_STEPS,
  picnicItems,
  picnicMemory,
  type PicnicProgress,
} from "@/lib/atlas/picnic";
import type { Gender } from "@/lib/register/types";
import type { AudioCtx, Pace } from "@/lib/tts/ctx";

export function PicnicBasket({ progress }: { progress: PicnicProgress }) {
  const thai = useNative() === "th";
  const labels: Record<string, string> = { "A friend": "เพื่อน", Lunch: "อาหารกลางวัน", Fruit: "ผลไม้" };
  return (
    <div className="picnic-basket" aria-label={thai ? "ตะกร้าปิกนิกของคุณ" : "Your picnic basket"}>
      {picnicItems(progress).map((item) => (
        <span
          key={item.label}
          className={item.ready ? "ready" : ""}
          aria-label={`${thai ? labels[item.label] : item.label}: ${item.ready ? thai ? "พร้อมแล้ว" : "ready" : thai ? "ยังต้องหา" : "still to find"}`}
        >
          <b aria-hidden>{item.icon}</b>
          <small>
            {thai ? labels[item.label] : item.label}
            {item.ready ? " ✓" : ""}
          </small>
        </span>
      ))}
    </div>
  );
}
export function PicnicAfternoon({
  content,
  gender,
  pace,
  progress,
  update,
  arrived,
  travel,
  close,
  challengePractice,
}: {
  content: AtlasContent;
  gender: Gender;
  pace: Pace;
  progress: PicnicProgress;
  update: (next: PicnicProgress) => void;
  arrived: string | null;
  travel: (scene: string) => void;
  close: () => void;
  challengePractice: () => void;
}) {
  const [screen, setScreen] = useState<
    "intro" | "talk" | "checkpoint" | "recall"
  >("intro");
  const [picked, setPicked] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [challenge, setChallenge] = useState(false);
  const [recallMiss, setRecallMiss] = useState(false);
  const [recallAnswer, setRecallAnswer] = useState<string | null>(null);
  const n = Math.min(progress.next, 5);
  const spec = PICNIC_STEPS[n];
  const place = LOCATIONS.find((l) => l.id === spec.scene)!;
  const step = content.thai[gender].find((e) => e.id === spec.scene)!.steps[
    spec.index
  ];
  const audio: AudioCtx = { lang: "th", region: place.region, pace };
  const chosen = step.choices.find((c) => c.id === picked);
  const memorySpec = PICNIC_STEPS[picnicMemory(progress)];
  const memory = content.thai[gender]
    .find((e) => e.id === memorySpec.scene)!
    .steps[memorySpec.index].choices.find((c) => c.id === "ok")!.line;
  const memoryAudio: AudioCtx = {
    lang: "th",
    region: LOCATIONS.find((l) => l.id === memorySpec.scene)!.region,
    pace,
  };
  const meanings = [
    ...new Set([
      memory.gloss,
      ...PICNIC_STEPS.map(
        (s) =>
          content.thai[gender]
            .find((e) => e.id === s.scene)!
            .steps[s.index].choices.find((c) => c.id === "ok")!.line.gloss,
      ),
    ]),
  ]
    .slice(0, 3)
    .sort();
  useEffect(() => () => stopSpeaking(), [progress.next, screen]);
  const help = () => {
    setHint(true);
    update({
      ...progress,
      supported: true,
      recallSupported: progress.recallSupported || screen === "recall",
    });
  };
  const begin = () => {
    setPicked(null);
    setHint(false);
    travel(progress.next >= 6 ? "first-hello" : spec.scene);
    setScreen(progress.next >= 6 ? "recall" : "talk");
  };
  if (progress.finished)
    return (
      <>
        <div
          className="picnic-table"
          aria-label="Picnic with Mali, lunch and two kilos of fruit"
        >
          🌳
          <br />
          🧑‍🤝‍🧑
          <br />
          🍛 🧺 🍈 🍈
        </div>
        <h2>A picnic you made happen.</h2>
        <p>
          Mali saved you a seat. You made a friend, ordered lunch and brought
          two kilos of fruit.
        </p>
        <p className="atlas-muted">
          {progress.independentRecall
            ? "You remembered the final phrase without a clue."
            : "You found the final phrase with support. That’s part of learning."}
        </p>
        <button className="atlas-primary atlas-wide" onClick={close}>
          A good place to stop 🌿
        </button>
        <button className="atlas-hint" onClick={challengePractice}>
          Another time: try these phrases with less help →
        </button>
      </>
    );
  return (
    <>
      <PicnicBasket progress={progress} />
      <AudioWarmup
        lines={[
          { text: step.npc.text, gender: place.gender, audio },
          ...step.choices.map((c) => ({ text: c.line.text, gender, audio })),
          { text: memory.text, gender, audio: memoryAudio },
        ]}
      />
      {(screen === "intro" || screen === "checkpoint") && (
        <>
          <h2>
            {progress.next === 0
              ? "An afternoon with Mali"
              : progress.next >= 6
                ? "Your picnic is ready"
                : screen === "checkpoint"
                  ? "One small mission, done."
                  : "Mali kept your place."}
          </h2>
          <p>
            {progress.next === 0
              ? "Make a friend, bring lunch and find fruit to share. Start with a hello."
              : progress.next === 2
                ? "Mali will meet you under the tree. Next, pick up lunch from the restaurant."
                : progress.next === 4
                  ? "Lunch is packed, with just a little chilli. Find two kilos of fruit to share."
                  : progress.next >= 6
                    ? "Bring your basket back to Mali for one short listening memory."
                    : "Your basket is saved. Continue from where you left off."}
          </p>
          <p className="atlas-muted">
            One short stop at a time. Leave whenever you like; your basket
            stays.
          </p>
          {progress.next >= 2 && (
            <label className="picnic-challenge">
              <input
                type="checkbox"
                checked={challenge}
                onChange={(e) => setChallenge(e.target.checked)}
              />{" "}
              Try less help: hide pronunciation
            </label>
          )}
          <button className="atlas-primary atlas-wide" onClick={begin}>
            {progress.next >= 6
              ? "Meet at the picnic →"
              : `Next: ${spec.goal} →`}
          </button>
          <button className="atlas-hint" onClick={close}>
            Save my place & take a break
          </button>
        </>
      )}
      {screen === "talk" &&
        (arrived !== spec.scene ? (
          <p role="status">Walking to {place.person}…</p>
        ) : (
          <>
            <div
              className="picnic-scene"
              aria-label={chosen?.correct ? spec.effect : spec.goal}
            >
              <span>{chosen?.correct ? spec.icon : place.icon}</span>
              <small>{chosen?.correct ? spec.effect : spec.goal}</small>
            </div>
            <p className="atlas-muted">
              {place.person} · {(progress.next % 2) + 1}/2
            </p>
            <div className="atlas-speech">
              <div className="atlas-speech-text">
                <p lang="th">{step.npc.text}</p>
                {(!challenge || hint) && step.npc.sub && (
                  <small className="atlas-pronunciation">{step.npc.sub}</small>
                )}
              </div>
              <PlayButton
                text={step.npc.text}
                gender={place.gender}
                audio={audio}
                label={`Listen to ${place.person}`}
              />
            </div>
            <p className="atlas-prompt">{step.prompt}</p>
            {progress.next === 0 && (
              <p className="picnic-coach">
                🔈 Listen first. Tap the words when you’re ready to reply.
              </p>
            )}
            {!hint && (
              <button className="atlas-hint" onClick={help}>
                Need a clue? Show meanings
              </button>
            )}
            {hint && <p className="atlas-clue">{step.npc.gloss}</p>}
            <div className="atlas-options">
              {step.choices
                .filter((c) => !chosen?.correct || c.id === picked)
                .map((c) => (
                  <div className="atlas-audio-choice" key={c.id}>
                    <button
                      disabled={!!chosen?.correct}
                      className={
                        picked === c.id
                          ? c.correct
                            ? "correct"
                            : "incorrect"
                          : ""
                      }
                      onClick={() => {
                        setPicked(c.id);
                        if (!c.correct)
                          update({
                            ...progress,
                            missed: [
                              ...new Set([...progress.missed, progress.next]),
                            ],
                          });
                      }}
                    >
                      <span lang="th">{c.line.text}</span>
                      {(!challenge || hint) && <small>{c.line.sub}</small>}
                      {hint && <small>{c.line.gloss}</small>}
                    </button>
                    <PlayButton
                      text={c.line.text}
                      gender={gender}
                      audio={audio}
                      label={`Preview reply: ${c.line.text}`}
                    />
                  </div>
                ))}
            </div>
            {chosen && (
              <LessonFeedback key={picked}>
                <p className="atlas-feedback" role="status">
                  {chosen.correct
                    ? "That worked."
                    : `${chosen.feedback ?? "That reply means something else."} ${place.person} waits while you try again.`}
                </p>
                {chosen.correct && (
                  <button
                    className="atlas-primary atlas-wide"
                    onClick={() => {
                      const next = advancePicnic(progress, progress.next);
                      update(next);
                      setPicked(null);
                      setHint(false);
                      if (next.next % 2 === 0) setScreen("checkpoint");
                    }}
                  >
                    {progress.next % 2 === 0
                      ? "Keep talking →"
                      : "Pack this memory →"}
                  </button>
                )}
              </LessonFeedback>
            )}
          </>
        ))}
      {screen === "recall" &&
        (arrived !== "first-hello" ? (
          <p role="status">Bringing your basket to Mali…</p>
        ) : (
          <>
            <div className="picnic-table" aria-hidden>
              🧑‍🤝‍🧑 🍛 🍈 🍈
            </div>
            <h2>One memory at the picnic</h2>
            <p>
              {progress.missed.length
                ? "Mali brings back a phrase you practised earlier. What does it mean?"
                : "Mali checks the picnic basket. What does this phrase mean?"}
            </p>
            <PlayButton
              text={memory.text}
              gender={gender}
              audio={memoryAudio}
              label="Listen to the picnic memory"
            />
            <div className="atlas-options">
              {meanings.map((m) => (
                <button
                  key={m}
                  disabled={recallAnswer === memory.gloss}
                  onClick={() => {
                    setRecallAnswer(m);
                    if (m !== memory.gloss) {
                      setRecallMiss(true);
                      update({ ...progress, recallSupported: true });
                    }
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            {!hint && (
              <button className="atlas-hint" onClick={help}>
                Reveal the phrase
              </button>
            )}
            {hint && (
              <p className="atlas-clue">
                {memory.text}
                <br />
                {memory.sub}
                <br />
                {memory.gloss}
              </p>
            )}
            {recallAnswer && (
              <LessonFeedback key={recallAnswer}>
                <p role="status">
                  {recallAnswer === memory.gloss
                    ? "You found it. Pull up a seat!"
                    : "Listen once more. There’s no hurry."}
                </p>
                {recallAnswer === memory.gloss && (
                  <button
                    className="atlas-primary atlas-wide"
                    onClick={() =>
                      update({
                        ...progress,
                        finished: true,
                        independentRecall:
                          !hint && !recallMiss && !progress.recallSupported,
                      })
                    }
                  >
                    Enjoy the picnic →
                  </button>
                )}
              </LessonFeedback>
            )}
          </>
        ))}
    </>
  );
}
