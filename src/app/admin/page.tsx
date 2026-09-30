import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { AdminAccents } from "@/components/AdminAccents";
import { AdminRegions } from "@/components/AdminRegions";
import { AdminVoices } from "@/components/AdminVoices";
import { getAdmin } from "@/lib/admin";
import { ACCENTS } from "@/lib/accents";
import { SCENES } from "@/lib/content";
import { REGION_PACKS } from "@/lib/regions";
import { PREVIEW_LINES } from "@/lib/tts/preview";
import { getProvider } from "@/lib/tts/provider";
import { getTtsSettings } from "@/lib/tts/settings";
import { clipCoverage } from "@/lib/tts/stats";

export const metadata: Metadata = { title: "Admin · Voices", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/admin");
  const admin = await getAdmin();
  if (!admin) notFound(); // signed in but not on the list: pretend the page doesn't exist

  const [settings, provider] = await Promise.all([getTtsSettings(), getProvider()]);
  const coverage = provider
    ? {
        th: clipCoverage(provider, "th"),
        en: Object.fromEntries(await Promise.all(ACCENTS.map(async (a) => [a.id, clipCoverage((await getProvider({ accent: a.id }))!, "en")]))),
      }
    : null;

  const regions = REGION_PACKS.map((p) => ({
    id: p.id,
    label: p.label,
    area: p.area,
    kind: p.kind,
    reviewed: p.reviewed,
    notes: p.notes,
    dialectWords: Object.keys(p.lexicon).length,
    scenes: SCENES.filter((s) => !s.regions || (s.regions as string[]).includes(p.id)).length,
    defaultHint: p.accentHint,
    sample: p.sample,
    mode: settings.regions[p.id].mode,
    hint: settings.regions[p.id].hint,
  }));

  const accents = ACCENTS.map((a) => ({
    id: a.id,
    label: a.label,
    flag: a.flag,
    hint: settings.accents[a.id].hint,
    reviewed: a.reviewed,
    defaultHint: a.accentHint,
    words: a.lexicon,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-2 lg:pt-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Voices</h1>
        <p className="text-sm text-slate-500">Signed in as {admin.email}</p>
      </div>
      <AdminVoices
        model={process.env.TTS_MODEL ?? null}
        configured={!!provider}
        settings={settings}
        coverage={coverage}
        preview={PREVIEW_LINES}
      />
      <AdminRegions regions={regions} pace={settings.pace} voices={{ male: settings.male, female: settings.female }} configured={!!provider} />
      <AdminAccents accents={accents} pace={settings.pace} voices={{ male: settings.male, female: settings.female }} configured={!!provider} />
    </div>
  );
}
