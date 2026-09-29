import { notFound } from "next/navigation";
import { PlayClient } from "@/components/PlayClient";
import { getScene } from "@/lib/content";
import { buildSteps } from "@/lib/game";
import { explain } from "@/lib/register/engine";
import { parseSetup } from "@/lib/setup";

export default async function Play({ params, searchParams }: PageProps<"/play/[id]">) {
  const scene = getScene((await params).id);
  if (!scene) notFound();
  const setup = parseSetup(await searchParams);
  return (
    <PlayClient
      // Remount when the setup changes so state never leaks between setups.
      key={JSON.stringify(setup)}
      sceneId={scene.id}
      title={scene.title}
      steps={buildSteps(scene, setup)}
      setup={setup}
      notes={explain(setup)}
    />
  );
}
