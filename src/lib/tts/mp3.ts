import * as lame from "@breezystack/lamejs";

// The package ships as ESM with a CJS-style default; accept either shape (Next bundler, tsx, vitest).
type Encoder = new (channels: number, sampleRate: number, kbps: number) => { encodeBuffer(s: Int16Array): Uint8Array; flush(): Uint8Array };
const Mp3Encoder = ((lame as unknown as { Mp3Encoder?: Encoder }).Mp3Encoder ?? (lame as unknown as { default: { Mp3Encoder: Encoder } }).default.Mp3Encoder) as Encoder;

/**
 * Compress raw 16-bit mono PCM to MP3. Speech at 24 kHz / 48 kbps is ~6 KB per second (a WAV is 48 KB/s),
 * which is what makes downloading the whole course to the browser practical.
 */
export function pcmToMp3(pcm: ArrayBuffer, sampleRate = 24_000, kbps = 48): ArrayBuffer {
  const samples = new Int16Array(pcm.byteLength >> 1);
  new Uint8Array(samples.buffer).set(new Uint8Array(pcm, 0, samples.length * 2));
  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const chunks: Uint8Array[] = [];
  const BLOCK = 1152 * 8;
  for (let i = 0; i < samples.length; i += BLOCK) {
    const out = encoder.encodeBuffer(samples.subarray(i, i + BLOCK));
    if (out.length) chunks.push(out);
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(tail);
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const mp3 = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    mp3.set(c, at);
    at += c.length;
  }
  return mp3.buffer;
}
