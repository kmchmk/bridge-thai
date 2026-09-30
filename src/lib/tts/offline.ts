"use client";

/**
 * Offline audio: the browser keeps the course's clips in IndexedDB so a tap plays instantly, with no network.
 *
 *  - `clips`  store: url → Blob            (content-addressed: the URL contains the hash of text+voice+style)
 *  - `index`  store: lineKey → url         (which clip speaks which line, for this language/accent/region)
 *
 * Playing must start synchronously inside the tap (iOS), so IndexedDB is read ahead of time (`hydrate`) into
 * an in-memory map of object URLs that `speakLine` can consult without awaiting anything.
 */

const DB = "bt-audio";
const CLIPS = "clips";
const INDEX = "index";

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(CLIPS);
      req.result.createObjectStore(INDEX);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  // A failed open (private mode, blocked) must not poison later attempts within this page.
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

const wrap = <T,>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

/** Ready-to-play object URLs, by line key. */
const ready = new Map<string, string>();
export const offlineUrl = (key: string) => ready.get(key);

/** Load the clips for these line keys from IndexedDB into memory (fire and forget; safe to call repeatedly). */
export async function hydrate(keys: string[]): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([INDEX, CLIPS], "readonly");
    const index = tx.objectStore(INDEX), clips = tx.objectStore(CLIPS);
    await Promise.all(
      keys.filter((k) => !ready.has(k)).map(async (k) => {
        const url = await wrap<string | undefined>(index.get(k));
        if (!url) return;
        const blob = await wrap<Blob | undefined>(clips.get(url));
        if (blob && !ready.has(k)) ready.set(k, URL.createObjectURL(blob));
      }),
    );
  } catch {
    // No IndexedDB: everything still plays from the network.
  }
}

export type SyncState = { phase: "idle" | "checking" | "now" | "rest" | "done" | "off"; done: number; total: number };
type Listener = () => void;
let state: SyncState = { phase: "idle", done: 0, total: 0 };
const listeners = new Set<Listener>();
const setState = (s: SyncState) => { state = s; listeners.forEach((f) => f()); };
export const subscribeSync = (f: Listener) => { listeners.add(f); return () => void listeners.delete(f); };
export const getSync = () => state;

type Item = [string, "m" | "f", string];
interface Manifest { base: string; now: Item[]; rest: Item[] }

const running = new Map<string, Promise<void>>();

/** Slow/metered connections only get the current setup's clips, not the whole course library. */
function bulkAllowed() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string; type?: string } }).connection;
  if (c?.saveData) return false;
  if (c?.type === "cellular") return false;
  return !c?.effectiveType || c.effectiveType === "4g";
}

/**
 * Download this setup's clips first, then (if the connection allows) the rest of the course.
 * `keyOf(text, gender)` must produce the same line keys the player uses.
 */
export function syncAudio(manifestQuery: string, keyOf: (text: string, gender: "male" | "female") => string): Promise<void> {
  let job = running.get(manifestQuery);
  if (!job) {
    job = run(manifestQuery, keyOf).catch(() => setState({ phase: "off", done: 0, total: 0 })).finally(() => running.delete(manifestQuery));
    running.set(manifestQuery, job);
  }
  return job;
}

async function run(query: string, keyOf: (text: string, gender: "male" | "female") => string) {
  if (typeof indexedDB === "undefined") return setState({ phase: "off", done: 0, total: 0 });
  setState({ phase: "checking", done: 0, total: 0 });
  const res = await fetch(`/api/tts/manifest?${query}`);
  if (!res.ok) throw new Error("manifest");
  const m = (await res.json()) as Manifest;
  const db = await openDb();
  navigator.storage?.persist?.().catch(() => undefined); // ask the browser not to evict our clips

  const have = new Set(await wrap<IDBValidKey[]>(db.transaction(CLIPS, "readonly").objectStore(CLIPS).getAllKeys()) as string[]);
  const link = async (items: Item[]) => {
    const tx = db.transaction(INDEX, "readwrite");
    for (const [text, g, file] of items) tx.objectStore(INDEX).put(m.base + file, keyOf(text, g === "m" ? "male" : "female"));
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  };
  const download = async (items: Item[], phase: "now" | "rest") => {
    const todo = [...new Map(items.filter(([, , f]) => !have.has(m.base + f)).map((i) => [i[2], i])).values()];
    let done = 0;
    setState({ phase, done, total: todo.length });
    let next = 0;
    const worker = async () => {
      while (next < todo.length) {
        const [, , file] = todo[next++];
        try {
          const r = await fetch(m.base + file);
          if (!r.ok) continue;
          const blob = await r.blob();
          const tx = db.transaction(CLIPS, "readwrite");
          tx.objectStore(CLIPS).put(blob, m.base + file);
          await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
          have.add(m.base + file);
        } catch {
          // Skip this clip; it will be retried on the next visit and plays from the network meanwhile.
        }
        setState({ phase, done: ++done, total: todo.length });
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    await link(items);
    if (phase === "now") await hydrate(items.map(([t, g]) => keyOf(t, g === "m" ? "male" : "female")));
  };

  await download(m.now, "now");
  if (m.rest.length && bulkAllowed()) {
    const est = await navigator.storage?.estimate?.().catch(() => undefined);
    const needed = m.rest.length * 18_000; // ~18 KB per clip, generous
    if (!est?.quota || est.quota - (est.usage ?? 0) > needed * 2) await download(m.rest, "rest");
  }
  setState({ phase: "done", done: 0, total: 0 });
}
