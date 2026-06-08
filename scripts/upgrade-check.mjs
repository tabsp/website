/**
 * Check for upstream Linewise updates without making changes.
 *
 * Usage: node scripts/upgrade-check.mjs [--track main]
 *        pnpm upgrade:check
 *        pnpm upgrade:check -- --track main
 *
 * Default tracks v* tags only. Use --track main to track upstream/main directly.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const TRACK_MAIN =
  process.argv.includes("--track") && process.argv[process.argv.indexOf("--track") + 1] === "main";

// --- helpers ---

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      ...opts,
    }).trim();
  } catch {
    return "";
  }
}

function fail(msg) {
  console.error(`\x1b[31m\u2717\x1b[0m ${msg}`);
  process.exit(1);
}

function dim(msg) {
  return `\x1b[2m${msg}\x1b[0m`;
}

// --- file classification ---

const USER = "user";
const FRAMEWORK = "framework";
const MIXED = "mixed";

const patterns = [
  { glob: "linewise.config.ts", strategy: USER },
  { glob: "src/content/blog/**", strategy: USER },
  { glob: "public/favicon.svg", strategy: USER },
  { glob: "public/og.svg", strategy: USER },
  { glob: "src/components/**", strategy: FRAMEWORK },
  { glob: "src/scripts/**", strategy: FRAMEWORK },
  { glob: "src/pages/**", strategy: FRAMEWORK },
  { glob: "src/lib/**", strategy: FRAMEWORK },
  { glob: "src/types/**", strategy: FRAMEWORK },
  { glob: "src/content.config.ts", strategy: FRAMEWORK },
  { glob: "src/config.ts", strategy: FRAMEWORK },
  { glob: "tsconfig.json", strategy: FRAMEWORK },
  { glob: "eslint.config.js", strategy: FRAMEWORK },
  { glob: ".prettierrc", strategy: FRAMEWORK },
  { glob: ".prettierignore", strategy: FRAMEWORK },
  { glob: ".editorconfig", strategy: FRAMEWORK },
  { glob: ".gitignore", strategy: FRAMEWORK },
  { glob: ".gitattributes", strategy: FRAMEWORK },
  { glob: "playwright.config.ts", strategy: FRAMEWORK },
  { glob: "pnpm-workspace.yaml", strategy: FRAMEWORK },
  { glob: "vercel.json", strategy: FRAMEWORK },
  { glob: "AGENTS.md", strategy: FRAMEWORK },
  { glob: "LINEWISE_UX.md", strategy: FRAMEWORK },
  { glob: "e2e/**", strategy: FRAMEWORK },
  { glob: "src/styles/global.css", strategy: MIXED },
  { glob: "astro.config.ts", strategy: MIXED },
  { glob: "package.json", strategy: MIXED },
  { glob: "pnpm-lock.yaml", strategy: FRAMEWORK },
  { glob: "README.md", strategy: MIXED },
  { glob: "LICENSE", strategy: MIXED },
  { glob: ".github/**", strategy: MIXED },
  { glob: ".linewise-version", strategy: FRAMEWORK },
];

function classify(filepath) {
  for (const p of patterns) {
    if (p.glob.endsWith("/**")) {
      const dir = p.glob.slice(0, -3);
      if (filepath === dir || filepath.startsWith(dir + "/")) return p.strategy;
    }
    if (p.glob === filepath) return p.strategy;
  }
  return MIXED;
}

function strategyLabel(s) {
  if (s === USER) return "\x1b[33muser\x1b[0m";
  if (s === FRAMEWORK) return "\x1b[32mframework\x1b[0m";
  return "\x1b[36mmixed\x1b[0m";
}

// --- resolve target ---

function resolveTarget(runFn) {
  if (TRACK_MAIN) {
    return { ref: "linewise/main", label: "linewise/main", mode: "main" };
  }

  const rawTags = runFn('git tag --list "v*" --sort=-v:refname');
  const tags = rawTags ? rawTags.split(/\r?\n/).filter(Boolean) : [];
  if (tags.length === 0) {
    fail("No upstream v* tags found. Use --track main to track linewise/main instead.");
  }
  return { ref: tags[0], label: tags[0], mode: "tags" };
}

// --- main ---

const versionPath = resolve(root, ".linewise-version");
if (!existsSync(versionPath)) {
  fail(".linewise-version not found. Is this a Linewise project?");
}
let versionData;
try {
  versionData = JSON.parse(readFileSync(versionPath, "utf8"));
} catch {
  fail(".linewise-version is malformed.");
}

// Ensure linewise remote exists, auto-add if missing
let remotes = run("git remote");
if (!remotes || !remotes.split(/\r?\n/).includes("linewise")) {
  console.log("Adding linewise remote...");
  run(`git remote add linewise ${versionData.upstream}`);
  console.log(`  linewise \u2192 ${versionData.upstream}`);
}

console.log(`Fetching upstream...${TRACK_MAIN ? " " + dim("(tracking main)") : ""}`);
run("git fetch linewise --tags 2>&1");
if (TRACK_MAIN) run("git fetch linewise main 2>&1");

const target = resolveTarget(run);

try {
  const { pinned, version } = versionData;
  const behind = run(`git rev-list --count ${pinned}..${target.ref}`);

  if (behind === "0") {
    console.log(`\u2713 Already up to date (${version}).`);
    process.exit(0);
  }

  console.log(`\nCurrent  ${version}  (${pinned.slice(0, 7)})`);
  console.log(`Target   ${target.label}`);
  console.log(`Behind   ${behind} commit(s)\n`);

  const changed = run(`git diff --name-status ${pinned}..${target.ref}`);
  if (changed) {
    console.log("Changed files:");
    for (const line of changed.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const parts = line.split(/\t/);
      const status = parts[0];
      const file = parts[parts.length - 1];
      if (!file) continue;
      const strat = classify(file);
      const icon = status.startsWith("D")
        ? "-"
        : status.startsWith("R")
          ? "~"
          : status.startsWith("A")
            ? "+"
            : "M";
      console.log(`  ${dim(icon)} ${file.padEnd(48)} ${strategyLabel(strat)}`);
    }
  }

  console.log(`\nChangelog (${pinned.slice(0, 7)} \u2192 ${target.label}):`);
  const log = run(`git log --oneline ${pinned}..${target.ref}`);
  if (log) {
    for (const line of log.split(/\r?\n/)) {
      console.log(`  ${dim(line)}`);
    }
  }

  const upgradeCmd = TRACK_MAIN ? "pnpm upgrade -- --track main" : "pnpm upgrade";
  console.log(`\nRun ${dim(upgradeCmd)} to apply these updates.\n`);
} catch (e) {
  console.error("Error comparing versions:", e.message);
  process.exit(1);
}
