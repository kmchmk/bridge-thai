/** Wrap raw little-endian 16-bit mono PCM in a WAV container so browsers (incl. iOS Safari) can play it. */
export function pcmToWav(pcm: ArrayBuffer, sampleRate = 24_000, channels = 1): ArrayBuffer {
  const bytesPerSample = 2;
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const ascii = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  ascii(0, "RIFF");
  v.setUint32(4, 36 + pcm.byteLength, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  v.setUint32(16, 16, true); // PCM chunk size
  v.setUint16(20, 1, true); // format = PCM
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels * bytesPerSample, true); // byte rate
  v.setUint16(32, channels * bytesPerSample, true); // block align
  v.setUint16(34, bytesPerSample * 8, true);
  ascii(36, "data");
  v.setUint32(40, pcm.byteLength, true);
  const out = new Uint8Array(44 + pcm.byteLength);
  out.set(new Uint8Array(header), 0);
  out.set(new Uint8Array(pcm), 44);
  return out.buffer;
}

export const wavSeconds = (wav: ArrayBuffer) => {
  const v = new DataView(wav);
  return v.getUint32(40, true) / v.getUint32(28, true);
};
