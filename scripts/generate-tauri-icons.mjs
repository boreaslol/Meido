import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync } from "node:zlib";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../src-tauri/icons");

const BG = [0x3f, 0x5b, 0x73, 0xff];
const FG = [0xf7, 0xf1, 0xe8, 0xff];

function sdRoundBox(x, y, hx, hy, r) {
  const ax = Math.abs(x) - hx + r;
  const ay = Math.abs(y) - hy + r;
  return Math.hypot(Math.max(ax, 0), Math.max(ay, 0)) + Math.min(Math.max(ax, ay), 0) - r;
}

function sdCircle(x, y, r) {
  return Math.hypot(x, y) - r;
}

function sdCapsule(px, py, ax, ay, bx, by, r) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
}

function mix(a, b, t) {
  const u = Math.min(1, Math.max(0, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
    Math.round(a[3] + (b[3] - a[3]) * u),
  ];
}

function sample(nx, ny) {
  const plate = sdRoundBox(nx, ny, 0.46, 0.46, 0.2);
  const ring = Math.abs(sdCircle(nx + 0.04, ny + 0.04, 0.2)) - 0.055;
  const handle = sdCapsule(nx, ny, 0.14, 0.14, 0.32, 0.32, 0.055);
  const mark = Math.min(ring, handle);

  let color = [0, 0, 0, 0];
  const plateCover = Math.min(1, Math.max(0, 0.5 - plate * 24));
  color = mix(color, BG, plateCover);
  const markCover = Math.min(1, Math.max(0, 0.5 - mark * 28)) * plateCover;
  color = mix(color, FG, markCover);
  return color;
}

function raster(size) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let oy = 0; oy < 2; oy++) {
        for (let ox = 0; ox < 2; ox++) {
          const nx = (x + (ox + 0.5) / 2) / size - 0.5;
          const ny = (y + (oy + 0.5) / 2) / size - 0.5;
          const c = sample(nx, ny);
          r += c[0];
          g += c[1];
          b += c[2];
          a += c[3];
        }
      }
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r / 4);
      rgba[i + 1] = Math.round(g / 4);
      rgba[i + 2] = Math.round(b / 4);
      rgba[i + 3] = Math.round(a / 4);
    }
  }
  return rgba;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const tag = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, data])) >>> 0);
  return Buffer.concat([len, tag, data, crc]);
}

function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = [];
  const payloads = [];
  let offset = 6 + 16 * count;
  for (const { size, png } of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    payloads.push(png);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...payloads]);
}

function encodeIcns(images) {
  const parts = [];
  for (const { type, png } of images) {
    const header = Buffer.alloc(8);
    header.write(type, 0, 4, "ascii");
    header.writeUInt32BE(8 + png.length, 4);
    parts.push(header, png);
  }
  const body = Buffer.concat(parts);
  const file = Buffer.alloc(8 + body.length);
  file.write("icns", 0, 4, "ascii");
  file.writeUInt32BE(file.length, 4);
  body.copy(file, 8);
  return file;
}

const sizes = [32, 64, 128, 256, 512, 1024];
const pngBySize = Object.fromEntries(
  sizes.map((size) => [size, encodePng(size, raster(size))]),
);

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "32x32.png"), pngBySize[32]);
await writeFile(join(outDir, "128x128.png"), pngBySize[128]);
await writeFile(join(outDir, "128x128@2x.png"), pngBySize[256]);
await writeFile(join(outDir, "icon.png"), pngBySize[512]);
await writeFile(
  join(outDir, "icon.ico"),
  encodeIco([
    { size: 32, png: pngBySize[32] },
    { size: 128, png: pngBySize[128] },
    { size: 256, png: pngBySize[256] },
  ]),
);
await writeFile(
  join(outDir, "icon.icns"),
  encodeIcns([
    { type: "ic11", png: pngBySize[32] },
    { type: "ic12", png: pngBySize[64] },
    { type: "ic07", png: pngBySize[128] },
    { type: "ic08", png: pngBySize[256] },
    { type: "ic09", png: pngBySize[512] },
    { type: "ic10", png: pngBySize[1024] },
    { type: "ic13", png: pngBySize[256] },
    { type: "ic14", png: pngBySize[512] },
  ]),
);

console.log("wrote icons to", outDir);
