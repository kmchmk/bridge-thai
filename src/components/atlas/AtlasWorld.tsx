"use client";
import { useEffect, useRef, useState } from "react";
import type { DistrictId } from "@/lib/atlas/catalog";
import type { AtlasWorldHandle } from "./createAtlas";
export default function AtlasWorld({
  district,
  destination,
  completed,
  secrets,
  decorations,
  meal,
  completedPicnic,
  bag,
  onVisit,
  onSecret,
}: {
  district: DistrictId;
  destination: { id: string; nonce: number } | null;
  completed: string[];
  secrets: string[];
  decorations: string[];
  meal: string;
  completedPicnic: boolean;
  bag: string | null;
  onVisit: (id: string) => void;
  onSecret: (id: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    game = useRef<AtlasWorldHandle | null>(null),
    callbacks = useRef({ onVisit, onSecret });
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    callbacks.current = { onVisit, onSecret };
  }, [onVisit, onSecret]);
  useEffect(() => {
    let cancelled = false;
    import("./createAtlas")
      .then(({ createAtlas }) => {
        if (cancelled || !root.current) return;
        game.current = createAtlas(
          root.current,
          (id) => callbacks.current.onVisit(id),
          (id) => callbacks.current.onSecret(id),
        );
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      game.current?.destroy();
      game.current = null;
    };
  }, []);
  useEffect(() => {
    if (ready) game.current?.focus(district);
  }, [district, ready]);
  useEffect(() => {
    if (ready) game.current?.progress(completed, secrets);
  }, [ready, completed, secrets]);
  useEffect(() => {
    if (destination) {
      if (failed) callbacks.current.onVisit(destination.id);
      else if (ready) game.current?.visit(destination.id);
    } else game.current?.cancel();
  }, [destination, ready, failed]);
  useEffect(() => {
    if (ready)
      game.current?.appearance(decorations, meal, completedPicnic, bag);
  }, [ready, decorations, meal, completedPicnic, bag]);
  return (
    <div className="atlas-map-frame">
      <div
        ref={root}
        className="atlas-map"
        role="img"
        aria-label="Five connected storybook districts. Drag to explore, tap a building to talk, or use Places and Go buttons."
      />
      {!ready && (
        <p className="atlas-map-loading">
          {failed
            ? "Map unavailable. Places and Go still work."
            : "Opening your world…"}
        </p>
      )}
      <div className="atlas-map-controls">
        <button
          onClick={() => game.current?.pan(-140, 0)}
          aria-label="Pan map left"
        >
          ←
        </button>
        <button
          onClick={() => game.current?.pan(140, 0)}
          aria-label="Pan map right"
        >
          →
        </button>
        <button onClick={() => game.current?.zoom(0.15)} aria-label="Zoom in">
          ＋
        </button>
        <button onClick={() => game.current?.zoom(-0.15)} aria-label="Zoom out">
          −
        </button>
        <button
          onClick={() => game.current?.focus(district)}
          aria-label="Centre district"
        >
          ⌖
        </button>
      </div>
    </div>
  );
}
