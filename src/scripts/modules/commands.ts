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
import {
  escapeHtml,
  reportScrollProgress,
  select,
  selectableItemCount,
  syncSelectableItemCount,
} from "./keyboard";
import { highlightMatch, readSearchIndex, searchWithScores } from "./search";
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
  const query = commandInput()?.value?.trim() ?? "";
  return `
    <button type="button" class="${isActive ? "is-active" : ""}" data-command-suggestion="${escapeHtml(entry.title ?? entry.command)}" data-suggestion-index="${index}">
      <span>${highlightMatch(entry.title ?? entry.command, query)}</span>
      <small>${highlightMatch(entry.description, query)}</small>
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
  currentSuggestions = query ? searchWithScores(query, searchIndex).map(r => r.entry) : searchIndex;
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

  // Special commands without href routing
  if (command === "q" || command === "quit") {
    quitCurrentBuffer();
    return;
  }
  if (command === "explore" || command === "ex") {
    toggleExplorer();
    return;
  }
  if (command === "exploreopen") {
    setExplorerHidden(false);
    return;
  }
  if (command === "exploreclose") {
    setExplorerHidden(true);
    return;
  }

  // Route-based commands: derive from the command registry
  const routeKey =
    command === "post" || command === "ls" || command === "buffers" ? "posts" : command;
  const match = commands.find(c => c.href && c.command === routeKey);
  if (match?.href) {
    window.location.href = match.href;
    return;
  }

  if (command === "h") {
    window.location.href = "/help/";
    return;
  }

  setStatus(`not an editor command: ${command || "(empty)"}`);
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
  syncSelectableItemCount();
  if (selectableItemCount) {
    select(state.selectedIndex, false);
  } else {
    reportScrollProgress();
  }
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
