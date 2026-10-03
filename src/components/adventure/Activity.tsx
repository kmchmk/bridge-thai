"use client";
import { useState } from "react";
import { PlayButton } from "@/components/PlayButton";
import type { Mission } from "@/lib/adventure/model";
const audio = {
  lang: "th" as const,
  region: "bangkok",
  pace: "learner" as const,
};
export function Activity({
  mission,
  meal,
  wallet,
  replay,
  onFinish,
  onClose,
}: {
  mission: Mission;
  meal: "noodles" | "rice";
  wallet: number;
  replay: boolean;
  onFinish: () => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState(0),
    [spice, setSpice] = useState<number | null>(null),
    [paid, setPaid] = useState(0),
    [feedback, setFeedback] = useState("");
  const food = mission.id === "noodles",
    price = food ? 50 : 150;
  const order = mission.steps[1]?.choices.find((c) => c.id === "ok")!.line;
  const bill = food
    ? mission.steps[4].npc
    : mission.steps[2].choices.find((c) => c.id === "ok")!.line;
  return (
    <div
      className="game-panel activity-panel"
      role="region"
      aria-label={food ? "Prepare your breakfast" : "Pay at the market"}
    >
      <button
        className="panel-close"
        onClick={onClose}
        aria-label="Leave activity"
      >
        ×
      </button>
      <span className="panel-kicker">YOUR WORDS BECOME SOMETHING REAL</span>
      <h2>{food ? "Breakfast, made for you." : "A thoughtful purchase."}</h2>
      {food && phase === 0 ? (
        <>
          <p>You asked for less spice. Help Arun make it just right.</p>
          <div className="cooking-bowl">
            {meal === "rice" ? "🍛" : "🍜"}
            <span>{spice === null ? "" : "🌶".repeat(spice)}</span>
          </div>
          <div className="activity-listen">
            <PlayButton
              text={order.text}
              gender={mission.setup.speakerGender}
              audio={audio}
              label="Listen to your spice request"
            />
            <span>Replay what you asked for</span>
          </div>
          <div className="spice-options">
            {[0, 1, 3].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setSpice(n);
                  setFeedback(
                    n === 1
                      ? "A little chilli. That matches ‘not too spicy’."
                      : n === 0
                        ? "No chilli is a different preference. Try a little, so it’s not too spicy."
                        : "That’s a lot of heat! ไม่เผ็ดมาก asks for not too spicy.",
                  );
                }}
                className={spice === n ? "selected" : ""}
              >
                <span>{n === 0 ? "🥣" : "🌶".repeat(n)}</span>
                <small>
                  {n === 0 ? "ไม่เผ็ด" : n === 1 ? "ไม่เผ็ดมาก" : "เผ็ดมาก"}
                </small>
              </button>
            ))}
          </div>
          {feedback && (
            <p className="activity-feedback" role="status">
              {feedback}
            </p>
          )}
          {spice === 1 && (
            <button
              className="primary-game-button"
              onClick={() => {
                setPhase(1);
                setFeedback("");
              }}
            >
              Ready! Let’s pay →
            </button>
          )}
        </>
      ) : (
        <>
          <div className="purchase-art">
            {food ? (meal === "rice" ? "🍛" : "🍜") : "🧣"}
          </div>
          <p>
            {food
              ? "A warm breakfast, just how you asked for it."
              : "Your polite offer was accepted. Pay the agreed price and take the scarf."}
          </p>
          <div className="activity-listen">
            <PlayButton
              text={bill.text}
              gender={
                food
                  ? mission.setup.listenerGender
                  : mission.setup.speakerGender
              }
              audio={audio}
              label="Listen to the agreed price"
            />
            <span>Listen for the amount in baht</span>
          </div>
          <div className="payment-total">
            <span>{replay ? "Practice money" : `Wallet ฿${wallet}`}</span>
            <strong>฿{paid}</strong>
            <small>on the counter</small>
          </div>
          <div className="baht-buttons">
            {[10, 20, 50, 100].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setPaid((p) => Math.min(500, p + n));
                  setFeedback("");
                }}
              >
                <span>฿{n}</span>
                <small>
                  {n === 10
                    ? "สิบ"
                    : n === 20
                      ? "ยี่สิบ"
                      : n === 50
                        ? "ห้าสิบ"
                        : "หนึ่งร้อย"}
                </small>
              </button>
            ))}
          </div>
          <div className="payment-actions">
            <button
              onClick={() => {
                setPaid(0);
                setFeedback("");
              }}
            >
              Take money back
            </button>
            <button
              className="primary-game-button"
              onClick={() => {
                if (paid !== price)
                  setFeedback(
                    paid < price
                      ? "A little short. Listen again for the full amount."
                      : "A little too much. Take it back and count again.",
                  );
                else onFinish();
              }}
            >
              Pay & collect →
            </button>
          </div>
          {feedback && (
            <p className="activity-feedback" role="status">
              {feedback}
            </p>
          )}
        </>
      )}
    </div>
  );
}
