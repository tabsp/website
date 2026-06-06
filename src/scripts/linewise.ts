/**
 * Linewise client entry point.
 * Wires global event listeners; domain logic lives in src/scripts/modules/.
 */
import { state, setMode, setStatus, normalizePath } from "./modules/state";
import {
  handleNormalKey,
  hideHelp,
  activeScroller,
  select,
  syncSelectableItemCount,
  selectableItemCount,
  initializeWorkspace,
} from "./modules/keyboard";
import {
  openCommandLine,
  closeTransientMode,
  closeExplorer,
  setExplorerHidden,
  runSelectedCommand,
  moveSuggestion,
  renderSearchSuggestions,
  renderCommandSuggestions,
  activeSuggestion,
} from "./modules/commands";
import { syncBuffers, navigateToBuffer, closeBuffer } from "./modules/buffers";

/* ── DOM refs (wiring only) ── */

const commandInput = document.querySelector<HTMLInputElement>("[data-command-input]");
const commandForm = document.querySelector<HTMLFormElement>("[data-command-form]");
const commandSuggestions = document.querySelector<HTMLElement>("[data-command-suggestions]");
const closePaletteButton = document.querySelector<HTMLButtonElement>("[data-close-palette]");
const bufferline = document.querySelector<HTMLElement>("[data-bufferline]");
const fileExplorer = document.querySelector<HTMLElement>(".file-explorer");

/* ── Command form submit ── */

commandForm?.addEventListener("submit", event => {
  event.preventDefault();
  if (state.mode === "SEARCH") {
    const suggestion = activeSuggestion();
    window.location.href =
      suggestion?.href ?? `/find/?q=${encodeURIComponent(commandInput?.value ?? "")}`;
  } else {
    runSelectedCommand();
  }
});

/* ── Command input keyboard ── */

commandInput?.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeTransientMode();
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (state.mode === "SEARCH") {
      const suggestion = activeSuggestion();
      window.location.href =
        suggestion?.href ?? `/find/?q=${encodeURIComponent(commandInput.value)}`;
    } else {
      runSelectedCommand();
    }
  } else if (event.key === "ArrowDown" || (event.key === "n" && event.ctrlKey)) {
    event.preventDefault();
    moveSuggestion(1);
  } else if (event.key === "ArrowUp" || (event.key === "p" && event.ctrlKey)) {
    event.preventDefault();
    moveSuggestion(-1);
  } else if (event.key === "Tab") {
    event.preventDefault();
    moveSuggestion(event.shiftKey ? -1 : 1);
  }
});

commandInput?.addEventListener("input", () => {
  state.suggestionIndex = 0;
  if (state.mode === "SEARCH") renderSearchSuggestions();
  else renderCommandSuggestions();
});

commandInput?.addEventListener("click", event => {
  if (state.mode !== "NORMAL") return;
  event.preventDefault();
  openCommandLine("");
});

/* ── Palette backdrop ── */

function closePaletteFromBackdrop(event: Event) {
  if (state.mode === "NORMAL") return;
  const target = event.target as HTMLElement;
  if (target.closest(".command-input")) return;
  if (target.closest(".command-suggestions")) return;
  event.preventDefault();
  closeTransientMode();
}

closePaletteButton?.addEventListener("pointerdown", event => {
  event.preventDefault();
  closeTransientMode();
});
document.addEventListener("pointerdown", closePaletteFromBackdrop, true);

/* ── Suggestions click ── */

commandSuggestions?.addEventListener("click", event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-command-suggestion]"
  );
  if (!button || !commandInput) return;

  state.suggestionIndex = Number(button.dataset.suggestionIndex ?? 0);

  const suggestion = activeSuggestion();
  if (state.mode === "SEARCH" && suggestion?.href) {
    window.location.href = suggestion.href;
    return;
  }

  commandInput.value =
    state.mode === "SEARCH"
      ? commandInput.value
      : (suggestion?.command ?? button.dataset.commandSuggestion ?? "");
  commandInput.focus();
  if (state.mode === "SEARCH") renderSearchSuggestions();
  else renderCommandSuggestions();
});

/* ── Explorer buttons ── */

document.querySelectorAll<HTMLButtonElement>("[data-open-explorer]").forEach(btn => {
  btn.addEventListener("click", () => {
    if (document.documentElement.classList.contains("explorer-hidden")) {
      setExplorerHidden(false);
      fileExplorer
        ?.querySelector<HTMLAnchorElement>("a.is-current, a[href]")
        ?.focus({ preventScroll: true });
    } else {
      setExplorerHidden(true);
    }
  });
});

document.querySelectorAll<HTMLElement>("[data-close-explorer]").forEach(button => {
  button.addEventListener("click", closeExplorer);
});

fileExplorer?.addEventListener("click", event => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
  if (link && window.matchMedia("(max-width: 760px)").matches) closeExplorer();
});

/* ── Global keyboard ── */

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    // Layered Escape: exit transient mode first, then close explorer, then close help.
    if (state.mode !== "NORMAL") {
      closeTransientMode();
      return;
    }
    if (!document.documentElement.classList.contains("explorer-hidden")) {
      closeExplorer();
      return;
    }
    hideHelp();
    return;
  }

  if (state.mode === "NORMAL") handleNormalKey(event);
});

/* ── Bufferline clicks ── */

bufferline?.addEventListener("click", event => {
  const closeButton = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-close-buffer]"
  );
  const bufferLink = (event.target as HTMLElement).closest<HTMLAnchorElement>(
    ".buffer-tab a[href]"
  );

  if (closeButton) {
    event.preventDefault();
    event.stopPropagation();
    void closeBuffer(closeButton.dataset.closeBuffer ?? "");
    return;
  }

  if (bufferLink && normalizePath(bufferLink.href) === window.location.pathname) {
    event.preventDefault();
    return;
  }

  if (bufferLink) {
    event.preventDefault();
    void navigateToBuffer(bufferLink.href);
  }
});

/* ── History ── */

window.addEventListener("popstate", () => {
  window.location.reload();
});

/* ── Custom events ── */

window.addEventListener("linewise:list-updated", event => {
  const count = (event as CustomEvent<{ count: number }>).detail?.count;
  syncSelectableItemCount();
  select(0, false, false);
  if (typeof count === "number") setStatus(`${count} matches`);
});

/* ── Scroll progress ── */

window.addEventListener("scroll", () => {
  if (selectableItemCount || state.mode !== "NORMAL") return;

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.round((window.scrollY / scrollable) * 100) : 100;
  setStatus(`${progress}%`);
});

activeScroller()?.addEventListener("scroll", () => {
  if (selectableItemCount || state.mode !== "NORMAL") return;

  const scroller = activeScroller();
  if (!scroller) return;

  const scrollable = scroller.scrollHeight - scroller.clientHeight;
  const progress = scrollable > 0 ? Math.round((scroller.scrollTop / scrollable) * 100) : 100;
  setStatus(`${progress}%`);
});

/* ── Startup ── */

const initialSearchInput = document.querySelector<HTMLInputElement>("#search");

if (window.matchMedia("(max-width: 760px)").matches) {
  setExplorerHidden(true);
} else {
  // On desktop, restore persisted state first; default is visible.
  let hidden = false;
  try {
    hidden = localStorage.getItem("linewise:explorer-hidden") === "1";
  } catch {
    /* noop */
  }
  setExplorerHidden(hidden);
}

if (initialSearchInput && window.location.pathname === "/find/") {
  syncBuffers();
  initializeWorkspace();
  setMode("NORMAL");
} else {
  syncBuffers();
  setMode("NORMAL");
  initializeWorkspace();
}

document.documentElement.classList.remove("app-loading");
