import ruJson from "../locales/ru.json";
import enJson from "../locales/en.json";

const flattenKeys = (obj: Record<string, unknown>, prefix = ""): string[] => {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, fullKey);
    }
    return [fullKey];
  });
};

describe("TC-F14: i18n keys parity", () => {
  const ruKeys = flattenKeys(ruJson);
  const enKeys = flattenKeys(enJson);

  it("all downloads.* keys present in ru.json with non-empty values", () => {
    const downloadsRu = ruKeys.filter((k) => k.startsWith("downloads."));
    expect(downloadsRu.length).toBeGreaterThan(0);
    downloadsRu.forEach((key) => {
      const parts = key.split(".");
      let val: unknown = ruJson;
      for (const part of parts) {
        val = (val as Record<string, unknown>)[part];
      }
      expect(typeof val).toBe("string");
      expect(val).not.toBe("");
    });
  });

  it("all downloads.* keys present in en.json with non-empty values", () => {
    const downloadsEn = enKeys.filter((k) => k.startsWith("downloads."));
    expect(downloadsEn.length).toBeGreaterThan(0);
    downloadsEn.forEach((key) => {
      const parts = key.split(".");
      let val: unknown = enJson;
      for (const part of parts) {
        val = (val as Record<string, unknown>)[part];
      }
      expect(typeof val).toBe("string");
      expect(val).not.toBe("");
    });
  });

  it("all downloads.* keys in ru.json also exist in en.json", () => {
    const downloadsRu = ruKeys.filter((k) => k.startsWith("downloads."));
    const downloadsEn = new Set(enKeys.filter((k) => k.startsWith("downloads.")));
    const missing = downloadsRu.filter((k) => !downloadsEn.has(k));
    expect(missing).toEqual([]);
  });

  it("all downloads.* keys in en.json also exist in ru.json", () => {
    const downloadsEn = enKeys.filter((k) => k.startsWith("downloads."));
    const downloadsRuSet = new Set(ruKeys.filter((k) => k.startsWith("downloads.")));
    const missing = downloadsEn.filter((k) => !downloadsRuSet.has(k));
    expect(missing).toEqual([]);
  });
});

describe("TC-F15: archived component not imported", () => {
  it("ModelDownloadProgress.tsx is not imported outside .archive", () => {
    const fs = require("fs");
    const path = require("path");

    const srcDir = path.join(__dirname, "..");
    const importPattern = /ModelDownloadProgress/;
    const archivePattern = /\.archive/;

    const results: string[] = [];

    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".archive") continue;
          scanDir(fullPath);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
          !fullPath.includes(".archive")
        ) {
          const content = fs.readFileSync(fullPath, "utf-8") as string;
          if (importPattern.test(content) && !archivePattern.test(fullPath)) {
            const lines = content.split("\n");
            lines.forEach((line: string, idx: number) => {
              if (importPattern.test(line) && !line.trim().startsWith("//")) {
                results.push(`${fullPath}:${idx + 1}: ${line.trim()}`);
              }
            });
          }
        }
      }
    };

    scanDir(srcDir);

    const importLines = results.filter(
      (r) => r.includes("import") && !r.includes("store/slices") && !r.includes("api/gql")
    );

    expect(importLines).toEqual([]);
  });
});
