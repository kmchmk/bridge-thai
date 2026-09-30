import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scenesFor } from "../content";
import { getRegion } from "../regions";
import type { Region } from "../register/types";

vi.mock("./settings", async () => {
  const { REGION_PACKS } = await import("../regions");
  const regions = Object.fromEntries(REGION_PACKS.map((p) => [p.id, { mode: "central", hint: p.accentHint }]));
  return { getTtsSettings: async () => ({ male: "Charon", female: "Kore", pace: "learner", regions }) };
});

describe("accent hints (regional audio)", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("TTS_MODEL", "google/gemini-3.8-flash-tts");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("central mode adds no accent; accent mode adds the region's prompt to the style", async () => {
    const { getProvider } = await import("./provider");
    const central = await getProvider({ region: "chiangmai" });
    const accent = await getProvider({ region: "chiangmai", mode: "accent" });
    const north = getRegion("chiangmai").accentHint;
    // The style ends up in provider.options; it is also folded into the cache identity (provider name).
    expect(central!.name).not.toBe(accent!.name);
    // Same request twice → same identity (cacheable); different region → different identity.
    expect((await getProvider({ region: "chiangmai", mode: "accent" }))!.name).toBe(accent!.name);
    expect((await getProvider({ region: "isan", mode: "accent" }))!.name).not.toBe(accent!.name);
    // A custom (unsaved) prompt changes the identity too.
    expect((await getProvider({ region: "chiangmai", mode: "accent", hint: north + " Slower." }))!.name).not.toBe(accent!.name);
  });

  it("sends the style to Gemini via provider.options.google-ai-studio.speech_metadata.style", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array(1024), { status: 200, headers: { "content-type": "audio/pcm" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { getProvider } = await import("./provider");
    const p = await getProvider({ region: "south", mode: "accent" });
    await p!.synthesize("หรอยจังหู้", "Kore");
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    const style: string = body.provider.options["google-ai-studio"].speech_metadata.style;
    expect(style).toContain("friendly Thai teacher"); // learner pace
    expect(style).toContain("Southern Thai"); // regional accent
    vi.unstubAllGlobals();
  });
});

describe("scene availability", () => {
  const setup = (region: Region, relationship = "friend") => ({ region, relationship });

  it("regional signature scenes only appear in their regions", () => {
    const ids = (r: Region) => scenesFor(setup(r)).map((s) => s.id);
    expect(ids("chiangmai")).toContain("songthaew");
    expect(ids("bangkok")).not.toContain("songthaew");
    expect(ids("isan")).toContain("som-tam");
    expect(ids("south")).toContain("seafood-market");
    expect(ids("phuket")).toEqual(expect.arrayContaining(["seafood-market", "island-ferry"]));
    expect(ids("east")).toContain("fruit-market");
    expect(ids("west")).toContain("floating-market");
    // every region still gets the generic scenes
    for (const r of ["bangkok", "chiangmai", "isan", "south", "phuket", "east", "west"] as Region[]) expect(ids(r)).toContain("restaurant");
  });

  it("meeting the parents needs an older person", () => {
    expect(scenesFor(setup("bangkok", "friend")).map((s) => s.id)).not.toContain("meet-parents");
    expect(scenesFor(setup("bangkok", "elder")).map((s) => s.id)).toContain("meet-parents");
  });
});
