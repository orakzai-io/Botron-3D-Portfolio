// scripts/extract-nexbot.mjs
// One-off utility: decodes the base64-embedded NEXBOT glTF blob from
// js/data/nexbot-model.js into a real binary .glb file at js/data/nexbot.glb.
// Run with: node scripts/extract-nexbot.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = join(root, "js", "data", "nexbot-model.js");
const outPath = join(root, "js", "data", "nexbot.glb");

const src = readFileSync(srcPath, "utf8");
const match = src.match(/NEXBOT_GLB_B64\s*=\s*"([^"]+)"/);
if (!match) {
  console.error("FAIL: could not find NEXBOT_GLB_B64 in nexbot-model.js");
  process.exit(1);
}

const bytes = Buffer.from(match[1], "base64");

// Sanity check: a valid GLB starts with the ASCII magic "glTF" (0x67 0x6C 0x54 0x46).
const magic = bytes.subarray(0, 4).toString("ascii");
if (magic !== "glTF") {
  console.error(`FAIL: decoded bytes do not start with "glTF" magic (got: ${JSON.stringify(magic)})`);
  process.exit(1);
}

writeFileSync(outPath, bytes);
console.log(`OK: wrote ${outPath} (${(bytes.length / 1024 / 1024).toFixed(2)} MB, magic "${magic}")`);
