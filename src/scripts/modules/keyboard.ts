/**
 * Normal-mode keyboard handling, list selection, scrolling, and workspace init.
 */
import { state, setStatus, normalizePath } from "./state";
import { openCommandLine, openSearch } from "./commands";
import { quitCurrentBuffer } from "./buffers";
import { initializeListFilter, initializeFindSearch } from "./search";

/* ── Utility ── */

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ── Selectable items ── */

export let selectableItemCount = 0;
let ggTimeoutId: number | undefined;

export function items() {
  return [...document.querySelectorAll<HTMLElement>("[data-linewise-item]")].filter(
    item => item.offsetParent !== null
  );
}

function titleFor(item: HTMLElement) {
  return item.dataset.linewiseTitle ?? item.textContent?.trim() ?? "item";
}

export function syncSelectableItemCount() {
  selectableItemCount = items().length;
}

/* ── Selection ── */

export function select(index: number, scroll = true, focus = true) {
  const listItems = items();
  if (!listItems.length) return;

  state.selectedIndex = Math.max(0, Math.min(index, listItems.length - 1));

  listItems.forEach((item, itemIndex) => {
    const isActive = itemIndex === state.selectedIndex;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("tabindex", isActive ? "0" : "-1");
    item.setAttribute("aria-current", isActive ? "true" : "false");
  });

  const active = listItems[state.selectedIndex];
  if (focus) active.focus({ preventScroll: true });
  if (scroll) active.scrollIntoView({ block: "nearest" });
  setStatus(`${state.selectedIndex + 1}/${listItems.length} ${titleFor(active)}`);
}

export function move(delta: number) {
  select(state.selectedIndex + delta);
}

export function openSelected() {
  const active = items()[state.selectedIndex] as HTMLAnchorElement | undefined;
  if (active?.href) window.location.href = active.href;
}

/* ── Scrolling ── */

export function activeScroller() {
  return document.querySelector<HTMLElement>(".editor-main");
}
export function reportScrollProgress() {
  if (selectableItemCount || state.mode !== "NORMAL") return;
  const scroller = activeScroller();
  if (!scroller) return;
  const scrollable = scroller.scrollHeight - scroller.clientHeight;
  const progress = scrollable > 0 ? Math.round((scroller.scrollTop / scrollable) * 100) : 100;
  setStatus(`${progress}%`);
}

function scrollWorkspace(delta: number) {
  const scroller = activeScroller();
  if (!scroller) return;
  scroller.scrollBy({ top: delta, behavior: "smooth" });
}

function pageSize(multiplier = 0.85) {
  return (activeScroller()?.clientHeight ?? window.innerHeight) * multiplier;
}

/* ── Help panel ── */

export function showHelp() {
  document.body.classList.toggle("show-help", true);
  setStatus("help");
}

export function hideHelp() {
  document.body.classList.toggle("show-help", false);
}

/* ── Normal-mode keyboard handler ── */

export function handleNormalKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  const isTyping =
    target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

  if (isTyping) return;

  if (event.key !== "g") state.awaitingSecondG = false;

  switch (event.key) {
    case "j":
    case "l":
    case "ArrowDown":
    case "ArrowRight":
      event.preventDefault();
      hideHelp();
      if (items().length) move(1);
      else scrollWorkspace(56);
      break;
    case "k":
    case "h":
    case "ArrowUp":
    case "ArrowLeft":
      event.preventDefault();
      hideHelp();
      if (items().length) move(-1);
      else scrollWorkspace(-56);
      break;
    case "d":
      if (event.ctrlKey) {
        event.preventDefault();
        scrollWorkspace(pageSize(0.5));
      }
      break;
    case "u":
      if (event.ctrlKey) {
        event.preventDefault();
        scrollWorkspace(-pageSize(0.5));
      }
      break;
    case "f":
      if (event.ctrlKey) {
        event.preventDefault();
        scrollWorkspace(pageSize());
      }
      break;
    case "b":
      event.preventDefault();
      if (event.ctrlKey) scrollWorkspace(-pageSize());
      else window.location.href = "/";
      break;
    case "Enter":
      event.preventDefault();
      openSelected();
      break;
    case "G":
      event.preventDefault();
      if (items().length) select(items().length - 1);
      else activeScroller()?.scrollTo({ top: activeScroller()?.scrollHeight, behavior: "smooth" });
      break;
    case "g":
      event.preventDefault();
      if (state.awaitingSecondG) {
        if (items().length) select(0);
        else activeScroller()?.scrollTo({ top: 0, behavior: "smooth" });
        state.awaitingSecondG = false;
      } else {
        state.awaitingSecondG = true;
        clearTimeout(ggTimeoutId);
        ggTimeoutId = window.setTimeout(() => {
          state.awaitingSecondG = false;
        }, 700);
      }
      break;
    case "/":
      event.preventDefault();
      if (window.location.pathname === "/find/") {
        const searchInput = document.querySelector<HTMLInputElement>("input#search");
        searchInput?.focus();
        searchInput?.select();
      } else {
        openSearch();
      }
      break;
    case ":":
      event.preventDefault();
      openCommandLine("");
      break;
    case "q":
      event.preventDefault();
      hideHelp();
      quitCurrentBuffer();
      break;
    case "?":
      event.preventDefault();
      window.location.href = "/help/";
      break;
  }
}

/* ── Workspace initialization (called on every buffer switch) ── */

export function initializeWorkspace() {
  initializeListFilter();
  initializeFindSearch();

  updateExplorerState();
  syncSelectableItemCount();
  select(0, false);
  document
    .querySelector<HTMLElement>(".buffer-tab.is-current")
    ?.scrollIntoView({ inline: "center", block: "nearest" });
}

function updateExplorerState() {
  document.querySelectorAll<HTMLAnchorElement>(".tree a[href]").forEach(link => {
    const isCurrent = normalizePath(link.href) === window.location.pathname;
    link.classList.toggle("is-current", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}
