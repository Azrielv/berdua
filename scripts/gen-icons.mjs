// Generates the Berdua logo + PWA icons. Run: node scripts/gen-icons.mjs
// Mark: two people (him on the left, her on the right with a hair bun)
// whose shoulders form one heart.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

export const BRAND = "#c8324a";
const INK = "#ffffff";

/** The mark on a 512×512 canvas, drawn in `fg`, with gaps cut in `bg`. */
export function mark(fg, bg) {
  return `
  <!-- heart = their two bodies -->
  <path d="M256 300 C 240 262 210 236 172 236 C 126 236 98 270 98 314
           C 98 366 150 408 256 472 C 362 408 414 366 414 314
           C 414 270 386 236 340 236 C 302 236 272 262 256 300 Z" fill="${fg}"/>
  <!-- the line where they meet -->
  <path d="M256 304 L256 468" stroke="${bg}" stroke-width="12" stroke-linecap="round"/>
  <!-- him -->
  <circle cx="198" cy="166" r="48" fill="${fg}"/>
  <!-- her: head + bun -->
  <circle cx="314" cy="166" r="48" fill="${fg}"/>
  <circle cx="352" cy="124" r="25" fill="${fg}"/>
  <!-- small gaps between heads and shoulders -->
  <path d="M150 218 Q 198 236 246 218" stroke="${bg}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M266 218 Q 314 236 362 218" stroke="${bg}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
}

// `scale` shrinks the mark for maskable icons (safe zone = inner 80%).
const icon = (scale = 0.86, rounded = true) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="${BRAND}"/>
  <g transform="translate(256 262) scale(${scale}) translate(-256 -292)">${mark(INK, BRAND)}</g>
</svg>`;

// Transparent logo for use inside the app (inherits currentColor).
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="60 50 392 440">${mark("currentColor", "var(--logo-cut, #fff)")}</svg>`;

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon.svg", icon());
writeFileSync("public/icons/logo.svg", logo);

const out = [
  ["public/icons/icon-192.png", 192, icon()],
  ["public/icons/icon-512.png", 512, icon()],
  ["public/icons/maskable-512.png", 512, icon(0.66, false)],
  ["public/icons/apple-touch-icon.png", 180, icon(0.76, false)],
  ["public/icons/badge-96.png", 96, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="60 50 392 440">${mark("#fff", "#0000")}</svg>`],
];
for (const [file, size, s] of out) {
  await sharp(Buffer.from(s)).resize(size, size, { fit: "contain", background: "#0000" }).png().toFile(file);
  console.log("wrote", file);
}
