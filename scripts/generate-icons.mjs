// Generates every icon from public/logo-source.jpeg (the original artwork on a white canvas).
//   npm run icons
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "public/logo-source.jpeg";
const root = process.cwd();
const out = (p) => path.join(root, p);

/** Bounding box of the blue tile: pixels that are clearly not the near-white canvas. */
async function findTile() {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      if (data[i] < 170 && data[i + 2] > 180) { // low red, high blue → the tile
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const box = await findTile();
const side = Math.min(box.width, box.height);
// Trim a hair inside the tile edge so no white anti-aliasing fringe survives the rounded mask.
const inset = 3;
const square = {
  left: box.left + Math.round((box.width - side) / 2) + inset,
  top: box.top + Math.round((box.height - side) / 2) + inset,
  width: side - inset * 2,
  height: side - inset * 2,
};
console.log("tile", box, "→ crop", square);

const RADIUS = 0.2; // matches the artwork's corner radius closely
const roundedMask = (n) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}"><rect width="${n}" height="${n}" rx="${Math.round(n * RADIUS)}" fill="#fff"/></svg>`);
const gradient = (n) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}"><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0284d8"/><stop offset="1" stop-color="#3fd3dc"/></linearGradient></defs><rect width="${n}" height="${n}" fill="url(#g)"/></svg>`);

const tile = (n) => sharp(SRC).extract(square).resize(n, n, { kernel: "lanczos3" });
/** Rounded tile with transparent corners. */
const rounded = (n) => tile(n).ensureAlpha().composite([{ input: roundedMask(n), blend: "dest-in" }]).png({ palette: true, quality: 92, effort: 10 });
/** Full-bleed square (corners filled with the tile gradient) — for iOS/Android, which apply their own mask. */
const fullBleed = async (n, scale = 1) => {
  const inner = Math.round(n * scale);
  const logo = await rounded(inner).toBuffer();
  return sharp(gradient(n)).composite([{ input: logo, left: Math.round((n - inner) / 2), top: Math.round((n - inner) / 2) }]).png({ palette: true, quality: 92, effort: 10 });
};

await fs.mkdir(out("public"), { recursive: true });
await rounded(256).toFile(out("src/app/icon.png"));            // browser tab / general icon
await (await fullBleed(180)).toFile(out("src/app/apple-icon.png")); // iOS home screen
await rounded(256).toFile(out("public/logo.png"));              // header mark
await rounded(192).toFile(out("public/icon-192.png"));          // PWA manifest
await rounded(512).toFile(out("public/icon-512.png"));
await (await fullBleed(512, 0.8)).toFile(out("public/icon-maskable-512.png")); // maskable safe zone

// favicon.ico: PNG-compressed entries at 16/32/48.
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((n) => rounded(n).toBuffer()));
const header = Buffer.alloc(6); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((n, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(n, 0); e.writeUInt8(n, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
await fs.writeFile(out("src/app/favicon.ico"), Buffer.concat([header, ...entries, ...pngs]));

// Link-preview image (1200×630) from the original artwork, centred on its own canvas.
const og = await sharp(SRC).resize(1200, 630, { fit: "cover", position: "centre" }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
await fs.writeFile(out("src/app/opengraph-image.jpg"), og);
await fs.writeFile(out("src/app/twitter-image.jpg"), og);
console.log("icons written");
