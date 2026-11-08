// Generates PWA icons from an inline SVG. Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const heart =
  "M256 404 C 120 316 92 252 92 204 C 92 158 128 124 172 124 C 206 124 236 144 256 174 C 276 144 306 124 340 124 C 384 124 420 158 420 204 C 420 252 392 316 256 404 Z";

// `pad` shrinks the heart for maskable icons (safe zone = inner 80%).
const svg = (pad = 1, rounded = true) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="#e11d48"/>
  <g transform="translate(256 256) scale(${pad}) translate(-256 -256)">
    <path d="${heart}" fill="#fff"/>
    <circle cx="256" cy="232" r="22" fill="#e11d48"/>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon.svg", svg());

const out = [
  ["public/icons/icon-192.png", 192, svg()],
  ["public/icons/icon-512.png", 512, svg()],
  ["public/icons/maskable-512.png", 512, svg(0.75, false)],
  ["public/icons/apple-touch-icon.png", 180, svg(0.85, false)],
];
for (const [file, size, s] of out) {
  await sharp(Buffer.from(s)).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}
