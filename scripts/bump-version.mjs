/**
 * Bump .linewise-version before tagging a release.
 *
 * Usage: node scripts/bump-version.mjs 0.2.0
 *        pnpm version:bump 0.2.0
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const versionPath = resolve(root, ".linewise-version");

const newVersion = process.argv[2];
if (!newVersion) {
  console.error("Usage: node scripts/bump-version.mjs <version>");
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(versionPath, "utf8"));
} catch {
  console.error(".linewise-version not found or malformed.");
  process.exit(1);
}

const head = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

data.version = newVersion;
data.pinned = head;

writeFileSync(versionPath, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(`.linewise-version \u2192 ${data.version} (${head.slice(0, 7)})`);
console.log(`\nNext: git add .linewise-version && git commit -m "chore: bump to ${data.version}"`);
console.log(`Then: git tag v${data.version} && git push origin v${data.version}`);
