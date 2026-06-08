/**
 * Upgrade Linewise to the latest upstream version.
 *
 * Usage: node scripts/upgrade.mjs [--track main] [--dry-run] [--yes] [--no-verify]
 *        pnpm upgrade
 *        pnpm upgrade -- --track main --yes
 *
 * Default tracks v* tags only. Use --track main to merge from linewise/main.
 *
 * Steps:
 *  1. Ensure clean working tree
 *  2. fetch linewise
 *  3. Pick target (latest v* tag, or linewise/main with --track main)
 *  4. Create upgrade branch
 *  5. Merge upstream target with file-classification strategy
 *  6. Install deps if package.json changed (skip with --no-verify)
 *  7. Build-verify (skip with --no-verify)
 *  8. Update .linewise-version
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createInterface } from "node:readline";

const root = process.cwd();

const TRACK_MAIN =
  process.argv.includes("--track") && process.argv[process.argv.indexOf("--track") + 1] === "main";
const DRY_RUN = process.argv.includes("--dry-run");
const YES = process.argv.includes("--yes");
const NO_VERIFY = process.argv.includes("--no-verify");

// --- helpers ---

function run(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: root,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    ...opts,
  }).trim();
}

function runOk(cmd, opts = {}) {
  try {
    execSync(cmd, {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      ...opts,
    });
    return true;
  } catch {
    return false;
  }
}

function fail(msg) {
  console.error(`\x1b[31m\u2717\x1b[0m ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`\x1b[32m\u2713\x1b[0m ${msg}`);
}

function info(msg) {
  console.log(`  ${msg}`);
}

function warn(msg) {
  console.log(`\x1b[33m!\x1b[0m ${msg}`);
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

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// --- resolve target ---

function resolveTarget(runFn) {
  if (TRACK_MAIN) {
    return { ref: "linewise/main", label: "linewise/main", mode: "main" };
  }

  const rawTags = runFn('git tag --list "v*" --sort=-v:refname');
  const tags = rawTags ? rawTags.split(/\r?\n/).filter(Boolean) : [];
  if (tags.length === 0) {
    fail("No upstream v* tags found. Use --track main to merge from linewise/main instead.");
  }
  return { ref: tags[0], label: tags[0], mode: "tags" };
}

// --- main ---

const originalBranch = run("git rev-parse --abbrev-ref HEAD");

const status = run("git status --porcelain");
if (status) {
  fail("Working tree is not clean. Please commit or stash changes first.");
}

const versionPath = resolve(root, ".linewise-version");
if (!existsSync(versionPath)) {
  fail(".linewise-version not found. Is this a Linewise project?");
}
const versionData = JSON.parse(readFileSync(versionPath, "utf8"));
const { pinned, upstream } = versionData;

const remotes = run("git remote");
if (!remotes.split(/\r?\n/).includes("linewise")) {
  fail(`No upstream remote. Add it:\n  git remote add linewise ${upstream}`);
}

console.log(`Fetching upstream...${TRACK_MAIN ? " " + dim("(tracking main)") : ""}`);
run("git fetch linewise --tags");
if (TRACK_MAIN) run("git fetch linewise main");

const target = resolveTarget(run);

const behind = run(`git rev-list --count ${pinned}..${target.ref}`);
if (behind === "0") {
  ok(`Already up to date (${versionData.version}).`);
  process.exit(0);
}

console.log(`\nCurrent   ${versionData.version}  (${pinned.slice(0, 7)})`);
console.log(`Target    ${target.label}`);
console.log(`${dim(`(${behind} commits)`)}\n`);

const changed = run(`git diff --name-status ${pinned}..${target.ref}`);
if (changed) {
  console.log("Changed files:");
  for (const line of changed.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split(/\t/);
    const file = parts[parts.length - 1];
    if (!file) continue;
    const strat = classify(file);
    const label = strat === USER ? "user" : strat === FRAMEWORK ? "framework" : "mixed";
    console.log(`  ${dim("M")} ${file.padEnd(48)} ${dim(label)}`);
  }
}

if (!YES && !DRY_RUN) {
  const answer = await ask("\nProceed with upgrade? [y/N] ");
  if (answer !== "y" && answer !== "yes") {
    console.log("Aborted.");
    process.exit(0);
  }
}

if (DRY_RUN) {
  console.log("\n" + dim("--dry-run: would create branch and merge, but stopping here."));
  process.exit(0);
}

const branchSuffix = TRACK_MAIN ? run("git rev-parse --short " + target.ref) : target.ref;
const branchName = `linewise/upgrade-${branchSuffix}`;
console.log(`\nCreating branch ${dim(branchName)}...`);
run(`git checkout -b ${branchName}`);

console.log(`Merging ${dim(target.ref)}...`);
runOk(`git merge ${target.ref} --no-commit --no-ff`);

const conflicted = run("git diff --name-only --diff-filter=U");
const conflictedFiles = conflicted ? conflicted.split(/\r?\n/).filter(Boolean) : [];

const allChanged = run(`git diff --name-status HEAD...${target.ref}`);
const changedFiles = allChanged
  ? allChanged
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => {
        const parts = line.split(/\t/);
        return { status: parts[0], file: parts[parts.length - 1] };
      })
  : [];

const mixNeedsReview = [];

for (const f of conflictedFiles) {
  const strat = classify(f);
  if (strat === USER) {
    info(`${dim("user")}  ${f} \u2192 keeping your version`);
    run(`git checkout --ours "${f}"`);
    run(`git add "${f}"`);
  } else if (strat === FRAMEWORK) {
    info(`${dim("framework")} ${f} \u2192 using upstream version`);
    run(`git checkout --theirs "${f}"`);
    run(`git add "${f}"`);
  } else {
    warn(`Conflict in mixed file: ${f} (needs manual review)`);
    mixNeedsReview.push(f);
  }
}

for (const { file } of changedFiles) {
  if (!file) continue;
  const strat = classify(file);
  if (strat === USER && !conflictedFiles.includes(file)) {
    info(`${dim("user")}  ${file} \u2192 keeping your version`);
    run(`git checkout HEAD -- "${file}"`);
    run(`git add "${file}"`);
  }
}

try {
  run(`git commit -m "upgrade: merge upstream ${branchSuffix}"`);
  ok("Merge committed.");
} catch (e) {
  if (mixNeedsReview.length > 0) {
    console.log("\nMixed files with conflicts to resolve manually:");
    for (const f of mixNeedsReview) {
      console.log(`  ${dim("!")} ${f}`);
    }
    console.log("\nResolve the conflicts above, then:");
    console.log("  git add . && git commit");
    console.log("\nAfter that, re-run this script to continue.");
    process.exit(0);
  }
  console.log(
    "\nCommit failed. Check the merge state and commit manually, then re-run this script."
  );
  process.exit(1);
}

const mixedChanged = changedFiles.filter(
  ({ file }) => file && classify(file) === MIXED && !conflictedFiles.includes(file)
);
if (mixedChanged.length > 0) {
  console.log("\nMixed files with upstream changes (review recommended):");
  for (const { file } of mixedChanged) {
    console.log(`  ${dim("M")} ${file}`);
  }
}

const pkgChanged = changedFiles.some(
  ({ file }) => file === "package.json" || file === "pnpm-lock.yaml"
);
if (!NO_VERIFY && pkgChanged) {
  console.log("\nInstalling dependencies...");
  try {
    run("pnpm install --no-frozen-lockfile");
    ok("Dependencies installed.");
  } catch (e) {
    warn("pnpm install failed. Run it manually.");
  }
}

if (NO_VERIFY) {
  console.log("\nSkipping build verification (--no-verify).");
} else {
  console.log("\nVerifying build...");
  try {
    run("pnpm build");
    ok("Build succeeded.");
  } catch (e) {
    warn("Build failed. The merge may need adjustments.");
    warn(`When ready, merge ${branchName} into your main branch.`);
    warn(`To roll back: git checkout ${originalBranch} && git branch -D ${branchName}`);
    process.exit(1);
  }
}

const currentHead = run("git rev-parse HEAD");
const upstreamHead = run(`git rev-parse ${target.ref}`);
versionData.version = branchSuffix;
versionData.pinned = upstreamHead;
writeFileSync(versionPath, JSON.stringify(versionData, null, 2) + "\n", "utf8");
ok(`Updated .linewise-version to ${versionData.version} (pinned ${upstreamHead.slice(0, 7)})`);

console.log(`\n${dim("\u2500".repeat(48))}`);
console.log(`Upgrade complete: ${versionData.version} (${currentHead.slice(0, 7)})`);
console.log(`\nReview the changes on branch ${dim(branchName)}, then:`);
console.log(`  git checkout ${originalBranch}`);
console.log(`  git merge ${branchName}`);
console.log(`  git branch -d ${branchName}`);
if (mixedChanged.length > 0 || mixNeedsReview.length > 0) {
  console.log("\nDon't forget to review the mixed files listed above.");
}
console.log();
