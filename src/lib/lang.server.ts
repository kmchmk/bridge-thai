import "server-only";
import { cookies } from "next/headers";
import { isNative, MENU_LANGUAGE_COOKIE, NATIVE_COOKIE, PACE_COOKIE, type Native } from "./lang";
import { DEFAULT_PACE, isPaceChoice, type Pace } from "./tts/ctx";
import { dictionaries } from "./i18n";

/** The learner's chosen language, or undefined before they've picked one. */
export async function getChosenNative(): Promise<Native | undefined> {
  const v = (await cookies()).get(NATIVE_COOKIE)?.value;
  return isNative(v) ? v : undefined;
}

export async function getNative(): Promise<Native> {
  return (await getChosenNative()) ?? "en";
}

export async function getT() {
  return dictionaries[await getNative()];
}

/** The learner's chosen voice speed (cookie), slower by default. */
export async function getPace(): Promise<Pace> {
  const v = (await cookies()).get(PACE_COOKIE)?.value;
  return isPaceChoice(v) ? v : DEFAULT_PACE;
}

export async function getMenuLanguage(): Promise<Native> {
  const value = (await cookies()).get(MENU_LANGUAGE_COOKIE)?.value;
  return isNative(value) ? value : getNative();
}
