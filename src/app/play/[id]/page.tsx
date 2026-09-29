import { notFound } from "next/navigation";
import { PlayClient } from "@/components/PlayClient";
import { getScene } from "@/lib/content";
import { buildSteps } from "@/lib/game";
import { getMyProgress } from "@/lib/progress";
import { explain } from "@/lib/register/engine";
import { parseSetup, setupQuery } from "@/lib/setup";

export default async function Play({ params, searchParams }: PageProps<"/play/[id]">) {
  const scene = getScene((await params).id);
  if (!scene) notFound();
  const setup = parseSetup(await searchParams);
  const { signedIn, rows } = await getMyProgress();
  const saved = rows.find((r) => r.sceneId === scene.id);
  // Resume mid-scene; ignore stale rows that point past the end (e.g. after a scene was shortened).
  const resumable = saved && saved.currentStep > 0 && saved.currentStep < scene.steps.length;

  return (
    <PlayClient
      // Remount when the setup changes so state never leaks between setups.
      key={JSON.stringify(setup)}
      sceneId={scene.id}
      title={scene.title}
      steps={buildSteps(scene, setup)}
      setup={setup}
      notes={explain(setup)}
      signedIn={signedIn}
      initialStep={resumable ? saved.currentStep : 0}
      initialMistakes={resumable ? saved.currentMistakes : 0}
      backHref={`/scenes?${setupQuery(setup)}`}
    />
  );
}
