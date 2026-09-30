"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/** ⓘ button with a tooltip: hover/focus on desktop, tap on touch; closes on outside tap or Escape. Never overflows the screen. */
export function InfoTip({ label = "More info", children }: { label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  /** Pinned = opened by a click/tap, so hover-out (or the mouse events a tap emulates) doesn't close it. */
  const [pinned, setPinned] = useState(false);
  const [shift, setShift] = useState(0);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setPinned(false);
    };
    const away = (e: Event) => root.current && !root.current.contains(e.target as Node) && close();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  // Keep the bubble inside the viewport (8px margin) whatever the button's position.
  useLayoutEffect(() => {
    if (!open || !tip.current) return setShift(0);
    tip.current.style.transform = "translateX(0)";
    const r = tip.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    setShift(r.right > vw - 8 ? vw - 8 - r.right : r.left < 8 ? 8 - r.left : 0);
  }, [open]);

  return (
    <span
      ref={root}
      className="relative inline-flex"
      // Hover only for real mice; touch taps are handled by the click below.
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && !pinned && setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => {
          const next = !(open && pinned);
          setOpen(next);
          setPinned(next);
        }}
        // 44px tap target that doesn't push into the label text: only vertical/right margins are pulled in.
        className="-my-3 -mr-2 flex size-11 items-center justify-center rounded-full text-base text-brand-700 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-slate-800"
      >
        ⓘ
      </button>
      {open && (
        <span
          ref={tip}
          id={id}
          role="tooltip"
          style={{ transform: `translateX(${shift}px)` }}
          className="absolute left-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-xl border bg-white p-3 text-left text-sm font-normal leading-snug text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {children}
        </span>
      )}
    </span>
  );
}
