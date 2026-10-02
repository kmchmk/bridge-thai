import type { Metadata } from "next";
import { Atlas } from "@/components/atlas/Atlas";
import { buildAtlasContent } from "@/lib/atlas/content";
import { getMyProgress } from "@/lib/progress";
import "./adventure.css";
import "./atlas.css";
export const metadata: Metadata = {
  title: "Little Bangkok & beyond · Bridge Thai",
  description:
    "Explore five districts, meet new friends, and learn through 23 Thai and English conversations.",
};
export default async function AdventurePage({
  searchParams,
}: PageProps<"/adventure">) {
  const query = await searchParams;
  const { rows } = await getMyProgress();
  return (
    <Atlas
      content={buildAtlasContent()}
      initialScene={typeof query.scene === "string" ? query.scene : undefined}
      initialPlaces={query.places === "1"}
      saved={rows
        .filter((r) => r.completions > 0)
        .map((r) => ({ sceneId: r.sceneId, bestStars: r.bestStars }))}
    />
  );
}
