import "server-only";
import { cookies } from "next/headers";
import { isNative, NATIVE_COOKIE, type Native } from "./lang";
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
