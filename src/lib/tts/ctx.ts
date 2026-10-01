/** Speaking pace the learner can choose: slower (default, for learning) or natural (real-life speed). */
export type Pace = "natural" | "learner";
export const PACE_CHOICES: Pace[] = ["learner", "natural"];
export const DEFAULT_PACE: Pace = "learner";
export const isPaceChoice = (v: unknown): v is Pace => v === "natural" || v === "learner";

/** What a clip sounds like beyond its text: Thai (with a region) or English (with an accent), at a pace. Pure data: safe for client bundles. */
export type AudioCtx = { lang: "th"; region: string; pace: Pace } | { lang: "en"; accent: string; pace: Pace };

export const DEFAULT_TH: AudioCtx = { lang: "th", region: "bangkok", pace: DEFAULT_PACE };

export const ctxParams = (ctx: AudioCtx): Record<string, string> => (ctx.lang === "th" ? { region: ctx.region, pace: ctx.pace } : { accent: ctx.accent, pace: ctx.pace });
export const ctxKey = (ctx: AudioCtx) => (ctx.lang === "th" ? `th:${ctx.region}:${ctx.pace}` : `en:${ctx.accent}:${ctx.pace}`);

const EN_TAGS: Record<string, string> = { us: "en-US", uk: "en-GB", au: "en-AU" };
/** BCP-47 tag for the browser-speech fallback. */
export const ctxBrowserLang = (ctx: AudioCtx) => (ctx.lang === "th" ? "th-TH" : (EN_TAGS[ctx.accent] ?? "en-US"));
