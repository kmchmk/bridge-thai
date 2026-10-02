import type { Metadata } from "next";
import { Adventure } from "@/components/adventure/Adventure";
import { SCENES } from "@/lib/content";
import { buildSteps } from "@/lib/game";
import type { AdventureContent, Mission } from "@/lib/adventure/model";
import type { Gender, Setup } from "@/lib/register/types";
import "./adventure.css";

export const metadata: Metadata = { title: "Little Bangkok · Bridge Thai", description: "A tiny neighbourhood. A big adventure. Explore, make friends, and learn Thai through everyday life." };
const definitions = [
  { id: "friend", sceneId: "first-hello", name: "Mali", role: "Your new neighbour", title: "A friend on your doorstep", description: "Mali has invited you to tonight’s neighbourhood picnic. Say hello first—then find breakfast and a gift to bring.", reward: "Picnic invitation", icon: "✉", color: "#a4bda0", listenerGender: "female", relationship: "friend" },
  { id: "noodles", sceneId: "noodle-stall", name: "Arun", role: "The noodle-stall owner", title: "Breakfast, your way", description: "Follow the smell of broth. Order khao soi, ask for less spice, and thank Arun. You’ll need energy for the market.", reward: "A bowl of khao soi", icon: "🍜", color: "#e6ad71", listenerGender: "male", relationship: "stranger" },
  { id: "market", sceneId: "market-haggling", name: "Dao", role: "The market vendor", title: "A gift for the picnic", description: "That woven scarf would make a lovely gift. Ask the price and bargain politely with Dao.", reward: "A woven scarf", icon: "🎁", color: "#baa0bd", listenerGender: "female", relationship: "stranger" },
] as const;
function missions(gender: Gender): Mission[] {
  return definitions.map(d => {
    const setup: Setup = { speakerGender: gender, listenerGender: d.listenerGender, relationship: d.relationship, region: "bangkok" };
    return { ...d, setup, steps: buildSteps(SCENES.find(s => s.id === d.sceneId)!, setup) };
  });
}
export default function AdventurePage() {
  const content: AdventureContent = { male: missions("male"), female: missions("female") };
  return <Adventure content={content} />;
}
