import list from "./static-clips.json";

/**
 * Clips that ship inside the app as static files (public/audio/tts/<hash>.mp3, made by scripts/build-audio.ts).
 * They are keyed by the same content hash as the runtime cache, so they only match while the voices/pace/style are
 * unchanged (change them and the clips must be rebuilt). Served by the CDN: no storage service or database involved.
 */
const held = new Set<string>(list);

export const STATIC_BASE = "/audio/";
export const staticClipFile = (hash: string) => (held.has(hash) ? `tts/${hash}.mp3` : null);
export const staticClipUrl = (hash: string) => (held.has(hash) ? `${STATIC_BASE}tts/${hash}.mp3` : null);
