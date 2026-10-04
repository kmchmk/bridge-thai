"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dictionaries, type Dict } from "@/lib/i18n";
import { isNative, MENU_LANGUAGE_COOKIE, type Native } from "@/lib/lang";

const Ctx = createContext<{ language: Native; setLanguage: (value: Native) => void }>({
  language: "en", setLanguage: () => {},
});

export function LangProvider({ native, children }: { native: Native; children: React.ReactNode }) {
  const [language, setLanguage] = useState(native);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      // Migrate the game's explicit menu choice ahead of the old course cookie.
      try {
        const prefs = JSON.parse(localStorage.getItem("bt_atlas_preferences") ?? "null");
        if (isNative(prefs?.interfaceLanguage)) setLanguage(prefs.interfaceLanguage);
      } catch { /* Device storage is optional. */ }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = language;
    document.cookie = `${MENU_LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
    try {
      const prefs = JSON.parse(localStorage.getItem("bt_atlas_preferences") ?? "null");
      localStorage.setItem("bt_atlas_preferences", JSON.stringify({ ...prefs, interfaceLanguage: language }));
    } catch { /* The cookie still preserves the choice when local storage is blocked. */ }
  }, [language, ready]);
  return <Ctx.Provider value={{ language, setLanguage }}>{children}</Ctx.Provider>;
}

export const useNative = () => useContext(Ctx).language;
export const useMenuLanguage = () => useContext(Ctx);
export const useT = (): Dict => dictionaries[useNative()];
