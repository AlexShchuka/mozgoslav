#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function flatten(obj, prefix = "") {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key).forEach((x) => out.add(x));
    else out.add(key);
  }
  return out;
}

function walk(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === "dist-electron" || name === "release") continue;
      out.push(...walk(full, exts));
    } else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

const ru = flatten(JSON.parse(readFileSync(join(root, "src/locales/ru.json"), "utf8")));
const en = flatten(JSON.parse(readFileSync(join(root, "src/locales/en.json"), "utf8")));

const onlyRu = [...ru].filter((k) => !en.has(k)).sort();
const onlyEn = [...en].filter((k) => !ru.has(k)).sort();

const codeKeys = new Set();
const keyRegex = /\bt\(\s*["'`]([^"'`]+)["'`]/g;
for (const f of walk(join(root, "src"), [".ts", ".tsx"])) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(keyRegex)) codeKeys.add(m[1]);
}

const missingInRu = [...codeKeys].filter((k) => !ru.has(k) && !k.includes("${")).sort();
const missingInEn = [...codeKeys].filter((k) => !en.has(k) && !k.includes("${")).sort();

let bad = 0;
function report(label, list) {
  if (!list.length) return;
  console.error(`\n${label} (${list.length}):`);
  for (const k of list) console.error(`  ${k}`);
  bad += list.length;
}

report("Keys only in ru.json (missing en translation)", onlyRu);
report("Keys only in en.json (missing ru translation)", onlyEn);
report("Code references a key missing from ru.json", missingInRu);
report("Code references a key missing from en.json", missingInEn);

if (bad > 0) {
  console.error(`\ntranslation parity: ${bad} issue(s)`);
  process.exit(1);
}
console.log(`translation parity: ok (${codeKeys.size} code keys, ${ru.size} ru, ${en.size} en)`);
