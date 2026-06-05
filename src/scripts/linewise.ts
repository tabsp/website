type Mode = "NORMAL" | "COMMAND" | "SEARCH";

const state = {
  mode: "NORMAL" as Mode,
  selectedIndex: 0,
  suggestionIndex: 0,
  awaitingSecondG: false
};

const commandInput = document.querySelector<HTMLInputElement>("[data-command-input]");
const commandBar = document.querySelector<HTMLElement>(".command-bar");
const commandForm = document.querySelector<HTMLFormElement>("[data-command-form]");
const commandSuggestions = document.querySelector<HTMLElement>("[data-command-suggestions]");
const commandPrompt = document.querySelector<HTMLElement>(".prompt");
const statusMode = document.querySelector<HTMLElement>("[data-status-mode]");
const statusMeta = document.querySelector<HTMLElement>("[data-status-meta]");
const bufferline = document.querySelector<HTMLElement>("[data-bufferline]");
const fileExplorer = document.querySelector<HTMLElement>(".file-explorer");
const openExplorerButtons = document.querySelectorAll<HTMLButtonElement>("[data-open-explorer]");
const closePaletteButton = document.querySelector<HTMLButtonElement>("[data-close-palette]");

interface BufferTab {
  href: string;
  label: string;
}

interface PaletteItem {
  command: string;
  description: string;
  href?: string;
  location?: string;
  title?: string;
  type?: string;
}

const bufferStoreKey = "linewise:buffers";
const commands = [
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
  { command: "ex", description: "toggle file explorer" }
] satisfies PaletteItem[];
const searchIndex = readSearchIndex();
let currentSuggestions: PaletteItem[] = [];
let searchInputCleanup: AbortController | undefined;
let listFilterCleanup: AbortController | undefined;
let navigationToken = 0;
let selectableItemCount = 0;

function items() {
  return [...document.querySelectorAll<HTMLElement>("[data-linewise-item]")].filter(
    (item) => item.offsetParent !== null
  );
}

function titleFor(item: HTMLElement) {
  return item.dataset.linewiseTitle ?? item.textContent?.trim() ?? "item";
}

function syncSelectableItemCount() {
  selectableItemCount = items().length;
}

function setMode(mode: Mode) {
  state.mode = mode;
  document.body.dataset.mode = mode.toLowerCase();
  if (statusMode) statusMode.textContent = mode;
  if (commandPrompt) commandPrompt.textContent = mode === "SEARCH" ? "/" : ":";
  if (commandInput) {
    commandInput.readOnly = mode === "NORMAL";
  }
}

function setStatus(text?: string) {
  if (!statusMeta) return;
  statusMeta.textContent = text ?? statusMeta.textContent;
}

function updateCommandSuggestions() {
  if (!commandSuggestions || !commandInput) return;

  const rawValue = commandInput.value.trim().replace(/^:/, "");
  currentSuggestions = buildSuggestions(rawValue);
  state.suggestionIndex = Math.min(state.suggestionIndex, Math.max(0, currentSuggestions.length - 1));

  commandSuggestions.innerHTML = currentSuggestions
    .map((entry, index) => {
      const isActive = index === state.suggestionIndex;
      return `
        <button type="button" class="${isActive ? "is-active" : ""}" data-command-suggestion="${escapeHtml(entry.command)}" data-suggestion-index="${index}">
          <span>:${escapeHtml(entry.command)}</span>
          <small>${escapeHtml(entry.description)}</small>
          <em>${escapeHtml(entry.location ?? entry.type ?? "cmd")}</em>
        </button>
      `;
    })
    .join("");
}

function buildSuggestions(rawValue: string) {
  const needle = rawValue.toLowerCase();
  return commands.filter((entry) => entry.command.startsWith(needle)).slice(0, 8);
}

function buildSearchSuggestions(rawValue: string) {
  const query = rawValue.trim().toLowerCase();
  const matches = query
    ? searchIndex.filter((entry) => entry.keywords.join(" ").toLowerCase().includes(query))
    : searchIndex;

  return matches.slice(0, 8).map((entry) => ({
    command: query,
    description: entry.description,
    href: entry.href,
    location: entry.location,
    title: entry.title,
    type: entry.type
  }));
}

function readSearchIndex() {
  const node = document.querySelector<HTMLScriptElement>("#linewise-search-index");
  if (!node?.textContent) return [] as Array<PaletteItem & { keywords: string[] }>;

  try {
    return JSON.parse(node.textContent) as Array<PaletteItem & { keywords: string[] }>;
  } catch {
    return [];
  }
}

function moveSuggestion(delta: number) {
  if (!currentSuggestions.length) return;
  state.suggestionIndex = (state.suggestionIndex + delta + currentSuggestions.length) % currentSuggestions.length;
  if (state.mode === "SEARCH") updateSearchSuggestions();
  else updateCommandSuggestions();
}

function updateSearchSuggestions() {
  if (!commandSuggestions || !commandInput) return;

  currentSuggestions = buildSearchSuggestions(commandInput.value);
  state.suggestionIndex = Math.min(state.suggestionIndex, Math.max(0, currentSuggestions.length - 1));
  commandSuggestions.innerHTML = currentSuggestions
    .map((entry, index) => {
      const isActive = index === state.suggestionIndex;
      return `
        <button type="button" class="${isActive ? "is-active" : ""}" data-command-suggestion="${escapeHtml(entry.title ?? entry.command)}" data-suggestion-index="${index}">
          <span>${escapeHtml(entry.title ?? entry.command)}</span>
          <small>${escapeHtml(entry.description)}</small>
          <em>${escapeHtml(entry.location ?? entry.type ?? "match")}</em>
        </button>
      `;
    })
    .join("");

  const active = activeSuggestion();
  setStatus(currentSuggestions.length ? `${state.suggestionIndex + 1}/${currentSuggestions.length} ${active?.title ?? "match"}` : "0 matches");
}

function activeSuggestion() {
  return currentSuggestions[state.suggestionIndex];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readBuffers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(bufferStoreKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isBufferTab).filter(isPersistentBuffer);
  } catch {
    return [];
  }
}

function writeBuffers(buffers: BufferTab[]) {
  try {
    localStorage.setItem(bufferStoreKey, JSON.stringify(buffers.filter(isPersistentBuffer).slice(-7)));
  } catch {
    // Storage can be unavailable in private or embedded contexts; keep navigation working.
  }
}

function currentBuffer() {
  if (!bufferline) return undefined;
  return {
    href: bufferline.dataset.currentHref || window.location.pathname,
    label: bufferline.dataset.currentBuffer || "buffer"
  };
}

function renderBuffers(buffers: BufferTab[]) {
  if (!bufferline) return;

  const current = currentBuffer();
  const persistentBuffers = buffers.filter(isPersistentBuffer);
  const displayBuffers = persistentBuffers.map((buffer) => current?.href === buffer.href ? current : buffer);
  const rendered =
    current && isPersistentBuffer(current) && !displayBuffers.some((buffer) => buffer.href === current.href)
      ? [...displayBuffers, current]
      : displayBuffers;

  bufferline.innerHTML = rendered
    .map((buffer) => {
      const isCurrent = current?.href === buffer.href;
      const href = escapeHtml(buffer.href);
      const label = escapeHtml(buffer.label);
      return `
        <div class="buffer-tab${isCurrent ? " is-current" : ""}" data-buffer-tab data-buffer-label="${label}" title="${label}">
          <a href="${href}" title="${label}">
            <span class="tab-modified">${isCurrent ? "%a" : "buf"}</span>
            <span>${label}</span>
          </a>
          <button class="tab-close" type="button" aria-label="Close ${label}" data-close-buffer="${href}">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </button>
        </div>
      `;
    })
    .join("");

}

function isPersistentBuffer(buffer: BufferTab) {
  return buffer.href === "/" || buffer.href.startsWith("/posts/");
}

function isBufferTab(value: unknown): value is BufferTab {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as BufferTab).href === "string" &&
    typeof (value as BufferTab).label === "string"
  );
}

function normalizePath(href: string) {
  return new URL(href, window.location.origin).pathname;
}

async function navigateToBuffer(href: string, replace = false) {
  const token = navigationToken + 1;
  navigationToken = token;
  const target = new URL(href, window.location.origin);
  if (target.origin !== window.location.origin || !isPersistentBuffer({ href: target.pathname, label: "" })) {
    window.location.href = href;
    return;
  }

  document.body.classList.add("is-switching-buffer");
  try {
    const response = await fetch(target.pathname);
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
      window.location.href = target.pathname;
      return;
    }

    const html = await response.text();
    if (token !== navigationToken) return;

    const nextDocument = new DOMParser().parseFromString(html, "text/html");
    const nextWorkspace = nextDocument.querySelector<HTMLElement>("#main-content");
    const workspace = document.querySelector<HTMLElement>("#main-content");
    const nextBufferline = nextDocument.querySelector<HTMLElement>("[data-bufferline]");
    const nextStatusFile = nextDocument.querySelector<HTMLElement>("[data-status-file]");
    const nextStatusMeta = nextDocument.querySelector<HTMLElement>("[data-status-meta]");
    const nextTitle = nextDocument.querySelector("title")?.textContent;

    if (!workspace || !nextWorkspace || !nextBufferline || !bufferline) {
      window.location.href = target.pathname;
      return;
    }

    const applyUpdate = () => {
      workspace.innerHTML = nextWorkspace.innerHTML;
      document.body.dataset.routeType = nextDocument.body.dataset.routeType ?? "buffer";
      bufferline.dataset.currentBuffer = nextBufferline.dataset.currentBuffer;
      bufferline.dataset.currentHref = nextBufferline.dataset.currentHref;
      if (nextStatusFile) {
        const statusFile = document.querySelector<HTMLElement>("[data-status-file]")!;
        statusFile.textContent = nextStatusFile.textContent;
        statusFile.title = nextStatusFile.textContent ?? "";
      }
      if (nextStatusMeta) setStatus(nextStatusMeta.textContent ?? "");
      if (nextTitle) document.title = nextTitle;
      const nextCurrent = currentBuffer();
      const storedBuffers = readBuffers();
      if (nextCurrent && isPersistentBuffer(nextCurrent)) {
        const nextIndex = storedBuffers.findIndex((buffer) => buffer.href === nextCurrent.href || buffer.label === nextCurrent.label);
        if (nextIndex >= 0) storedBuffers[nextIndex] = nextCurrent;
        else storedBuffers.push(nextCurrent);
        writeBuffers(storedBuffers);
      }
      renderBuffers(readBuffers());
      setMode("NORMAL");
      initializeWorkspace();
      activeScroller()?.scrollTo({ top: 0 });
    };

    applyUpdate();

    if (token !== navigationToken) return;
    if (replace) history.replaceState({}, "", target.pathname);
    else history.pushState({}, "", target.pathname);
  } catch {
    window.location.href = target.pathname;
  } finally {
    if (token === navigationToken) document.body.classList.remove("is-switching-buffer");
  }
}

function syncBuffers() {
  const current = currentBuffer();
  if (!current) return;

  const buffers = readBuffers();
  if (isPersistentBuffer(current)) {
    const currentIndex = buffers.findIndex((buffer) => buffer.href === current.href || buffer.label === current.label);
    if (currentIndex >= 0) buffers[currentIndex] = current;
    else buffers.push(current);
  }

  writeBuffers(buffers);
  const storedBuffers = readBuffers();
  renderBuffers(storedBuffers);
}

function initializeListFilter() {
  listFilterCleanup?.abort();
  listFilterCleanup = new AbortController();

  const filterInput = document.querySelector<HTMLInputElement>("[data-list-filter]");
  const filterItems = [...document.querySelectorAll<HTMLElement>("[data-filter-key]")];
  if (!filterInput || !filterItems.length) return;

  const update = () => {
    const query = filterInput.value.trim().toLowerCase();
    let count = 0;
    filterItems.forEach((item) => {
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

function renderFindResults(matches: Array<PaletteItem & { keywords?: string[] }>) {
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

  results.innerHTML = matches
    .map((entry, index) => `
      <li>
        <a href="${escapeHtml(entry.href ?? "#")}" class="find-row" data-linewise-item data-linewise-title="${escapeHtml(entry.title ?? entry.command)}">
          <span class="qf-index">${index + 1}</span>
          <span class="qf-location">${escapeHtml(entry.location ?? entry.type ?? "match")}</span>
          <span class="qf-text">
            <strong>${escapeHtml(entry.title ?? entry.command)}</strong>
            <span>${escapeHtml(entry.description)}</span>
          </span>
        </a>
      </li>
    `)
    .join("");
}

function initializeFindSearch() {
  searchInputCleanup?.abort();
  searchInputCleanup = new AbortController();

  const input = document.querySelector<HTMLInputElement>("#search");
  if (!input) return;

  const update = () => {
    const term = input.value.trim().toLowerCase();
    const matches = term
      ? searchIndex.filter((entry) => entry.keywords.join(" ").toLowerCase().includes(term))
      : searchIndex;

    renderFindResults(matches);
    select(0, false, false);
    setStatus(`${matches.length} matches`);
  };

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  if (query) input.value = query;

  input.addEventListener("input", update, { signal: searchInputCleanup.signal });
  input.addEventListener("focus", () => {
    if (statusMode) statusMode.textContent = "INSERT";
    if (window.matchMedia("(max-width: 760px)").matches) {
      window.setTimeout(() => window.scrollTo({ top: 0, left: 0 }), 0);
    }
  }, { signal: searchInputCleanup.signal });
  input.addEventListener("blur", () => {
    if (statusMode) statusMode.textContent = "NORMAL";
  }, { signal: searchInputCleanup.signal });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeTransientMode();
    } else if (event.key === "ArrowDown" || event.key === "j" || (event.key === "n" && event.ctrlKey)) {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp" || event.key === "k" || (event.key === "p" && event.ctrlKey)) {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      openSelected();
    }
  }, { signal: searchInputCleanup.signal });
  update();
}

function initializeWorkspace() {
  initializeListFilter();
  initializeFindSearch();
  updateExplorerState();
  syncSelectableItemCount();
  select(0, false);
  document.querySelector<HTMLElement>(".buffer-tab.is-current")?.scrollIntoView({ inline: "center", block: "nearest" });
}

function updateExplorerState() {
  document.querySelectorAll<HTMLAnchorElement>(".tree a[href]").forEach((link) => {
    const isCurrent = normalizePath(link.href) === window.location.pathname;
    link.classList.toggle("is-current", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function renderedBuffers() {
  return [...document.querySelectorAll<HTMLElement>("[data-buffer-tab]")]
    .map((tab) => {
      const link = tab.querySelector<HTMLAnchorElement>("a[href]");
      return {
        href: link?.getAttribute("href") ?? "/",
        label: tab.dataset.bufferLabel ?? link?.textContent?.trim() ?? "buffer"
      };
    })
    .filter((buffer) => buffer.label);
}

async function closeBuffer(href: string, navigateWhenCurrent = true) {
  const current = currentBuffer();
  const existingBuffers = renderedBuffers().filter(isPersistentBuffer);
  const closedIndex = existingBuffers.findIndex((buffer) => buffer.href === href);
  const buffers = existingBuffers.filter((buffer) => buffer.href !== href);
  writeBuffers(buffers);

  if (navigateWhenCurrent && current?.href === href) {
    const nextBuffer = existingBuffers[closedIndex - 1] ?? existingBuffers[closedIndex + 1];
    if (!nextBuffer && current.href === "/") {
      writeBuffers([current]);
      renderBuffers([current]);
      return;
    }

    await navigateToBuffer(nextBuffer?.href ?? "/", true);
    return;
  }

  renderBuffers(buffers);
}

function quitCurrentBuffer() {
  const current = currentBuffer();
  if (!current) {
    window.location.href = "/";
    return;
  }

  if (!isPersistentBuffer(current)) {
    window.location.href = "/";
    return;
  }

  void closeBuffer(current.href);
}

function select(index: number, scroll = true, focus = true) {
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

function move(delta: number) {
  select(state.selectedIndex + delta);
}

function openSelected() {
  const active = items()[state.selectedIndex] as HTMLAnchorElement | undefined;
  if (active?.href) window.location.href = active.href;
}

function openCommandLine(initialValue = "") {
  if (!commandInput) return;
  setMode("COMMAND");
  commandInput.value = initialValue;
  commandInput.focus();
  commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
  updateCommandSuggestions();
}

function openSearch(initialValue = "") {
  if (!commandInput) return;
  setMode("SEARCH");
  commandInput.value = initialValue;
  commandInput.focus();
  commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
  updateSearchSuggestions();
}

function closeTransientMode() {
  setMode("NORMAL");
  if (commandInput) commandInput.value = "";
  commandInput?.blur();
  document.querySelector<HTMLInputElement>("#search")?.blur();
  if (commandSuggestions) commandSuggestions.innerHTML = "";
}

function setExplorerHidden(hidden: boolean) {
  document.documentElement.classList.toggle("explorer-hidden", hidden);
  document.documentElement.classList.toggle("explorer-open", !hidden);
  document.body.classList.toggle("explorer-hidden", hidden);
  document.body.classList.toggle("explorer-open", !hidden);
  openExplorerButtons.forEach((btn) => btn.setAttribute("aria-expanded", hidden ? "false" : "true"));
}

function openExplorer() {
  setExplorerHidden(false);
  fileExplorer?.querySelector<HTMLAnchorElement>("a.is-current, a[href]")?.focus({ preventScroll: true });
}

function closeExplorer() {
  setExplorerHidden(true);
}

function activeScroller() {
  return document.querySelector<HTMLElement>(".editor-main");
}

function scrollWorkspace(delta: number) {
  const scroller = activeScroller();
  if (!scroller) return;
  scroller.scrollBy({ top: delta, behavior: "smooth" });
}

function pageSize(multiplier = 0.85) {
  return (activeScroller()?.clientHeight ?? window.innerHeight) * multiplier;
}

function showHelp() {
  document.body.classList.toggle("show-help", true);
  setStatus("help");
}

function hideHelp() {
  document.body.classList.toggle("show-help", false);
}

function quitContext() {
  quitCurrentBuffer();
}

function runCommand(rawCommand: string) {
  const command = rawCommand.trim().replace(/^:/, "").toLowerCase();
  const suggestion = activeSuggestion();
  closeTransientMode();

  if (suggestion?.href && suggestion.command === command) window.location.href = suggestion.href;
  else if (command === "posts" || command === "post" || command === "ls" || command === "buffers") window.location.href = "/";
  else if (command === "oldfiles" || command === "archive") window.location.href = "/archive/";
  else if (command === "tags") window.location.href = "/tags/";
  else if (command === "search" || command === "find") window.location.href = "/find/";
  else if (command === "help" || command === "h") window.location.href = "/help/";
  else if (command === "q" || command === "quit") quitContext();
  else if (command === "explore" || command === "ex") {
    document.documentElement.classList.contains("explorer-hidden") ? openExplorer() : closeExplorer();
  }
  else if (command === "exploreopen") openExplorer();
  else if (command === "exploreclose") closeExplorer();
  else setStatus(`not an editor command: ${command || "(empty)"}`);
}

function runSelectedCommand() {
  const suggestion = activeSuggestion();
  const command = suggestion?.command ?? commandInput?.value ?? "";
  runCommand(command);
}

function handleNormalKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  const isTyping =
    target?.tagName === "INPUT" ||
    target?.tagName === "TEXTAREA" ||
    target?.isContentEditable;

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
        window.setTimeout(() => {
          state.awaitingSecondG = false;
        }, 700);
      }
      break;
    case "/":
      event.preventDefault();
      if (window.location.pathname === "/find/") {
        const searchInput = document.querySelector<HTMLInputElement>("#search");
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
      quitContext();
      break;
    case "?":
      event.preventDefault();
      window.location.href = "/help/";
      break;
  }
}

commandForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.mode === "SEARCH") {
    const suggestion = activeSuggestion();
    window.location.href = suggestion?.href ?? `/find/?q=${encodeURIComponent(commandInput?.value ?? "")}`;
  } else {
    runSelectedCommand();
  }
});

commandInput?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeTransientMode();
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (state.mode === "SEARCH") {
      const suggestion = activeSuggestion();
      window.location.href = suggestion?.href ?? `/find/?q=${encodeURIComponent(commandInput.value)}`;
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
  if (state.mode === "SEARCH") updateSearchSuggestions();
  else updateCommandSuggestions();
});

commandInput?.addEventListener("click", (event) => {
  if (state.mode !== "NORMAL") return;
  event.preventDefault();
  openCommandLine("");
});

function closePaletteFromBackdrop(event: Event) {
  if (state.mode === "NORMAL") return;
  const target = event.target as HTMLElement;
  if (target.closest(".command-input")) return;
  if (target.closest(".command-suggestions")) return;
  event.preventDefault();
  closeTransientMode();
}

closePaletteButton?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  closeTransientMode();
});
document.addEventListener("pointerdown", closePaletteFromBackdrop, true);

commandSuggestions?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-command-suggestion]");
  if (!button || !commandInput) return;

  state.suggestionIndex = Number(button.dataset.suggestionIndex ?? 0);
  const suggestion = activeSuggestion();
  if (state.mode === "SEARCH" && suggestion?.href) {
    window.location.href = suggestion.href;
    return;
  }

  commandInput.value = state.mode === "SEARCH"
    ? commandInput.value
    : suggestion?.command ?? button.dataset.commandSuggestion ?? "";
  commandInput.focus();
  if (state.mode === "SEARCH") updateSearchSuggestions();
  else updateCommandSuggestions();
});

openExplorerButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (document.documentElement.classList.contains("explorer-hidden")) openExplorer();
    else closeExplorer();
  });
});
document.querySelectorAll<HTMLElement>("[data-close-explorer]").forEach((button) => {
  button.addEventListener("click", closeExplorer);
});
fileExplorer?.addEventListener("click", (event) => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
  if (link && window.matchMedia("(max-width: 760px)").matches) closeExplorer();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideHelp();
    closeExplorer();
    closeTransientMode();
    return;
  }

  if (state.mode === "NORMAL") handleNormalKey(event);
});

bufferline?.addEventListener("click", (event) => {
  const closeButton = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-close-buffer]");
  const bufferLink = (event.target as HTMLElement).closest<HTMLAnchorElement>(".buffer-tab a[href]");

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

window.addEventListener("popstate", () => {
  window.location.reload();
});

window.addEventListener("linewise:list-updated", (event) => {
  const count = (event as CustomEvent<{ count: number }>).detail?.count;
  syncSelectableItemCount();
  select(0, false, false);
  if (typeof count === "number") setStatus(`${count} matches`);
});

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

const initialSearchInput = document.querySelector<HTMLInputElement>("#search");

if (window.matchMedia("(max-width: 760px)").matches) {
  setExplorerHidden(true);
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
