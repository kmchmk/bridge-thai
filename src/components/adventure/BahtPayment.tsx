"use client";
import { useState } from "react";
export function BahtPayment({
  price,
  funds,
  onPaid,
}: {
  price: number;
  funds: string;
  onPaid: () => void;
}) {
  const [paid, setPaid] = useState(0),
    [feedback, setFeedback] = useState("");
  return (
    <>
      <div className="payment-total">
        <span>{funds}</span>
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
          onClick={() =>
            paid === price
              ? onPaid()
              : setFeedback(
                  paid < price
                    ? "A little short. Listen again for the full amount."
                    : "A little too much. Take it back and count again.",
                )
          }
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
  );
}
