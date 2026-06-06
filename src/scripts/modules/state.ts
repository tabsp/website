/**
 * Shared state and lazy DOM references.
 * Every module imports from here instead of grabbing its own querySelector calls.
 */

export type Mode = "NORMAL" | "COMMAND" | "SEARCH";

export interface BufferTab {
  href: string;
  label: string;
}

export interface PaletteItem {
  command: string;
  description: string;
  href?: string;
  location?: string;
  title?: string;
  type?: string;
}

/* ── Application state ── */

export const state = {
  mode: "NORMAL" as Mode,
  selectedIndex: 0,
  suggestionIndex: 0,
  awaitingSecondG: false,
};

/* navigationToken prevents stale async buffer swaps */
export let navigationToken = 0;
export function nextNavigationToken() {
  navigationToken += 1;
  return navigationToken;
}

/* ── Lazy DOM references ── */

export function commandInput() {
  return document.querySelector<HTMLInputElement>("[data-command-input]");
}

export function commandBar() {
  return document.querySelector<HTMLElement>(".command-bar");
}

export function commandSuggestions() {
  return document.querySelector<HTMLElement>("[data-command-suggestions]");
}

export function commandPrompt() {
  return document.querySelector<HTMLElement>(".prompt");
}

export function statusModeEl() {
  return document.querySelector<HTMLElement>("[data-status-mode]");
}

export function statusMetaEl() {
  return document.querySelector<HTMLElement>("[data-status-meta]");
}

export function bufferlineEl() {
  return document.querySelector<HTMLElement>("[data-bufferline]");
}

export function normalizePath(href: string) {
  return new URL(href, window.location.origin).pathname;
}

export function fileExplorerEl() {
  return document.querySelector<HTMLElement>(".file-explorer");
}

export function openExplorerButtons() {
  return document.querySelectorAll<HTMLButtonElement>("[data-open-explorer]");
}

export function closePaletteButton() {
  return document.querySelector<HTMLButtonElement>("[data-close-palette]");
}

export function mainContentEl() {
  return document.querySelector<HTMLElement>("#main-content");
}

/* ── Mode helpers ── */

export function setMode(mode: Mode) {
  state.mode = mode;
  document.body.dataset.mode = mode.toLowerCase();
  const sm = statusModeEl();
  if (sm) sm.textContent = mode;
  const cp = commandPrompt();
  if (cp) cp.textContent = mode === "SEARCH" ? "/" : ":";
  const ci = commandInput();
  if (ci) ci.readOnly = mode === "NORMAL";
}

export function setStatus(text?: string) {
  const el = statusMetaEl();
  if (!el) return;
  el.textContent = text ?? el.textContent;
}
