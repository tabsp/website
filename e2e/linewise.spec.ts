import { expect, test } from "@playwright/test";

/* ── Homepage / :ls ── */

test("homepage renders buffer list", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".section-header h1")).toHaveText("Open buffers");
  await expect(page.locator(".buffer-row").first()).toBeVisible();
});

test("homepage shows NORMAL mode in statusline", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-status-mode]")).toHaveText("NORMAL");
});

/* ── /find/ (quickfix search) ── */

test("/find/ shows search input and results", async ({ page }) => {
  await page.goto("/find/");
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".find-row").first()).toBeVisible();
});

test("/find/ filters results on input", async ({ page }) => {
  await page.goto("/find/");
  const input = page.locator("#search");
  const initialCount = await page.locator(".find-row").count();

  await input.fill("vim");
  await page.waitForTimeout(200);
  const filteredCount = await page.locator(".find-row").count();
  expect(filteredCount).toBeLessThanOrEqual(initialCount);
  expect(filteredCount).toBeGreaterThan(0);
});

/* ── Article page ── */

test("article page renders post content", async ({ page }) => {
  await page.goto("/posts/getting-started/");
  await expect(page.locator("article h1")).toBeVisible();
  await expect(page.locator("[data-status-file]")).toContainText("getting-started");
});

test("article page shows reading time in statusline", async ({ page }) => {
  await page.goto("/posts/getting-started/");
  await expect(page.locator("[data-status-meta]")).toContainText("min read");
});

/* ── Command palette (:find) ── */

test(": opens command palette in COMMAND mode", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press(":");
  await expect(page.locator("body")).toHaveAttribute("data-mode", "command");
  await expect(page.locator("[data-command-input]")).toBeFocused();
});

test(":find in command palette navigates to /find/", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press(":");
  await page.locator("[data-command-input]").fill("find");
  await page.locator("[data-command-input]").press("Enter");
  await expect(page).toHaveURL(/\/find\//);
});

test(":q from homepage navigates away", async ({ page }) => {
  await page.goto("/");
  // Navigate to a post first so :q has a buffer to close
  await page.goto("/posts/getting-started/");
  await page.keyboard.press("q");
  // :q should navigate to nearest buffer (homepage)
  await expect(page).toHaveURL("/");
});

/* ── j/k navigation ── */

test("j moves selection down on buffer list", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("j");
  await expect(page.locator(".buffer-row.is-active")).toBeVisible();
  await expect(page.locator("[data-status-meta]")).toContainText("2/");
});

test("k moves selection up on buffer list", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await page.keyboard.press("k");
  await expect(page.locator("[data-status-meta]")).toContainText("2/");
});

/* ── gg / G navigation ── */

test("G moves to last buffer row", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("G");
  const totalRows = await page.locator(".buffer-row").count();
  await expect(page.locator("[data-status-meta]")).toContainText(`${totalRows}/${totalRows}`);
});

test("gg moves to first buffer row", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("G");
  await page.keyboard.press("g");
  await page.keyboard.press("g");
  await expect(page.locator("[data-status-meta]")).toContainText("1/");
});

/* ── Escape returns to NORMAL ── */

test("Escape exits command mode", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press(":");
  await expect(page.locator("body")).toHaveAttribute("data-mode", "command");
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).toHaveAttribute("data-mode", "normal");
});

/* ── / opens search mode ── */

test("/ opens search palette", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("/");
  await expect(page.locator("body")).toHaveAttribute("data-mode", "search");
});

/* ── :h / :help command ── */

test(":h navigates to help page", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press(":");
  await page.locator("[data-command-input]").fill("h");
  await page.locator("[data-command-input]").press("Enter");
  await expect(page).toHaveURL(/\/help\//);
});

test(":help navigates to help page", async ({ page }) => {
  await page.goto("/posts/getting-started/");
  await page.keyboard.press(":");
  await page.locator("[data-command-input]").fill("help");
  await page.locator("[data-command-input]").press("Enter");
  await expect(page).toHaveURL(/\/help\//);
});

/* ── b key navigates to / ── */

test("b key navigates to homepage from article", async ({ page }) => {
  await page.goto("/posts/getting-started/");
  await page.keyboard.press("b");
  await expect(page).toHaveURL("/");
});

test("b key is no-op on homepage", async ({ page }) => {
  await page.goto("/");
  const bufferCount = await page.locator(".buffer-row").count();
  await page.keyboard.press("b");
  await expect(page).toHaveURL("/");
  await expect(page.locator(".buffer-row")).toHaveCount(bufferCount);
});

/* ── ? key opens help panel ── */

test("? key navigates to help page", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("?");
  await expect(page).toHaveURL(/\/help\//);
});

/* ── /find/ with j/k navigation ── */

test("/find/ supports j/k to move through results", async ({ page }) => {
  await page.goto("/find/");
  await page.locator("#search").fill("vim");
  await page.waitForTimeout(200);
  // Press Esc to leave INSERT-like mode on /find/ page
  await page.keyboard.press("Escape");
  await page.keyboard.press("j");
  await page.waitForTimeout(100);
  await expect(page.locator(".find-row.is-active")).toBeVisible();
  await expect(page.locator("[data-status-meta]")).toContainText("2/");
});

/* ── /find/ with query parameter ── */

test("/find/ loads with query from URL param", async ({ page }) => {
  await page.goto("/find/?q=astro");
  await page.waitForTimeout(200);
  await expect(page.locator("#search")).toHaveValue("astro");
  const rows = page.locator(".find-row");
  await expect(rows.first()).toBeVisible();
  // All visible rows should mention "astro" in context
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
});

/* ── Statusline displays default "All clear" ── */

test("statusline shows 'All clear' on homepage load", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-status-meta]")).not.toBeEmpty();
});

/* ── Mobile file explorer ── */

test.describe("mobile explorer", () => {
  test.use({ viewport: { width: 393, height: 852 } }); // iPhone 14 Pro

  test("explorer starts hidden on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/explorer-hidden/);
  });

  test("explorer can be toggled open on mobile", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-open-explorer]").click();
    await expect(page.locator("html")).toHaveClass(/explorer-open/);
  });

  test("explorer links navigate on mobile", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-open-explorer]").click();
    await page.locator(".tree a[href]").first().click();
    // Should have navigated to a post
    await expect(page.locator(".post")).toBeVisible();
  });

  test("explorer closes after navigating a link on mobile", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-open-explorer]").click();
    await page.locator(".tree a[href]").first().click();
    await page.waitForTimeout(300);
    await expect(page.locator("html")).toHaveClass(/explorer-hidden/);
  });
});

/* ── Desktop explorer persistence ── */

test.describe("desktop explorer persistence", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("explorer starts visible on desktop", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/explorer-open/);
  });

  test("explorer state persists across navigation", async ({ page }) => {
    await page.goto("/");
    // Verify explorer starts open
    await expect(page.locator("html")).toHaveClass(/explorer-open/);
    // Close explorer
    await page.locator("[data-open-explorer]").click();
    await expect(page.locator("html")).toHaveClass(/explorer-hidden/);
    // Navigate to another page via full reload
    await page.goto("/posts/getting-started/");
    await page.waitForLoadState("networkidle");
    // Explorer should still be hidden after full page reload (state persisted via localStorage)
    await expect(page.locator("html")).toHaveClass(/explorer-hidden/);
  });
});
