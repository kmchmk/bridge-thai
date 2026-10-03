import { SCENES } from "@/lib/content";
import { renderLearner } from "@/lib/register/engine";
import { buildSteps } from "@/lib/game";
import type { AdventureContent, Mission } from "./model";
import type { Gender, Setup } from "@/lib/register/types";
const definitions = [
  {
    id: "friend",
    sceneId: "first-hello",
    name: "Mali",
    role: "Your new neighbour",
    title: "A friend on your doorstep",
    description:
      "Mali has invited you to tonight’s neighbourhood picnic. Say hello first—then find breakfast and a gift to bring.",
    reward: "Picnic invitation",
    icon: "✉",
    color: "#a4bda0",
    listenerGender: "female",
    relationship: "friend",
  },
  {
    id: "noodles",
    sceneId: "noodle-stall",
    name: "Arun",
    role: "The noodle-stall owner",
    title: "Breakfast, your way",
    description:
      "Follow the smell of broth. Order khao soi, ask for less spice, and thank Arun. You’ll need energy for the market.",
    reward: "A bowl of khao soi",
    icon: "🍜",
    color: "#e6ad71",
    listenerGender: "male",
    relationship: "stranger",
  },
  {
    id: "market",
    sceneId: "market-haggling",
    name: "Dao",
    role: "The market vendor",
    title: "A gift for the picnic",
    description:
      "That woven scarf would make a lovely gift. Ask the price and bargain politely with Dao.",
    reward: "A woven scarf",
    icon: "🎁",
    color: "#baa0bd",
    listenerGender: "female",
    relationship: "stranger",
  },
] as const;
function missions(gender: Gender): Mission[] {
  return definitions.map((d) => {
    const setup: Setup = {
      speakerGender: gender,
      listenerGender: d.listenerGender,
      relationship: d.relationship,
      region: "bangkok",
    };
    const steps = buildSteps(SCENES.find((s) => s.id === d.sceneId)!, setup);
    for (const step of steps) {
      for (const choice of step.choices) {
        if (choice.id === "too-stiff") {
          choice.correct = true;
          choice.feedback =
            "A polite reply is valid here too. A close friend may use the warmer casual version. Thai register depends on the people and the moment.";
        } else if (choice.id === "too-casual")
          choice.feedback =
            "That sounds very familiar. This mission practices polite Thai with someone you’ve just met. Try a polite ending.";
        else if (choice.id === "wrong-gender")
          choice.feedback =
            "That line uses the other speaking style’s pronouns or endings. Match the speaking style you selected for this practice.";
      }
    }
    // A real meal choice, using existing authored and recorded Thai content.
    if (d.id === "noodles") {
      const template = SCENES.find((s) => s.id === "restaurant")!.steps[1].you;
      const line = renderLearner(template, setup);
      steps[0].choices.push({
        id: "meal-rice",
        correct: true,
        feedback:
          "Pad kra pao it is! Arun will make your breakfast with rice instead of noodles.",
        line: { text: line.th, sub: line.rom, gloss: line.en },
      });
      steps[0].prompt =
        "Order your breakfast. Khao soi or pad kra pao—both are on the menu.";
    }
    // Add an intent mismatch, not merely a change of pronouns, to each conversation.
    steps.forEach((step, i) => {
      const other = steps[(i + 1) % steps.length].choices.find(
        (c) => c.id === "ok",
      )!;
      if (!step.choices.some((c) => c.line.text === other.line.text))
        step.choices.push({
          ...other,
          id: "other-intent",
          correct: false,
          feedback: `That means “${other.line.gloss.replace(/[.!?]+$/, "")}.” This step asks you to: ${step.prompt}`,
        });
    });
    return {
      ...d,
      setup,
      steps,
      riceNpc:
        d.id === "noodles"
          ? buildSteps(SCENES.find((s) => s.id === "restaurant")!, setup)[3].npc
          : undefined,
    };
  });
}

export const buildAdventureContent = (): AdventureContent => ({
  male: missions("male"),
  female: missions("female"),
});
