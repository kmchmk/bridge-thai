import { notFound, redirect } from "next/navigation";
import { PlayClient } from "@/components/PlayClient";
import { getScene } from "@/lib/content";
import { buildEnSteps, enSetupQuery, explainEn, parseEnSetup } from "@/lib/english";
import { buildSteps } from "@/lib/game";
import { getNative } from "@/lib/lang.server";
import { getMyProgress } from "@/lib/progress";
import { explain } from "@/lib/register/engine";
import { parseSetup, setupQuery } from "@/lib/setup";
import { getRegionAudioModes } from "@/lib/tts/settings";

export default async function Play({ params, searchParams }: PageProps<"/play/[id]">) {
  const scene = getScene((await params).id);
  if (!scene) notFound();
  const query = await searchParams;
  const native = await getNative();
  // A scene from the other course (e.g. a stale link after switching language): back to the scene list.
  if ((scene.course === "th") !== (native === "en")) redirect("/scenes");

  const [{ signedIn, rows }, audioModes] = await Promise.all([getMyProgress(), getRegionAudioModes().catch(() => null)]);
  const saved = rows.find((r) => r.sceneId === scene.id);
  // Resume mid-scene; ignore stale rows that point past the end (e.g. after a scene was shortened).
  const resumable = saved && saved.currentStep > 0 && saved.currentStep < scene.steps.length;
  const resume = { initialStep: resumable ? saved.currentStep : 0, initialMistakes: resumable ? saved.currentMistakes : 0 };

  if (scene.course === "en") {
    const setup = parseEnSetup(query);
    return (
      <PlayClient
        key={JSON.stringify(setup)}
        sceneId={scene.id}
        title={scene.title}
        steps={buildEnSteps(scene, setup)}
        audio={{ lang: "en", accent: setup.accent }}
        speakerGender={setup.speakerGender}
        listenerGender={setup.listenerGender}
        notes={explainEn(scene, setup)}
        signedIn={signedIn}
        audioMode="central"
        backHref={`/scenes?${enSetupQuery(setup)}`}
        {...resume}
      />
    );
  }

  const setup = parseSetup(query);
  return (
    <PlayClient
      // Remount when the setup changes so state never leaks between setups.
      key={JSON.stringify(setup)}
      sceneId={scene.id}
      title={scene.title}
      steps={buildSteps(scene, setup)}
      audio={{ lang: "th", region: setup.region }}
      speakerGender={setup.speakerGender}
      listenerGender={setup.listenerGender}
      notes={explain(setup)}
      signedIn={signedIn}
      audioMode={audioModes?.[setup.region] ?? "central"}
      backHref={`/scenes?${setupQuery(setup)}`}
      {...resume}
    />
  );
}
