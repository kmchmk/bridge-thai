/** The learner's own language: it picks the UI language and the course (English speakers learn Thai and vice versa). */
export type Native = "en" | "th";
export const NATIVE_COOKIE = "bt_native";
export const isNative = (v: unknown): v is Native => v === "en" || v === "th";
/** The language being learned. */
export const targetOf = (n: Native): "th" | "en" => (n === "en" ? "th" : "en");

export const PACE_COOKIE = "bt_pace";

/** Menu language is independent of the language being learned. */
export const MENU_LANGUAGE_COOKIE = "bt_menu_language";
