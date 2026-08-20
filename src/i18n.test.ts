import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { t } from "./i18n";

const srcRoot = path.dirname(fileURLToPath(import.meta.url));
const staticKeyPattern = /\bt\(\s*["']([^"'`]+)["']/g;

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === "locales" || entry === "test") return [];
      return collectSourceFiles(fullPath);
    }

    if (!/\.(ts|tsx)$/.test(entry)) return [];
    if (entry === "i18n.test.ts") return [];

    return [fullPath];
  });
}

function staticTranslationKeys() {
  const keys = new Set<string>();

  collectSourceFiles(srcRoot).forEach((filePath) => {
    const source = readFileSync(filePath, "utf8");
    for (const match of source.matchAll(staticKeyPattern)) {
      keys.add(match[1]);
    }
  });

  return [...keys].sort();
}

describe("i18n static keys", () => {
  const keys = staticTranslationKeys();

  it("finds static translation usages", () => {
    expect(keys.length).toBeGreaterThan(0);
  });

  it.each(keys)("resolves %s", (key) => {
    expect(t(key)).not.toBe(key);
  });
});
