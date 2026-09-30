/** What a clip sounds like beyond its text: Thai (with a region) or English (with an accent). Pure data: safe for client bundles. */
export type AudioCtx = { lang: "th"; region: string } | { lang: "en"; accent: string };

export const DEFAULT_TH: AudioCtx = { lang: "th", region: "bangkok" };

export const ctxParams = (ctx: AudioCtx): Record<string, string> => (ctx.lang === "th" ? { region: ctx.region } : { accent: ctx.accent });
export const ctxKey = (ctx: AudioCtx) => (ctx.lang === "th" ? `th:${ctx.region}` : `en:${ctx.accent}`);

const EN_TAGS: Record<string, string> = { us: "en-US", uk: "en-GB", au: "en-AU" };
/** BCP-47 tag for the browser-speech fallback. */
export const ctxBrowserLang = (ctx: AudioCtx) => (ctx.lang === "th" ? "th-TH" : (EN_TAGS[ctx.accent] ?? "en-US"));
