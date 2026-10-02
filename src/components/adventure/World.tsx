"use client";
import { useEffect, useRef, useState } from "react";
import type { PlaceId } from "@/lib/adventure/model";
import type { WorldHandle } from "./createWorld";

export default function World({
  onVisit,
  onDiscover,
  completed,
  destination,
  reducedMotion,
  decorations,
  meal,
  evening,
}: {
  onVisit: (id: PlaceId) => void;
  onDiscover: (id: string) => void;
  completed: PlaceId[];
  destination: { id: PlaceId; nonce: number } | null;
  reducedMotion: boolean;
  decorations: string[];
  meal: "noodles" | "rice";
  evening: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const game = useRef<WorldHandle | null>(null);
  const callbacks = useRef({ onVisit, onDiscover });
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    callbacks.current = { onVisit, onDiscover };
  }, [onVisit, onDiscover]);
  useEffect(() => {
    let cancelled = false;
    import("./createWorld")
      .then(({ createWorld }) => {
        if (cancelled || !root.current) return;
        game.current = createWorld(
          root.current,
          (id) => callbacks.current.onVisit(id),
          (id) => callbacks.current.onDiscover(id),
          reducedMotion,
        );
        setReady(true);
      })
      .catch(() => setError(true));
    return () => {
      cancelled = true;
      game.current?.destroy();
      game.current = null;
    };
  }, [reducedMotion]);
  useEffect(() => {
    if (ready) game.current?.setCompleted(completed);
  }, [completed, ready]);
  useEffect(() => {
    if (destination) {
      if (ready) game.current?.visit(destination.id);
      else if (error) callbacks.current.onVisit(destination.id);
    }
  }, [destination, ready, error]);
  useEffect(() => {
    if (ready) game.current?.setAppearance(decorations, meal, evening);
  }, [decorations, meal, evening, ready]);
  return (
    <div
      className="adventure-world"
      ref={root}
      role="img"
      aria-label="An isometric Bangkok neighbourhood with a café, noodle stall, market, canal and picnic garden. Use the location buttons to visit characters."
    >
      {!ready && (
        <div className="world-loading">
          {error
            ? "The map couldn’t load. You can still play using the location buttons below."
            : "Opening the neighbourhood…"}
        </div>
      )}
    </div>
  );
}
