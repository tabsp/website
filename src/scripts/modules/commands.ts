/**
 * Command palette: definitions, suggestions, execution.
 */
import {
  type PaletteItem,
  state,
  commandInput,
  commandSuggestions,
  fileExplorerEl,
  setMode,
  setStatus,
} from "./state";
import { escapeHtml } from "./keyboard";
import { readSearchIndex } from "./search";
import { quitCurrentBuffer } from "./buffers";

/* ── Command registry ── */

export const commands: PaletteItem[] = [
  { command: "posts", description: "open post buffer list", href: "/" },
  { command: "ls", description: "open buffers", href: "/" },
  { command: "buffers", description: "open buffers", href: "/" },
  { command: "search", description: "open find", href: "/find/" },
  { command: "find", description: "open find", href: "/find/" },
  { command: "archive", description: "open oldfiles", href: "/archive/" },
  { command: "oldfiles", description: "open oldfiles", href: "/archive/" },
  { command: "tags", description: "open tag index", href: "/tags/" },
  { command: "help", description: "open help as temporary buffer", href: "/help/" },
  { command: "q", description: "quit current context" },
  { command: "explore", description: "toggle file explorer" },
  { command: "exploreopen", description: "open file explorer" },
  { command: "exploreclose", description: "close file explorer" },
  { command: "ex", description: "toggle file explorer" },
];

let currentSuggestions: PaletteItem[] = [];

export function activeSuggestion() {
  return currentSuggestions[state.suggestionIndex];
}

/* ── Suggestion building ── */

export function buildSuggestions(rawValue: string) {
  const needle = rawValue.toLowerCase();
  const matches = commands.filter(entry => entry.command.startsWith(needle));
  currentSuggestions = matches.slice(0, 8);
  state.suggestionIndex = Math.min(
    state.suggestionIndex,
    Math.max(0, currentSuggestions.length - 1)
  );
  return currentSuggestions;
}

function suggestionHtml(entry: PaletteItem, index: number) {
  const isActive = index === state.suggestionIndex;
  return `
    <button type="button" class="${isActive ? "is-active" : ""}" data-command-suggestion="${escapeHtml(entry.command)}" data-suggestion-index="${index}">
      <span>:${escapeHtml(entry.command)}</span>
      <small>${escapeHtml(entry.description)}</small>
      <em>${escapeHtml(entry.location ?? entry.type ?? "cmd")}</em>
    </button>
  `;
}

function searchSuggestionHtml(entry: PaletteItem, index: number) {
  const isActive = index === state.suggestionIndex;
  return `
    <button type="button" class="${isActive ? "is-active" : ""}" data-command-suggestion="${escapeHtml(entry.title ?? entry.command)}" data-suggestion-index="${index}">
      <span>${escapeHtml(entry.title ?? entry.command)}</span>
      <small>${escapeHtml(entry.description)}</small>
      <em>${escapeHtml(entry.location ?? entry.type ?? "match")}</em>
    </button>
  `;
}

export function renderCommandSuggestions() {
  const cs = commandSuggestions();
  const ci = commandInput();
  if (!cs || !ci) return;

  buildSuggestions(ci.value.trim().replace(/^:/, ""));
  cs.innerHTML = currentSuggestions.map(suggestionHtml).join("");
}

export function renderSearchSuggestions() {
  const cs = commandSuggestions();
  const ci = commandInput();
  if (!cs || !ci) return;

  const searchIndex = readSearchIndex();
  const query = (ci.value ?? "").trim().toLowerCase();
  currentSuggestions = query
    ? searchIndex.filter(entry => entry.keywords.join(" ").toLowerCase().includes(query))
    : searchIndex;
  currentSuggestions = currentSuggestions.slice(0, 8);
  state.suggestionIndex = Math.min(
    state.suggestionIndex,
    Math.max(0, currentSuggestions.length - 1)
  );

  cs.innerHTML = currentSuggestions.map(searchSuggestionHtml).join("");

  const active = activeSuggestion();
  setStatus(
    currentSuggestions.length
      ? `${state.suggestionIndex + 1}/${currentSuggestions.length} ${active?.title ?? "match"}`
      : "0 matches"
  );
}

export function moveSuggestion(delta: number) {
  if (!currentSuggestions.length) return;
  state.suggestionIndex =
    (state.suggestionIndex + delta + currentSuggestions.length) % currentSuggestions.length;
  if (state.mode === "SEARCH") renderSearchSuggestions();
  else renderCommandSuggestions();
}

/* ── Command execution ── */

export function runCommand(rawCommand: string) {
  const command = rawCommand.trim().replace(/^:/, "").toLowerCase();
  const suggestion = activeSuggestion();
  closeTransientMode();

  if (suggestion?.href && suggestion.command === command) {
    window.location.href = suggestion.href;
    return;
  }

  if (command === "posts" || command === "post" || command === "ls" || command === "buffers") {
    window.location.href = "/";
  } else if (command === "oldfiles" || command === "archive") {
    window.location.href = "/archive/";
  } else if (command === "tags") {
    window.location.href = "/tags/";
  } else if (command === "search" || command === "find") {
    window.location.href = "/find/";
  } else if (command === "help" || command === "h") {
    window.location.href = "/help/";
  } else if (command === "q" || command === "quit") {
    quitCurrentBuffer();
  } else if (command === "explore" || command === "ex") {
    toggleExplorer();
  } else if (command === "exploreopen") {
    setExplorerHidden(false);
  } else if (command === "exploreclose") {
    setExplorerHidden(true);
  } else {
    setStatus(`not an editor command: ${command || "(empty)"}`);
  }
}

export function runSelectedCommand() {
  const suggestion = activeSuggestion();
  const command = suggestion?.command ?? commandInput()?.value ?? "";
  runCommand(command);
}

/* ── Mode entry / exit ── */

export function openCommandLine(initialValue = "") {
  const ci = commandInput();
  if (!ci) return;
  setMode("COMMAND");
  ci.value = initialValue;
  ci.focus();
  ci.setSelectionRange(ci.value.length, ci.value.length);
  renderCommandSuggestions();
}

export function openSearch(initialValue = "") {
  const ci = commandInput();
  if (!ci) return;
  setMode("SEARCH");
  ci.value = initialValue;
  ci.focus();
  ci.setSelectionRange(ci.value.length, ci.value.length);
  renderSearchSuggestions();
}

export function closeTransientMode() {
  setMode("NORMAL");
  const ci = commandInput();
  if (ci) ci.value = "";
  ci?.blur();
  document.querySelector<HTMLInputElement>("#search")?.blur();
  const cs = commandSuggestions();
  if (cs) cs.innerHTML = "";
}

/* ── Explorer helpers ── */

export function setExplorerHidden(hidden: boolean) {
  document.documentElement.classList.toggle("explorer-hidden", hidden);
  document.documentElement.classList.toggle("explorer-open", !hidden);
  document.body.classList.toggle("explorer-hidden", hidden);
  document.body.classList.toggle("explorer-open", !hidden);
  document
    .querySelectorAll<HTMLButtonElement>("[data-open-explorer]")
    .forEach(btn => btn.setAttribute("aria-expanded", hidden ? "false" : "true"));
  // Persist on desktop so state survives full-page navigation.
  if (window.matchMedia("(min-width: 761px)").matches) {
    try {
      localStorage.setItem("linewise:explorer-hidden", hidden ? "1" : "0");
    } catch {
      /* noop */
    }
  }
}

export function toggleExplorer() {
  if (document.documentElement.classList.contains("explorer-hidden")) {
    setExplorerHidden(false);
    fileExplorerEl()
      ?.querySelector<HTMLAnchorElement>("a.is-current, a[href]")
      ?.focus({ preventScroll: true });
  } else {
    setExplorerHidden(true);
  }
}

export function closeExplorer() {
  setExplorerHidden(true);
}
