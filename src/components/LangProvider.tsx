"use client";

import { createContext, useContext } from "react";
import { dictionaries, type Dict } from "@/lib/i18n";
import type { Native } from "@/lib/lang";

const Ctx = createContext<Native>("en");

/** Hands the learner's language to client components; only the code (not the dictionary) crosses the boundary. */
export function LangProvider({ native, children }: { native: Native; children: React.ReactNode }) {
  return <Ctx.Provider value={native}>{children}</Ctx.Provider>;
}

export const useNative = () => useContext(Ctx);
export const useT = (): Dict => dictionaries[useContext(Ctx)];
