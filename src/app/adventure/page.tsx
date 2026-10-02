import type { Metadata } from "next";
import { Adventure } from "@/components/adventure/Adventure";
import { buildAdventureContent } from "@/lib/adventure/content";
import "./adventure.css";
export const metadata: Metadata = {
  title: "Little Bangkok · Bridge Thai",
  description:
    "A tiny neighbourhood. A big adventure. Explore, make friends, and learn Thai through everyday life.",
};
export default function AdventurePage() {
  return <Adventure content={buildAdventureContent()} />;
}
