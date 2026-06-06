/**
 * Client-side search index, /find/ page rendering, inline list filtering.
 */
import { type PaletteItem, setStatus, statusModeEl } from "./state";
import { select, move, openSelected } from "./keyboard";
import { closeTransientMode } from "./commands";

let searchInputCleanup: AbortController | undefined;
let listFilterCleanup: AbortController | undefined;

/* ── Search index ── */

export function readSearchIndex() {
  const node = document.querySelector<HTMLScriptElement>("#linewise-search-index");
  if (!node?.textContent) return [] as Array<PaletteItem & { keywords: string[] }>;

  try {
    return JSON.parse(node.textContent) as Array<PaletteItem & { keywords: string[] }>;
  } catch {
    return [];
  }
}

export function buildSearchSuggestions(rawValue: string) {
  const query = rawValue.trim().toLowerCase();
  const searchIndex = readSearchIndex();
  const matches = query
    ? searchIndex.filter(entry => entry.keywords.join(" ").toLowerCase().includes(query))
    : searchIndex;

  return matches.slice(0, 8).map(entry => ({
    command: query,
    description: entry.description,
    href: entry.href,
    location: entry.location,
    title: entry.title,
    type: entry.type,
  }));
}

/* ── /find/ page rendering ── */

export function renderFindResults(matches: Array<PaletteItem & { keywords?: string[] }>) {
  const results = document.querySelector<HTMLOListElement>("#results");
  if (!results) return;

  if (!matches.length) {
    results.innerHTML = `
      <li>
        <div class="find-row is-empty">
          <span class="qf-index">0</span>
          <span class="qf-location">find</span>
          <span class="qf-text">
            <strong>Pattern not found</strong>
            <span>No posts or tags match this query.</span>
          </span>
        </div>
      </li>
    `;
    return;
  }

  const escape = (v: string) =>
    v
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  results.innerHTML = matches
    .map(
      (entry, index) => `
      <li>
        <a href="${escape(entry.href ?? "#")}" class="find-row" data-linewise-item data-linewise-title="${escape(entry.title ?? entry.command)}">
          <span class="qf-index">${index + 1}</span>
          <span class="qf-location">${escape(entry.location ?? entry.type ?? "match")}</span>
          <span class="qf-text">
            <strong>${escape(entry.title ?? entry.command)}</strong>
            <span>${escape(entry.description)}</span>
          </span>
        </a>
      </li>
    `
    )
    .join("");
}

export function initializeFindSearch() {
  searchInputCleanup?.abort();
  searchInputCleanup = new AbortController();

  const input = document.querySelector<HTMLInputElement>("#search");
  if (!input) return;

  const update = () => {
    const term = input.value.trim().toLowerCase();
    const searchIndex = readSearchIndex();
    const matches = term
      ? searchIndex.filter(entry => entry.keywords.join(" ").toLowerCase().includes(term))
      : searchIndex;

    renderFindResults(matches);
    select(0, false, false);
    setStatus(`${matches.length} matches`);
  };

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  if (query) input.value = query;

  input.addEventListener("input", update, { signal: searchInputCleanup.signal });
  input.addEventListener(
    "focus",
    () => {
      const sm = statusModeEl();
      if (sm) sm.textContent = "INSERT";
      if (window.matchMedia("(max-width: 760px)").matches) {
        window.setTimeout(() => window.scrollTo({ top: 0, left: 0 }), 0);
      }
    },
    { signal: searchInputCleanup.signal }
  );
  input.addEventListener(
    "blur",
    () => {
      const sm = statusModeEl();
      if (sm) sm.textContent = "NORMAL";
    },
    { signal: searchInputCleanup.signal }
  );
  input.addEventListener(
    "keydown",
    event => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeTransientMode();
      } else if (
        event.key === "ArrowDown" ||
        event.key === "j" ||
        (event.key === "n" && event.ctrlKey)
      ) {
        event.preventDefault();
        move(1);
      } else if (
        event.key === "ArrowUp" ||
        event.key === "k" ||
        (event.key === "p" && event.ctrlKey)
      ) {
        event.preventDefault();
        move(-1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        openSelected();
      }
    },
    { signal: searchInputCleanup.signal }
  );
  update();
}

/* ── Inline list filter (tags page) ── */

export function initializeListFilter() {
  listFilterCleanup?.abort();
  listFilterCleanup = new AbortController();

  const filterInput = document.querySelector<HTMLInputElement>("[data-list-filter]");
  const filterItems = [...document.querySelectorAll<HTMLElement>("[data-filter-key]")];
  if (!filterInput || !filterItems.length) return;

  const update = () => {
    const query = filterInput.value.trim().toLowerCase();
    let count = 0;
    filterItems.forEach(item => {
      const visible = !query || (item.dataset.filterKey ?? "").toLowerCase().includes(query);
      const target = item.closest("li") ?? item;
      target.toggleAttribute("hidden", !visible);
      if (visible) count += 1;
    });
    select(0, false, false);
    setStatus(`${count} matches`);
  };

  filterInput.addEventListener("input", update, { signal: listFilterCleanup.signal });
}

/* ── Inline search suggestions ── */

export function updateSearchSuggestions() {
  // Delegate to the unified renderer in commands.ts to avoid duplication.
  // Delegate to the unified renderer in commands.ts
}
