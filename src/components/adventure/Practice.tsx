"use client";
import { useState } from "react";
import { PlayButton } from "@/components/PlayButton";
import { speakLine } from "@/lib/tts/speak";
import {
  matchesPhrase,
  phraseChunks,
  type PracticeCard,
  type PracticeMode,
} from "@/lib/adventure/practice";
import type { Gender } from "@/lib/register/types";
const audio = {
  lang: "th" as const,
  region: "bangkok",
  pace: "learner" as const,
};
export function Practice({
  deck,
  gender,
  onAnswer,
  onFinish,
  onClose,
}: {
  deck: PracticeCard[];
  gender: Gender;
  onAnswer: (id: string, success: boolean, mode: PracticeMode) => void;
  onFinish: (score: number) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0),
    [score, setScore] = useState(0),
    [answered, setAnswered] = useState(false),
    [correct, setCorrect] = useState(false),
    [help, setHelp] = useState(false);
  const [chosen, setChosen] = useState<number[]>([]),
    [picked, setPicked] = useState("");
  const card = deck[index];
  const line = card?.step.choices.find((c) => c.id === "ok")!.line;
  const chunks = line ? phraseChunks(line.text) : [];
  const tokens = chunks
    .map((text, i) => ({ text, i }))
    .sort(
      (a, b) =>
        ((a.i * 7 + index * 3) % chunks.length) -
          ((b.i * 7 + index * 3) % chunks.length) || b.i - a.i,
    );
  const finishAnswer = (ok: boolean) => {
    if (answered) return;
    setAnswered(true);
    setCorrect(ok);
    setScore((s) => s + (ok && !help ? 1 : 0));
    onAnswer(card.id, ok && !help, card.mode);
    speakLine(line.text, gender, audio);
  };
  const next = () => {
    if (index + 1 === deck.length) onFinish(score);
    setIndex((i) => i + 1);
    setAnswered(false);
    setCorrect(false);
    setHelp(false);
    setChosen([]);
    setPicked("");
  };
  const meanings = card
    ? [
        ...new Map(
          card.mission.steps.map((s) => {
            const c = s.choices.find((c) => c.id === "ok")!;
            return [c.line.gloss, c.line];
          }),
        ).values(),
      ]
        .sort((a, b) => a.gloss.localeCompare(b.gloss))
        .slice(0, 5)
    : [];
  if (line && !meanings.some((l) => l.gloss === line.gloss)) meanings[0] = line;
  return (
    <div
      className="game-panel practice-panel"
      role="region"
      aria-label="Neighbourhood practice"
    >
      <button
        className="panel-close"
        onClick={onClose}
        aria-label="Leave practice"
      >
        ×
      </button>
      <span className="panel-kicker">
        NEIGHBOURHOOD REQUESTS / MIXED PRACTICE
      </span>
      {card ? (
        <>
          <div className="practice-mode">
            {card.mode === "listen"
              ? "◉ Listen & understand"
              : card.mode === "respond"
                ? "↗ Keep a conversation going"
                : "✧ Build your own reply"}
            <span>
              {index + 1}/{deck.length}
            </span>
          </div>
          <h2>{card.mission.name} needs a hand.</h2>
          <p>
            {card.mode === "listen"
              ? "Hear the phrase. What does it mean?"
              : card.mode === "respond"
                ? "Listen to the question, then choose a useful reply."
                : "Put the pieces together to say this in Thai."}
          </p>
          {card.mode !== "build" ? (
            <div className="practice-listen">
              <PlayButton
                text={card.mode === "listen" ? line.text : card.step.npc.text}
                gender={
                  card.mode === "listen"
                    ? gender
                    : card.mission.setup.listenerGender
                }
                audio={audio}
                label="Listen to the request"
              />
              <span>Tap to listen · replay as often as you like</span>
            </div>
          ) : (
            <div className="quiz-prompt">
              <small>Speaking to {card.mission.name}</small>
              <strong>{line.gloss}</strong>
            </div>
          )}
          <button className="practice-hint" onClick={() => setHelp(true)}>
            {help
              ? "Support is on—practice at your pace"
              : "Need a clue? Show the words"}
          </button>
          {help && (
            <div className="practice-clue">
              <p lang="th">
                {card.mode === "respond" ? card.step.npc.text : line.text}
              </p>
              <small>
                {card.mode === "respond" ? card.step.npc.gloss : line.sub}
              </small>
            </div>
          )}
          {card.mode === "listen" ? (
            <div className="dialogue-choices">
              {meanings.map((l) => (
                <button
                  key={l.gloss}
                  disabled={answered}
                  className={
                    answered && l.gloss === line.gloss
                      ? "correct"
                      : picked === l.gloss
                        ? "incorrect"
                        : ""
                  }
                  onClick={() => {
                    setPicked(l.gloss);
                    finishAnswer(l.gloss === line.gloss);
                  }}
                >
                  <span>{l.gloss}</span>
                </button>
              ))}
            </div>
          ) : card.mode === "respond" ? (
            <div className="dialogue-choices">
              {card.step.choices.map((c) => (
                <button
                  key={c.id}
                  disabled={answered}
                  className={
                    answered && c.correct
                      ? "correct"
                      : picked === c.id
                        ? "incorrect"
                        : ""
                  }
                  onClick={() => {
                    setPicked(c.id);
                    finishAnswer(c.correct);
                  }}
                >
                  <span lang="th">{c.line.text}</span>
                  {help && <small>{c.line.sub}</small>}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div
                className="phrase-workspace"
                aria-label="Your assembled reply"
              >
                <p lang="th">
                  {chosen.map((i) => chunks[i]).join("") ||
                    "Your words go here…"}
                </p>
                <button
                  onClick={() => setChosen((c) => c.slice(0, -1))}
                  disabled={answered || chosen.length === 0}
                >
                  Undo
                </button>
              </div>
              <div className="phrase-tokens">
                {tokens.map((t) => (
                  <button
                    key={t.i}
                    disabled={answered || chosen.includes(t.i)}
                    onClick={() => setChosen((c) => [...c, t.i])}
                    lang="th"
                  >
                    {t.text.trim()}
                  </button>
                ))}
              </div>
              {!answered && (
                <button
                  className="primary-game-button"
                  disabled={chosen.length !== chunks.length}
                  onClick={() =>
                    finishAnswer(
                      matchesPhrase(
                        chosen.map((i) => chunks[i]).join(""),
                        line.text,
                      ),
                    )
                  }
                >
                  Say it →
                </button>
              )}
            </>
          )}
          {answered && (
            <>
              <div className="response-feedback" role="status">
                <strong>
                  {correct
                    ? help
                      ? "You found it with a little support."
                      : "You did that on your own!"
                    : "A phrase to come back to."}
                </strong>
                <span lang="th">{line.text}</span>
                <span>{line.gloss}</span>
                <span>
                  {!correct
                    ? "We’ll bring this phrase back sooner in your next practice."
                    : ""}
                </span>
              </div>
              <button className="primary-game-button" onClick={next}>
                {index + 1 === deck.length
                  ? "Finish your neighbourhood round"
                  : "Next request"}{" "}
                →
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <div className="picnic-art">✧</div>
          <h2>
            A little more
            <br />
            independent.
          </h2>
          <div className="final-score">
            {score}
            <small> / {deck.length} without clues</small>
          </div>
          <p>
            You practised listening, replying, and building a sentence. Missed
            phrases will return sooner next time.
          </p>
          <p>
            First independent recall of a phrase earns 2 keepsake coins. Replays
            help your memory, without farming rewards.
          </p>
          <button className="primary-game-button" onClick={onClose}>
            Back to the neighbourhood →
          </button>
        </>
      )}
    </div>
  );
}
