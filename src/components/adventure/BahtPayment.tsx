"use client";
import { useState } from "react";
export function BahtPayment({
  price,
  funds,
  onPaid,
  onMistake,
  budget = 200,
}: {
  price: number;
  funds: string;
  onPaid: () => void;
  onMistake: () => void;
  budget?: number;
}) {
  const [paid, setPaid] = useState(0),
    [feedback, setFeedback] = useState(""),
    [returningChange, setReturningChange] = useState(false);
  return (
    <>
      <div className="payment-total">
        <span>
          {returningChange
            ? `Purchase paid · ฿${price}. Count the remaining customer money.`
            : funds}
        </span>
        <strong>฿{paid}</strong>
        <small>
          {returningChange ? "to return to your neighbour" : "on the counter"}
        </small>
      </div>
      <div className="baht-buttons">
        {[10, 20, 50, 100].map((n) => (
          <button
            key={n}
            onClick={() => {
              setPaid((p) => Math.min(budget, p + n));
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
            const target = returningChange ? budget - price : price;
            if (paid === target) {
              if (returningChange) onPaid();
              else {
                setReturningChange(true);
                setPaid(0);
                setFeedback("");
              }
            } else {
              onMistake();
              setFeedback(
                paid < target
                  ? "A little short. Listen again and count the full amount."
                  : "A little too much. Take it back and count again.",
              );
            }
          }}
        >
          {returningChange ? "Return change & collect →" : "Pay & collect →"}
        </button>
      </div>
      {feedback && (
        <p className="activity-feedback" role="status">
          {feedback}
        </p>
      )}
    </>
  );
}
