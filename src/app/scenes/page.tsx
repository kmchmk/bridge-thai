import Link from "next/link";
import { AudioNote, EnglishAudioNote } from "@/components/AudioNote";
import { AudioSync } from "@/components/AudioSync";
import { EN_SCENES, describeEnSetup, enSetupQuery, parseEnSetup } from "@/lib/english";
import { scenesFor } from "@/lib/content";
import { dictionaries } from "@/lib/i18n";
import { PaceToggle } from "@/components/PaceToggle";
import { getNative, getPace } from "@/lib/lang.server";
import { getRegionAudioModes } from "@/lib/tts/settings";
import { getMyProgress } from "@/lib/progress";
import { describeSetup, parseSetup, setupQuery } from "@/lib/setup";

export default async function Scenes({ searchParams }: PageProps<"/scenes">) {
  const params = await searchParams;
  const [native, pace] = await Promise.all([getNative(), getPace()]);
  const t = dictionaries[native];
  const [{ signedIn, rows }, audioModes] = await Promise.all([getMyProgress(), getRegionAudioModes().catch(() => null)]);
  const byScene = new Map(rows.map((r) => [r.sceneId, r]));

  // One shape for both courses: what to show as "your setup", where "change" leads, and the scene cards.
  const thSetup = parseSetup(params);
  const enSetup = parseEnSetup(params);
  const isEn = native === "th"; // Thai speakers learn English
  const query = isEn ? enSetupQuery(enSetup) : setupQuery(thSetup);
  const cards = isEn
    ? EN_SCENES.map((s) => ({ id: s.id, emoji: s.emoji, title: s.title, subtitle: s.titleEn, blurb: s.blurb, steps: s.steps.length }))
    : scenesFor(thSetup).map((s) => ({ id: s.id, emoji: s.emoji, title: s.title, subtitle: undefined, blurb: s.blurb, steps: s.steps.length }));

  return (
    <div className="space-y-6 pt-2 lg:pt-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{t.scenesTitle}</h1>
        <p className="mt-1 text-base text-slate-600 sm:text-lg dark:text-slate-300">{t.scenesHelp}</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-sm text-slate-500">{t.yourSetup}</p>
          <p className="text-lg font-semibold sm:text-xl">{isEn ? describeEnSetup(enSetup) : describeSetup(thSetup)}</p>
          {isEn ? (
            <EnglishAudioNote accent={enSetup.accent} className="mt-1" />
          ) : (
            <AudioNote region={thSetup.region} mode={audioModes?.[thSetup.region] ?? "central"} className="mt-1" />
          )}
        </div>
        <Link href={`/?${query}`} className="inline-flex min-h-11 items-center text-sm text-brand-700 dark:text-brand-300 underline">
          {t.changeSetup}
        </Link>
      </div>

      <PaceToggle pace={pace} />
      <AudioSync query={`course=${isEn ? "en" : "th"}&${query}&pace=${pace}`} audio={isEn ? { lang: "en", accent: enSetup.accent, pace } : { lang: "th", region: thSetup.region, pace }} status />

      {!signedIn && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">{t.signInBanner}</p>}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((s, idx) => {
          const p = byScene.get(s.id);
          const inProgress = !!p && p.currentStep > 0;
          return (
            <li key={s.id}>
              <Link
                href={`/play/${s.id}?${query}`}
                className="flex h-full min-h-28 flex-col gap-3 rounded-2xl border bg-white p-4 transition hover:border-brand-400 sm:p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="text-4xl">{s.emoji}</span>
                  {p && p.bestStars > 0 && <span aria-label={t.stars(p.bestStars)}>{"⭐".repeat(p.bestStars)}</span>}
                </span>
                <span>
                  <span className="block text-lg font-semibold">{s.title}</span>
                  {s.subtitle && <span lang="en" className="block text-sm font-medium text-brand-700 dark:text-brand-300">{s.subtitle}</span>}
                  <span className="block text-sm text-slate-600 dark:text-slate-300">{s.blurb}</span>
                </span>
                <span className="mt-auto flex flex-wrap gap-2 text-xs">
                  {idx === 0 && rows.every((r) => r.bestStars === 0 && r.currentStep === 0) && (
                    <span className="rounded bg-brand-600 px-2.5 py-1 text-sm font-semibold text-white">{t.startHere}</span>
                  )}
                  {inProgress && (
                    <span className="rounded bg-brand-100 dark:bg-brand-900 px-2 py-0.5 font-medium text-brand-800 dark:text-brand-100">
                      {t.continueStep(p.currentStep + 1, s.steps)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
