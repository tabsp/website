/**
 * Tests for the Linewise upgrade system.
 * Usage: node scripts/test-upgrade.mjs
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

const ROOT = realpathSync(join(import.meta.dirname, ".."));
const UPGRADE_CHECK = join(ROOT, "scripts", "upgrade-check.mjs");
const UPGRADE = join(ROOT, "scripts", "upgrade.mjs");
const tmpDirs = [];
function tmp() {
  const d = mkdtempSync(join(tmpdir(), "lw-"));
  tmpDirs.push(d);
  return realpathSync(d);
}

function git(cwd, cmd) {
  return execSync(`git ${cmd}`, { cwd, encoding: "utf8", stdio: "pipe" }).trim();
}
function write(cwd, p, c) {
  const f = join(cwd, p);
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f, c, "utf8");
}

function node(cwd, scriptPath, ...args) {
  try {
    return execSync(`node "${scriptPath}" ${args.join(" ")}`, {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 30000,
    });
  } catch (e) {
    return (e.stdout || "") + (e.stderr || "");
  }
}
function runCheck(cwd, ...a) {
  return node(cwd, UPGRADE_CHECK, ...a);
}
function runUpgrade(cwd, ...a) {
  return node(cwd, UPGRADE, ...a);
}

function initGit(dir, email, name) {
  git(dir, "init -b main");
  git(dir, "config core.autocrlf false");
  git(dir, `config user.email "${email}"`);
  git(dir, `config user.name "${name}"`);
}
function commitAll(dir, msg) {
  git(dir, "add -A");
  try {
    git(dir, `commit -m "${msg}" --allow-empty`);
  } catch {}
}

/** Clone upstream to user at given ref. Post-process: add upstream remote, ensure .linewise-version exists with absolute path. */
function cloneAt(up, usr, ref) {
  rmSync(usr, { recursive: true, force: true });
  execSync(`git clone --branch main "${up}" "${usr}"`, { stdio: "pipe" });
  git(usr, "config core.autocrlf false");
  git(usr, 'config user.email "user@test"');
  git(usr, 'config user.name "User"');
  git(usr, `remote add linewise "${up.replace(/\\/g, "/")}"`);
  git(usr, "fetch linewise --tags");
  git(usr, `reset --hard ${ref}`);
  git(usr, "clean -fd");

  // Ensure .linewise-version has absolute upstream path
  if (existsSync(join(usr, ".linewise-version"))) {
    const ver = JSON.parse(
      execSync(
        "node -e \"process.stdout.write(require('fs').readFileSync('.linewise-version','utf8'))\"",
        { cwd: usr, encoding: "utf8" }
      )
    );
    ver.upstream = up.replace(/\\/g, "/");
    writeFileSync(join(usr, ".linewise-version"), JSON.stringify(ver, null, 2) + "\n");
    commitAll(usr, "fix upstream path");
  } else {
    // Create one if missing (bare SHA reset)
    write(
      usr,
      ".linewise-version",
      JSON.stringify({
        version: "0.1.0",
        upstream: up.replace(/\\/g, "/"),
        pinned: git(usr, "rev-parse HEAD"),
      })
    );
    commitAll(usr, "add .linewise-version");
  }
}

after(() => {
  for (const d of tmpDirs)
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {}
});

// ============================================================================

describe("upgrade-check", () => {
  describe("with tags", () => {
    let up, usr;
    before(() => {
      up = tmp();
      initGit(up, "up@t", "Up");
      write(up, "src/components/App.astro", "// fw v1");
      write(
        up,
        ".linewise-version",
        JSON.stringify({ version: "0.1.0", upstream: up, pinned: "" })
      );
      commitAll(up, "initial");
      const s = git(up, "rev-parse HEAD");
      write(up, ".linewise-version", JSON.stringify({ version: "0.1.0", upstream: up, pinned: s }));
      commitAll(up, "pin");
      git(up, "tag v0.1.0");
      write(up, "src/components/App.astro", "// fw v2");
      write(up, "src/components/New.astro", "// new");
      commitAll(up, "feat");
      git(up, "tag v0.2.0");
      usr = tmp();
      cloneAt(up, usr, "v0.1.0");
    });
    it("shows updates with classification", () => {
      const o = runCheck(usr);
      assert.match(o, /Target\s+v0\.2\.0/);
      assert.match(o, /framework/);
    });
    it("says up to date when current", () => {
      const s = git(up, "rev-parse v0.2.0");
      write(
        usr,
        ".linewise-version",
        JSON.stringify({ version: "0.1.0", upstream: up, pinned: s })
      );
      commitAll(usr, "bump");
      assert.match(runCheck(usr), /Already up to date/);
    });
  });

  describe("without tags", () => {
    let up, usr;
    before(() => {
      up = tmp();
      initGit(up, "up@t", "Up");
      write(up, "src/components/App.astro", "// fw v1");
      write(up, "linewise.config.ts", "// placeholder");
      write(
        up,
        ".linewise-version",
        JSON.stringify({ version: "0.1.0", upstream: up, pinned: "" })
      );
      commitAll(up, "initial");
      const s = git(up, "rev-parse HEAD");
      write(up, ".linewise-version", JSON.stringify({ version: "0.1.0", upstream: up, pinned: s }));
      commitAll(up, "pin");
      usr = tmp();
      cloneAt(up, usr, "main");
    });
    it("errors with --track main hint", () => {
      const o = runCheck(usr);
      assert.match(o, /No upstream v\* tags found/);
      assert.match(o, /--track main/);
    });
  });

  describe("--track main", () => {
    let up, usr, s;
    before(() => {
      up = tmp();
      initGit(up, "up@t", "Up");
      write(up, "src/components/App.astro", "// fw v1");
      write(up, "linewise.config.ts", "// placeholder");
      write(
        up,
        ".linewise-version",
        JSON.stringify({ version: "0.1.0", upstream: up, pinned: "" })
      );
      commitAll(up, "initial");
      s = git(up, "rev-parse HEAD");
      write(up, ".linewise-version", JSON.stringify({ version: "0.1.0", upstream: up, pinned: s }));
      commitAll(up, "pin");
      write(up, "src/components/App.astro", "// fw v2");
      commitAll(up, "update");
      usr = tmp();
      cloneAt(up, usr, s);
    });
    it("shows updates from linewise/main", () => {
      const o = runCheck(usr, "--track", "main");
      assert.match(o, /linewise\/main/);
    });
  });

  describe("no upstream remote", () => {
    let usr;
    before(() => {
      usr = tmp();
      initGit(usr, "u@t", "U");
      write(
        usr,
        ".linewise-version",
        JSON.stringify({
          version: "0.1.0",
          upstream: "../nonexistent",
          pinned: "abc",
        })
      );
      commitAll(usr, "initial");
    });
    it("prints instructions", () => {
      assert.match(runCheck(usr), /Adding linewise remote/);
    });
  });
});

// ============================================================================

describe("upgrade", () => {
  describe("dirty tree", () => {
    let up, usr;
    before(() => {
      up = tmp();
      initGit(up, "up@t", "Up");
      write(up, "src/components/App.astro", "// fw v1");
      write(up, "linewise.config.ts", "// placeholder");
      write(
        up,
        ".linewise-version",
        JSON.stringify({ version: "0.1.0", upstream: up, pinned: "" })
      );
      commitAll(up, "initial");
      const s = git(up, "rev-parse HEAD");
      write(up, ".linewise-version", JSON.stringify({ version: "0.1.0", upstream: up, pinned: s }));
      commitAll(up, "pin");
      git(up, "tag v0.1.0");
      write(up, "src/components/App.astro", "// fw v2");
      commitAll(up, "up");
      git(up, "tag v0.2.0");
      usr = tmp();
      cloneAt(up, usr, "v0.1.0");
      write(usr, "dirty.txt", "x");
    });
    it("refuses", () => {
      assert.match(runUpgrade(usr, "--yes", "--no-verify"), /not clean/);
    });
  });

  describe("--dry-run", () => {
    let up, usr;
    before(() => {
      up = tmp();
      initGit(up, "up@t", "Up");
      write(up, "src/components/App.astro", "// fw v1");
      write(up, "linewise.config.ts", "// placeholder");
      write(
        up,
        ".linewise-version",
        JSON.stringify({ version: "0.1.0", upstream: up, pinned: "" })
      );
      commitAll(up, "initial");
      const s = git(up, "rev-parse HEAD");
      write(up, ".linewise-version", JSON.stringify({ version: "0.1.0", upstream: up, pinned: s }));
      commitAll(up, "pin");
      git(up, "tag v0.1.0");
      write(up, "src/components/App.astro", "// fw v2");
      commitAll(up, "up");
      git(up, "tag v0.2.0");
      usr = tmp();
      cloneAt(up, usr, "v0.1.0");
    });
    it("no changes", () => {
      const before = git(usr, "branch");
      runUpgrade(usr, "--dry-run", "--yes");
      assert.equal(before, git(usr, "branch"));
    });
  });

  describe("full flow", () => {
    let up, usr;
    before(() => {
      up = tmp();
      initGit(up, "up@t", "Up");
      write(up, "package.json", JSON.stringify({ scripts: { build: "echo ok" } }));
      write(up, "linewise.config.ts", "// up config");
      write(up, "src/content/blog/post.md", "---\ntitle: P\n---\nHello");
      write(up, "src/components/App.astro", "// fw v1");
      write(up, "src/scripts/app.ts", "// app v1");
      write(up, "src/styles/global.css", "/* up v1 */");
      write(up, "README.md", "# Test");
      write(up, "tsconfig.json", "{}");
      write(
        up,
        ".linewise-version",
        JSON.stringify({ version: "0.1.0", upstream: up, pinned: "" })
      );
      commitAll(up, "initial");
      const s = git(up, "rev-parse HEAD");
      write(up, ".linewise-version", JSON.stringify({ version: "0.1.0", upstream: up, pinned: s }));
      commitAll(up, "pin");
      git(up, "tag v0.1.0");
      write(up, "src/components/App.astro", "// fw v2");
      write(up, "src/components/New.astro", "// new feat");
      write(up, "src/scripts/app.ts", "// app v2");
      commitAll(up, "feat");
      git(up, "tag v0.2.0");
      usr = tmp();
      cloneAt(up, usr, "v0.1.0");
      write(usr, "linewise.config.ts", "// MY config");
      write(usr, "src/content/blog/my-post.md", "---\ntitle: Mine\n---\nX");
      commitAll(usr, "my changes");
    });
    it("preserves user, updates framework", () => {
      const o = runUpgrade(usr, "--yes", "--no-verify");
      assert.match(o, /Merge committed/);
      assert.match(o, /Upgrade complete/);
      const app = execSync(
        "node -e \"process.stdout.write(require('fs').readFileSync('src/components/App.astro','utf8'))\"",
        { cwd: usr, encoding: "utf8" }
      );
      assert.match(app, /fw v2/);
      const cfg = execSync(
        "node -e \"process.stdout.write(require('fs').readFileSync('linewise.config.ts','utf8'))\"",
        { cwd: usr, encoding: "utf8" }
      );
      assert.match(cfg, /MY config/);
      const pst = execSync(
        "node -e \"process.stdout.write(require('fs').readFileSync('src/content/blog/my-post.md','utf8'))\"",
        { cwd: usr, encoding: "utf8" }
      );
      assert.match(pst, /Mine/);
    });
  });

  describe("--track main", () => {
    let up, usr, s;
    before(() => {
      up = tmp();
      initGit(up, "up@t", "Up");
      write(up, "package.json", JSON.stringify({ scripts: { build: "echo ok" } }));
      write(up, "src/components/App.astro", "// fw v1");
      write(up, "linewise.config.ts", "// placeholder");
      write(
        up,
        ".linewise-version",
        JSON.stringify({ version: "0.1.0", upstream: up, pinned: "" })
      );
      commitAll(up, "initial");
      s = git(up, "rev-parse HEAD");
      write(up, ".linewise-version", JSON.stringify({ version: "0.1.0", upstream: up, pinned: s }));
      commitAll(up, "pin");
      write(up, "src/components/App.astro", "// fw v2");
      commitAll(up, "up");
      usr = tmp();
      cloneAt(up, usr, s);
    });
    it("merges from main", () => {
      const o = runUpgrade(usr, "--track", "main", "--yes", "--no-verify");
      assert.match(o, /Merge committed/);
      const app = execSync(
        "node -e \"process.stdout.write(require('fs').readFileSync('src/components/App.astro','utf8'))\"",
        { cwd: usr, encoding: "utf8" }
      );
      assert.match(app, /fw v2/);
    });
  });

  describe("mixed conflict", () => {
    let up, usr;
    before(() => {
      up = tmp();
      initGit(up, "up@t", "Up");
      write(up, "package.json", JSON.stringify({ scripts: { build: "echo ok" } }));
      write(up, "linewise.config.ts", "// placeholder");
      write(up, "src/styles/global.css", "/* up v1 */");
      write(
        up,
        ".linewise-version",
        JSON.stringify({ version: "0.1.0", upstream: up, pinned: "" })
      );
      commitAll(up, "initial");
      const s = git(up, "rev-parse HEAD");
      write(up, ".linewise-version", JSON.stringify({ version: "0.1.0", upstream: up, pinned: s }));
      commitAll(up, "pin");
      git(up, "tag v0.1.0");
      write(up, "src/styles/global.css", "/* up v2 */");
      commitAll(up, "up");
      git(up, "tag v0.2.0");
      usr = tmp();
      cloneAt(up, usr, "v0.1.0");
      write(usr, "src/styles/global.css", "/* MY styles */");
      commitAll(usr, "my styles");
    });
    it("flags for manual review", () => {
      const o = runUpgrade(usr, "--yes", "--no-verify");
      assert.match(o, /Conflict in mixed file/);
      assert.match(o, /global\.css/);
    });
  });
});
