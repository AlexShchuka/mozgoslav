#!/usr/bin/env node
/**
 * i18n parity audit for Mozgoslav.
 *
 * Verifies that ru.json and en.json share the exact same key tree. Exits non-zero
 * and prints the asymmetric diff when parity breaks — drop-in for CI gates.
 *
 * Usage:  node frontend/scripts/i18n-audit.mjs
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const localesDir = resolve(here, "..", "src", "locales");

const flatten = (obj, prefix = "", acc = new Set()) => {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, path, acc);
    } else {
      acc.add(path);
    }
  }
  return acc;
};

const load = async (name) => {
  const raw = await readFile(resolve(localesDir, name), "utf8");
  return JSON.parse(raw);
};

const ru = flatten(await load("ru.json"));
const en = flatten(await load("en.json"));

const missingInEn = [...ru].filter((k) => !en.has(k)).sort();
const missingInRu = [...en].filter((k) => !ru.has(k)).sort();

if (missingInEn.length === 0 && missingInRu.length === 0) {
  console.log(`i18n audit OK — ru=${ru.size} keys, en=${en.size} keys, parity verified.`);
  process.exit(0);
}

if (missingInEn.length > 0) {
  console.error("Missing in en.json:");
  for (const key of missingInEn) console.error(`  - ${key}`);
}
if (missingInRu.length > 0) {
  console.error("Missing in ru.json:");
  for (const key of missingInRu) console.error(`  - ${key}`);
}
process.exit(1);
