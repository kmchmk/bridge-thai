"use client";
import { useState } from "react";
import { PlayButton } from "@/components/PlayButton";
import {
  ITEMS,
  type Errand as ErrandSpec,
  type ItemId,
} from "@/lib/adventure/errands";
import type { Mission, PlaceId } from "@/lib/adventure/model";
import { BahtPayment } from "./BahtPayment";
const baseAudio = {
  lang: "th" as const,
  region: "bangkok",
  pace: "learner" as const,
};
export function Errand({
  order,
  missions,
  arrived,
  onTravel,
  onComplete,
  onClose,
  onBag,
}: {
  order: ErrandSpec;
  missions: Mission[];
  arrived: PlaceId | null;
  onTravel: (id: PlaceId) => void;
  onComplete: (independent: boolean) => void;
  onClose: () => void;
  onBag: (item: ItemId | null) => void;
}) {
  const [phase, setPhase] = useState<
      "request" | "pickup" | "pay" | "deliver" | "done"
    >("request"),
    [help, setHelp] = useState(false),
    [mistakes, setMistakes] = useState(0),
    [feedback, setFeedback] = useState("");
  const item = ITEMS.find((i) => i.id === order.item)!;
  const source = missions.find((m) => m.id === order.source)!;
  const independent = !help && mistakes === 0;
  const audio = {
    ...baseAudio,
    pace: order.challenge ? ("natural" as const) : ("learner" as const),
  };
  const pickup = (id: PlaceId) => {
    setPhase("pickup");
    setFeedback("");
    if (id !== order.source) setMistakes((m) => m + 1);
    onTravel(id);
  };
  const choose = (id: ItemId) => {
    if (id !== order.item) {
      setMistakes((m) => m + 1);
      setFeedback(
        "That’s a different item. Listen again, or reveal the request for a clue.",
      );
    } else {
      setPhase("pay");
      setFeedback("");
    }
  };
  const deliver = () => {
    setPhase("done");
    onComplete(independent);
    onBag(null);
  };
  return (
    <div
      className="game-panel errand-panel"
      role="region"
      aria-label="Neighbourhood errand"
    >
      <button
        className="panel-close"
        onClick={onClose}
        aria-label="Leave errand"
      >
        ×
      </button>
      <span className="panel-kicker">
        {order.challenge
          ? "CONFIDENT LISTENING / NATURAL PACE"
          : "A REAL FAVOUR / A LITTLE ADVENTURE"}
      </span>
      <div className="errand-stages">
        {["Listen", "Find", "Buy", "Deliver"].map((s, i) => (
          <span
            key={s}
            className={
              i <=
              ["request", "pickup", "pay", "deliver", "done"].indexOf(phase)
                ? "active"
                : ""
            }
          >
            {s}
          </span>
        ))}
      </div>
      <h2>
        {phase === "done"
          ? "A favour, remembered."
          : `${order.name} sent a request.`}
      </h2>
      {phase !== "done" && (
        <>
          <p>
            {order.item === "scarf"
              ? `${order.name} is buying a gift. Listen for the agreed price, collect the gift from the right stall, and bring it back.`
              : `Your neighbour’s hungry. Listen for the dish, find the right stall, and bring their order back.`}
          </p>
          <div className="practice-listen">
            <PlayButton
              text={order.request.text}
              gender={order.voice}
              audio={audio}
              label="Listen to the neighbour’s request"
            />
            <span>
              {order.item === "scarf"
                ? "Listen for the gift’s agreed price"
                : "Listen for what they want"}
            </span>
          </div>
          <button className="practice-hint" onClick={() => setHelp(true)}>
            {help
              ? "Clue revealed—learning with support"
              : "Reveal request & meaning"}
          </button>
          {help && (
            <div className="practice-clue">
              <p lang="th">{order.request.text}</p>
              <small>{order.request.sub}</small>
              <small>{order.request.gloss}</small>
              {order.item === "scarf" && (
                <small>The gift is a woven scarf.</small>
              )}
            </div>
          )}
        </>
      )}
      {phase === "request" && (
        <>
          <p className="errand-question">Where should you go to collect it?</p>
          <div className="errand-locations">
            {missions.map((m) => (
              <button key={m.id} onClick={() => pickup(m.id)}>
                <span>{m.id === "friend" ? "☕" : m.icon}</span>
                <strong>{m.name}</strong>
                <small>
                  {m.id === "friend"
                    ? "Café"
                    : m.id === "noodles"
                      ? "Food stall"
                      : "Market"}
                </small>
              </button>
            ))}
          </div>
        </>
      )}
      {phase === "pickup" &&
        (arrived === order.source ? (
          <>
            <div className="errand-arrived">✓ At {source.name}’s stall</div>
            <p>
              {order.item === "scarf"
                ? "Choose the gift for your neighbour."
                : "Point to the item you heard."}
            </p>
            <div className="errand-items">
              {ITEMS.map((i) => (
                <button key={i.id} onClick={() => choose(i.id)}>
                  <span>{i.icon}</span>
                  <strong lang="th">{i.name}</strong>
                  {help && <small>{i.meaning}</small>}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="errand-arrived">
              {arrived
                ? `You found ${missions.find((m) => m.id === arrived)?.name}, but this isn’t the right pickup spot.`
                : "Walking through the neighbourhood…"}
            </div>
            {arrived && (
              <div className="errand-locations">
                {missions.map((m) => (
                  <button key={m.id} onClick={() => pickup(m.id)}>
                    <strong>{m.name}</strong>
                    <small>
                      {m.id === "friend"
                        ? "Café"
                        : m.id === "noodles"
                          ? "Food stall"
                          : "Market"}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </>
        ))}
      {phase === "pay" && arrived !== order.source && (
        <>
          <p>Return to {source.name}’s stall to finish the purchase.</p>
          <button
            className="primary-game-button"
            onClick={() => onTravel(order.source)}
          >
            Back to {source.name} →
          </button>
        </>
      )}
      {phase === "pay" && arrived === order.source && (
        <>
          <div className="bag-item">
            {item.icon}
            <span>{item.meaning}</span>
          </div>
          <div className="activity-listen">
            <PlayButton
              text={order.paymentLine.text}
              gender={order.paymentVoice}
              audio={audio}
              label="Listen to the agreed price"
            />
            <span>Use the money your neighbour supplied.</span>
          </div>
          <button className="practice-hint" onClick={() => setHelp(true)}>
            Reveal price & meaning
          </button>
          {help && (
            <div className="practice-clue">
              <p lang="th">{order.paymentLine.text}</p>
              <small>{order.paymentLine.gloss}</small>
            </div>
          )}
          <BahtPayment
            price={order.price}
            funds="Customer funds ฿200 · listen for the price, then return the remaining money"
            onMistake={() => setMistakes((m) => m + 1)}
            onPaid={() => {
              setPhase("deliver");
              onBag(order.item);
              setFeedback("");
            }}
          />
        </>
      )}
      {phase === "deliver" && (
        <>
          <div className="bag-item">
            {item.icon}
            <span>In your bag · ready to deliver</span>
          </div>
          <p>Bring it back to {order.name}. Use the map or the button below.</p>
          {arrived === order.receiver ? (
            <button className="primary-game-button" onClick={deliver}>
              Hand it to {order.name} →
            </button>
          ) : (
            <button
              className="primary-game-button"
              onClick={() => onTravel(order.receiver)}
            >
              Walk to {order.name} →
            </button>
          )}
        </>
      )}
      {phase === "done" && (
        <>
          <div className="postcard-art">
            <span>{item.icon}</span>
            <small>LITTLE BANGKOK / {order.name.toUpperCase()}</small>
            <strong>
              {independent
                ? "Understood. Bought. Delivered."
                : "A little support, a real achievement."}
            </strong>
          </div>
          <p>
            {order.name} is delighted. This favour is a postcard in your
            journal. Each new favour earns coins once; another visit practises
            the language.
          </p>
          <button className="primary-game-button" onClick={onClose}>
            Take another walk →
          </button>
        </>
      )}
      {feedback && (
        <p className="activity-feedback" role="status">
          {feedback}
        </p>
      )}
    </div>
  );
}
