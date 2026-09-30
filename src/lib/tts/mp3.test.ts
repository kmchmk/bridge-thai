import { describe, expect, it } from "vitest";
import { pcmToMp3 } from "./mp3";
import { wavSeconds, pcmToWav } from "./wav";

describe("pcmToMp3", () => {
  it("compresses speech-rate PCM roughly 8x and produces a valid MPEG frame stream", () => {
    const rate = 24_000, secs = 2;
    const pcm = new Int16Array(rate * secs);
    for (let i = 0; i < pcm.length; i++) pcm[i] = Math.round(6000 * Math.sin((2 * Math.PI * 220 * i) / rate));
    const wav = pcmToWav(pcm.buffer, rate);
    const mp3 = new Uint8Array(pcmToMp3(pcm.buffer, rate));
    expect(wavSeconds(wav)).toBeCloseTo(2, 2);
    expect(mp3[0]).toBe(0xff); // MPEG frame sync
    expect(mp3[1] & 0xe0).toBe(0xe0);
    expect(wav.byteLength / mp3.byteLength).toBeGreaterThan(6);
    // 48 kbps → ~6 KB per second
    expect(mp3.byteLength).toBeGreaterThan(secs * 5000);
    expect(mp3.byteLength).toBeLessThan(secs * 8000);
  });
});
