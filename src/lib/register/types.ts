export type Gender = "male" | "female";

/** Status of the *listener* relative to the speaker. `child` is internal-only (NPC talking down to a much younger learner). */
export type Relationship = "friend" | "older" | "elder" | "younger" | "child" | "stranger";
export type SetupRelationship = Exclude<Relationship, "child">;

export type Region = "bangkok" | "chiangmai";

export interface Setup {
  speakerGender: Gender;
  listenerGender: Gender;
  relationship: SetupRelationship;
  region: Region;
}

/** Thai script + romanization (with tone marks) for one word/particle. */
export interface Word {
  th: string;
  rom: string;
}

/** A templated line as authored in content JSON. */
export interface LineTemplate {
  th: string;
  rom: string;
  en: string;
}

export type RenderedLine = LineTemplate;

/** One "why this word?" note shown to the learner after they answer. */
export interface RegisterNote {
  slot: string;
  th: string;
  why: string;
}
