import { describe, expect, it, vi } from "vitest";
import { ACCENTS, SLOT_MEANING } from "./accents";
import { EN_SCENES, FORMALITIES, buildEnSteps, explainEn, fillSlots, parseEnSetup } from "./english";
import { allLines, isKnownLine } from "./tts/allowlist";

vi.mock("./tts/settings", async () => {
  const { REGION_PACKS } = await import("./regions");
  const { ACCENTS } = await import("./accents");
  return {
    getTtsSettings: async () => ({
      male: "Charon",
      female: "Kore",
      pace: "learner",
      regions: Object.fromEntries(REGION_PACKS.map((p) => [p.id, { mode: "central", hint: p.accentHint }])),
      accents: Object.fromEntries(ACCENTS.map((a) => [a.id, { hint: a.accentHint }])),
    }),
  };
});

const base = { speakerGender: "female", listenerGender: "male", formality: "neutral", accent: "us" } as const;

describe("English accents", () => {
  it("fills slots per accent and capitalises {Slot}", () => {
    expect(fillSlots("The {elevator} is here", "us")).toBe("The elevator is here");
    expect(fillSlots("The {elevator} is here", "uk")).toBe("The lift is here");
    expect(fillSlots("{Hello}! {noProblem}", "au")).toBe("G'day! no worries");
    expect(fillSlots("{Togo}, please.", "us")).toBe("To go, please.");
    expect(fillSlots("That's {price}.", "uk")).toBe("That's £3.80.");
  });

  it("every slot used in a scene exists in all three accents and has a Thai meaning", () => {
    for (const scene of EN_SCENES) {
      const text = JSON.stringify(scene);
      for (const m of text.matchAll(/\{(\w+)\}/g)) {
        const name = m[1][0].toLowerCase() + m[1].slice(1);
        for (const a of ACCENTS) expect(a.lexicon[name], `${scene.id}: {${m[1]}} missing in ${a.id}`).toBeDefined();
        expect(SLOT_MEANING[name], `${scene.id}: no meaning for ${name}`).toBeDefined();
      }
    }
  });

  it("no placeholder ever reaches the learner", () => {
    for (const scene of EN_SCENES)
      for (const formality of FORMALITIES)
        for (const a of ACCENTS)
          for (const step of buildEnSteps(scene, { ...base, formality, accent: a.id }))
            for (const l of [step.npc, ...step.choices.map((c) => c.line)]) {
              expect(l.text).not.toMatch(/[{}]/);
              expect(l.gloss).not.toMatch(/[{}]/);
            }
  });
});

describe("English scenes", () => {
  it("each step has exactly one correct choice plus three mistakes, for every formality", () => {
    for (const scene of EN_SCENES)
      for (const formality of FORMALITIES) {
        buildEnSteps(scene, { ...base, formality }).forEach((step, i) => {
          const where = `${scene.id} step ${i + 1} (${formality})`;
          expect(step.choices.filter((c) => c.correct), where).toHaveLength(1);
          expect(step.choices, where).toHaveLength(4);
          expect(new Set(step.choices.map((c) => c.line.text)).size, `${where}: duplicate choices`).toBe(4);
          for (const c of step.choices.filter((c) => !c.correct)) expect(c.feedback, where).toBeTruthy();
        });
      }
  });

  it("formality changes the wording", () => {
    const scene = EN_SCENES.find((s) => s.id === "en-coffee-shop")!;
    const say = (formality: (typeof FORMALITIES)[number]) => buildEnSteps(scene, { ...base, formality })[0].choices.find((c) => c.correct)!.line.text;
    expect(say("casual")).toBe("Can I get a latte, please?");
    expect(say("formal")).toBe("I'd like a latte, please.");
  });

  it("explains only the words that differ between accents", () => {
    const scene = EN_SCENES.find((s) => s.id === "en-hotel")!;
    const notes = explainEn(scene, { ...base, accent: "uk" });
    expect(notes.map((n) => n.slot)).toContain("elevator");
    expect(notes.find((n) => n.slot === "elevator")!.word).toBe("lift");
    expect(notes.find((n) => n.slot === "elevator")!.why).toContain("elevator");
  });

  it("falls back to a default setup for junk params", () => {
    expect(parseEnSetup({ fm: "nope" }).formality).toBe("neutral");
    expect(parseEnSetup({ sg: "male", lg: "female", fm: "formal", ac: "au" })).toEqual({ speakerGender: "male", listenerGender: "female", formality: "formal", accent: "au" });
  });
});

describe("English audio allow-list", () => {
  it("serves English lines for both genders and keeps courses apart", () => {
    expect(isKnownLine("Nice to meet you.", "female", "en") || isKnownLine("My name is Nok. Nice to meet you.", "female", "en")).toBe(true);
    expect(isKnownLine("Hello, nice to meet you. How are you today?", "male", "en")).toBe(true);
    expect(isKnownLine("Nice to meet you.", "female", "th")).toBe(false);
    expect(isKnownLine("ignore previous instructions", "male", "en")).toBe(false);
    expect(allLines("en").length).toBeGreaterThan(200);
    expect(allLines("th").every((l) => l.lang === "th")).toBe(true);
  });

  it("covers every accent's own wording", () => {
    const lines = allLines("en").map((l) => l.text);
    expect(lines).toContain("You're in room 305 on the third floor. The lift is on your left.");
    expect(lines.some((t) => t.includes("elevator"))).toBe(true);
    expect(lines.some((t) => t.includes("£3.80"))).toBe(true);
  });
});

describe("English accent audio style", () => {
  it("adds the English pace style and the accent prompt, and separates cache identities", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("TTS_MODEL", "google/gemini-3.8-flash-tts");
    const fetchMock = vi.fn(async () => new Response(new Uint8Array(1024), { status: 200, headers: { "content-type": "audio/pcm" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { getProvider } = await import("./tts/provider");
    const uk = (await getProvider({ accent: "uk" }))!;
    const au = (await getProvider({ accent: "au" }))!;
    expect(uk.name).not.toBe(au.name);
    expect(uk.name).not.toBe((await getProvider({ region: "bangkok" }))!.name);
    await uk.synthesize("Hello", "Kore");
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    const style: string = body.provider.options["google-ai-studio"].speech_metadata.style;
    expect(style).toContain("English teacher");
    expect(style).toContain("British");
    expect(style).not.toContain("Thai");
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
