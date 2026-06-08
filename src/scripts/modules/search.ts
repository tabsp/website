/**
 * Client-side search index, /find/ page rendering, inline list filtering.
 */
import { type PaletteItem, setMode, setStatus } from "./state";
import { select, move, openSelected } from "./keyboard";
import { closeTransientMode } from "./commands";

let searchInputCleanup: AbortController | undefined;
let listFilterCleanup: AbortController | undefined;

/* ── Fuzzy scoring ── */

/**
 * fzf-style fuzzy score: characters of query must appear in order in target.
 * Returns a score (higher = better match), or 0 if no match.
 */
export function fuzzyScore(query: string, target: string) {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 0;
  let score = 0;
  let qi = 0;
  let prevTi = -2;
  let consecutive = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 1;
      if (ti === prevTi + 1) {
        consecutive++;
        score += consecutive * 3;
      } else {
        consecutive = 0;
      }
      if (ti === 0 || t[ti - 1] === " " || t[ti - 1] === "-" || t[ti - 1] === "_") {
        score += 4;
      }
      if (ti < 10) score += Math.max(0, 10 - ti) * 0.5;
      prevTi = ti;
      qi++;
    }
  }
  return qi === q.length ? score : 0;
}

/**
 * Multi-word fuzzy match: every word in query must match target.
 * Returns total score (0 if any word fails).
 */
export function fuzzyScoreMulti(query: string, target: string) {
  const words = query
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);
  if (words.length === 0) return 1;
  let total = 0;
  for (const word of words) {
    const s = fuzzyScore(word, target);
    if (s === 0) return 0;
    total += s;
  }
  return total;
}

/**
 * Highlight fuzzy-matched characters in text with <mark> tags.
 */
export function highlightMatch(text: string, query: string) {
  if (!query) return escapeHtml(text);
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let out = "";
  let qi = 0;
  let last = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      out += escapeHtml(text.slice(last, ti));
      out += `<mark>${escapeHtml(text[ti])}</mark>`;
      last = ti + 1;
      qi++;
    }
  }
  out += escapeHtml(text.slice(last));
  return out;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ── Scored search ── */

export function searchWithScores(
  query: string,
  index: Array<PaletteItem & { keywords: string[] }>
) {
  return index
    .map(entry => ({
      entry,
      score: fuzzyScoreMulti(query, entry.keywords.join(" ")),
    }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

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
  const scored = query
    ? searchWithScores(query, searchIndex)
    : searchIndex.map(e => ({ entry: e, score: 1 }));

  return scored.slice(0, 8).map(r => ({
    command: query,
    description: r.entry.description,
    href: r.entry.href,
    location: r.entry.location,
    title: r.entry.title,
    type: r.entry.type,
  }));
}

/* ── /find/ page rendering ── */

export function renderFindResults(
  matches: Array<PaletteItem & { keywords?: string[] }>,
  query: string
) {
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
            <strong>${highlightMatch(entry.title ?? entry.command, query)}</strong>
            <span>${highlightMatch(entry.description, query)}</span>
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

  const input = document.querySelector<HTMLInputElement>("input#search");
  if (!input) return;

  const update = () => {
    const term = input.value.trim().toLowerCase();
    const searchIndex = readSearchIndex();
    const scored = term
      ? searchWithScores(term, searchIndex)
      : searchIndex.map(e => ({ entry: e, score: 1 }));
    const matches = scored.slice(0, 50).map(r => r.entry);

    renderFindResults(matches, term);
    select(0, false, false);
    if (term) setStatus(`${scored.length} matches`);
  };

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  if (query) input.value = query;

  input.addEventListener("input", update, { signal: searchInputCleanup.signal });
  input.addEventListener(
    "focus",
    () => {
      setMode("INSERT");
      if (window.matchMedia("(max-width: 760px)").matches) {
        window.setTimeout(() => window.scrollTo({ top: 0, left: 0 }), 0);
      }
    },
    { signal: searchInputCleanup.signal }
  );
  input.addEventListener(
    "blur",
    () => {
      setMode("NORMAL");
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
