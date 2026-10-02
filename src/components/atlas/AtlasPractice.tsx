"use client";
import { useState } from "react";
import { PlayButton } from "@/components/PlayButton";
import { seeded, type StepView } from "@/lib/game";
import {
  matchesPhrase,
  phraseChunks,
  type PracticeMode,
} from "@/lib/adventure/practice";
import type { AudioCtx } from "@/lib/tts/ctx";
import type { Gender } from "@/lib/register/types";
export interface RecallCard {
  id: string;
  step: StepView;
  person: string;
  audio: AudioCtx;
  gender: Gender;
  npcGender: Gender;
  meanings: string[];
}
export function AtlasPractice({
  deck,
  onAnswer,
  onClose,
}: {
  deck: RecallCard[];
  onAnswer: (id: string, success: boolean, mode: PracticeMode) => void;
  onClose: () => void;
}) {
  const [round, setRound] = useState(0),
    [score, setScore] = useState(0),
    [hint, setHint] = useState(false),
    [attempted, setAttempted] = useState(false),
    [feedback, setFeedback] = useState(""),
    [settled, setSettled] = useState(false),
    [chosen, setChosen] = useState<string[]>([]),
    [used, setUsed] = useState<number[]>([]);
  const card = deck[round],
    mode = (["listen", "respond", "build"] as const)[round % 3];
  if (!card)
    return (
      <>
        <div className="atlas-reward">🌿</div>
        <h2>
          {score}/{deck.length} recalled independently.
        </h2>
        <p className="atlas-muted">
          Missed phrases come first next time. Clues always help you learn; they
          don’t count as independent recall.
        </p>
        <button className="atlas-primary atlas-wide" onClick={onClose}>
          Back to your world →
        </button>
      </>
    );
  const correct = card.step.choices.find((c) => c.id === "ok")!.line;
  const rand = seeded(`${card.id}:${round}`);
  const shuffled = <T,>(items: T[]) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const meanings = shuffled(
    [
      ...new Set([
        correct.gloss,
        ...card.meanings.filter((m) => m !== correct.gloss),
      ]),
    ].slice(0, 3),
  );
  const chunks = shuffled(
    phraseChunks(correct.text).map((text, id) => ({ text, id })),
  );
  const answer = (success: boolean) => {
    if (!success) {
      setAttempted(true);
      setFeedback("A little adjustment. Listen again or use a clue.");
      onAnswer(card.id, false, mode);
      return;
    }
    const independent = !hint && !attempted;
    setSettled(true);
    if (independent) setScore((s) => s + 1);
    onAnswer(card.id, independent, mode);
    setFeedback(
      independent
        ? "You recalled it independently!"
        : "You found it. A little support is part of learning.",
    );
  };
  const advance = () => {
    setRound((r) => r + 1);
    setHint(false);
    setAttempted(false);
    setFeedback("");
    setSettled(false);
    setChosen([]);
    setUsed([]);
  };
  return (
    <>
      <span className="atlas-practice-progress">
        {round + 1}/{deck.length} ·{" "}
        {mode === "listen"
          ? "Listen"
          : mode === "respond"
            ? "Reply"
            : "Build a phrase"}
      </span>
      <h2>
        {mode === "listen"
          ? "What did you hear?"
          : mode === "respond"
            ? `Reply to ${card.person}.`
            : "Put the words together."}
      </h2>
      {mode === "build" ? (
        <p className="atlas-build-goal">{correct.gloss}</p>
      ) : (
        <div className="atlas-memory">
          <PlayButton
            text={mode === "listen" ? correct.text : card.step.npc.text}
            gender={mode === "listen" ? card.gender : card.npcGender}
            audio={card.audio}
            label={
              mode === "listen"
                ? "Listen to the practice phrase"
                : "Listen to the person"
            }
          />
          <span className="atlas-muted">Replay as often as you like.</span>
        </div>
      )}
      {hint && (
        <div className="atlas-clue">
          <p>{correct.text}</p>
          <p>{correct.sub}</p>
          <p>{correct.gloss}</p>
        </div>
      )}
      {mode === "listen" && (
        <div className="atlas-options">
          {meanings.map((m) => (
            <button
              key={m}
              disabled={settled}
              onClick={() => answer(m === correct.gloss)}
            >
              {m}
            </button>
          ))}
        </div>
      )}
      {mode === "respond" && (
        <>
          <p className="atlas-prompt">{card.step.prompt}</p>
          <div className="atlas-options">
            {card.step.choices.map((c) => (
              <button
                key={c.id}
                disabled={settled}
                onClick={() => answer(c.correct)}
              >
                {c.line.text}
                {hint && (
                  <small>
                    {c.line.sub} · {c.line.gloss}
                  </small>
                )}
              </button>
            ))}
          </div>
        </>
      )}
      {mode === "build" && (
        <>
          <div className="atlas-built" aria-label="Your assembled phrase">
            {chosen.join("") || "Your phrase will appear here…"}
          </div>
          <div className="atlas-tokens">
            {chunks.map((c) => (
              <button
                key={c.id}
                disabled={settled || used.includes(c.id)}
                onClick={() => {
                  setChosen((s) => [...s, c.text]);
                  setUsed((s) => [...s, c.id]);
                }}
              >
                {c.text}
              </button>
            ))}
          </div>
          <div className="atlas-build-actions">
            <button
              className="atlas-hint"
              disabled={settled}
              onClick={() => {
                setChosen([]);
                setUsed([]);
              }}
            >
              Start again
            </button>
            <button
              className="atlas-primary"
              disabled={settled || used.length === 0}
              onClick={() =>
                answer(matchesPhrase(chosen.join(""), correct.text))
              }
            >
              Check phrase
            </button>
          </div>
        </>
      )}
      {!settled && (
        <button className="atlas-hint" onClick={() => setHint(true)}>
          Need a clue? Reveal the phrase
        </button>
      )}
      {feedback && (
        <p className="atlas-feedback" role="status">
          {feedback}
        </p>
      )}
      {settled && (
        <button className="atlas-primary atlas-wide" onClick={advance}>
          {round + 1 === deck.length ? "See your memories →" : "Next memory →"}
        </button>
      )}
    </>
  );
}
