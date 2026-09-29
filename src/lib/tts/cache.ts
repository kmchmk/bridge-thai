import { list, put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { ttsHash } from "./hash";
import type { TtsProvider } from "./provider";

export interface CachedAudio {
  hash: string;
  text: string;
  voice: string;
  provider: string;
  url: string;
}

/** Where we remember which sentence already has audio (Postgres in prod). */
export interface AudioIndex {
  get(hash: string): Promise<string | null>;
  put(row: CachedAudio): Promise<void>;
}

/** Where the audio bytes live (Vercel Blob in prod). */
export interface AudioStorage {
  find(pathname: string): Promise<string | null>;
  save(pathname: string, data: ArrayBuffer, contentType: string): Promise<string>;
}

/**
 * "Every sentence is generated once": lookup by content hash → (blob already there? adopt it) → otherwise
 * generate, upload, index. Concurrent requests for the same sentence share one generation.
 */
export function createAudioCache(index: AudioIndex, storage: AudioStorage) {
  const inflight = new Map<string, Promise<string>>();

  async function resolve(provider: TtsProvider, text: string, gender: "male" | "female") {
    const voice = provider.voiceFor(gender);
    const hash = ttsHash({ text, voice, provider: provider.name });

    const hit = await index.get(hash);
    if (hit) return hit;

    const pathname = `tts/${hash}.mp3`;
    // A previous run may have uploaded but crashed before indexing: adopt that file, don't pay again.
    const existing = await storage.find(pathname);
    if (existing) {
      await index.put({ hash, text, voice, provider: provider.name, url: existing });
      return existing;
    }

    const { audio, contentType } = await provider.synthesize(text, voice);
    const url = await storage.save(pathname, audio, contentType);
    await index.put({ hash, text, voice, provider: provider.name, url });
    return url;
  }

  return function getAudioUrl(provider: TtsProvider, text: string, gender: "male" | "female") {
    const key = `${provider.name}\u0000${provider.voiceFor(gender)}\u0000${text}`;
    let p = inflight.get(key);
    if (!p) {
      p = resolve(provider, text, gender).finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    return p;
  };
}

const postgresIndex: AudioIndex = {
  async get(hash) {
    const [row] = await getDb().select().from(schema.ttsCache).where(eq(schema.ttsCache.hash, hash)).limit(1);
    return row?.url ?? null;
  },
  async put(row) {
    await getDb().insert(schema.ttsCache).values(row).onConflictDoNothing();
  },
};

const blobStorage: AudioStorage = {
  async find(pathname) {
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    return blobs.find((b) => b.pathname === pathname)?.url ?? null;
  },
  async save(pathname, data, contentType) {
    const blob = await put(pathname, data, { access: "public", contentType, addRandomSuffix: false, allowOverwrite: true });
    return blob.url;
  },
};

export const getAudioUrl = createAudioCache(postgresIndex, blobStorage);
