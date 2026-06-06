/**
 * Buffer management: localStorage persistence, rendering, navigation between buffers.
 */
import {
  type BufferTab,
  navigationToken,
  nextNavigationToken,
  bufferlineEl,
  mainContentEl,
  setMode,
  setStatus,
} from "./state";
import { initializeWorkspace } from "./keyboard";
import { setExplorerHidden } from "./commands";

const bufferStoreKey = "linewise:buffers";

/* ── Helpers ── */

export function isPersistentBuffer(buffer: BufferTab) {
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

function escapeAttr(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ── Read / write ── */

export function readBuffers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(bufferStoreKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isBufferTab).filter(isPersistentBuffer);
  } catch {
    return [];
  }
}

export function writeBuffers(buffers: BufferTab[]) {
  try {
    localStorage.setItem(
      bufferStoreKey,
      JSON.stringify(buffers.filter(isPersistentBuffer).slice(-7))
    );
  } catch {
    // Storage can be unavailable in private or embedded contexts; keep navigation working.
  }
}

/* ── Current buffer ── */

export function currentBuffer() {
  const bl = bufferlineEl();
  if (!bl) return undefined;
  return {
    href: bl.dataset.currentHref || window.location.pathname,
    label: bl.dataset.currentBuffer || "buffer",
  };
}

/* ── Render ── */

export function renderBuffers(buffers: BufferTab[]) {
  const bl = bufferlineEl();
  if (!bl) return;

  const current = currentBuffer();
  const persistentBuffers = buffers.filter(isPersistentBuffer);
  const displayBuffers = persistentBuffers.map(buffer =>
    current?.href === buffer.href ? current : buffer
  );
  const rendered =
    current &&
    isPersistentBuffer(current) &&
    !displayBuffers.some(buffer => buffer.href === current.href)
      ? [...displayBuffers, current]
      : displayBuffers;

  bl.innerHTML = rendered
    .map(buffer => {
      const isCurrent = current?.href === buffer.href;
      const href = escapeAttr(buffer.href);
      const label = escapeAttr(buffer.label);
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

export function renderedBuffers() {
  return [...document.querySelectorAll<HTMLElement>("[data-buffer-tab]")]
    .map(tab => {
      const link = tab.querySelector<HTMLAnchorElement>("a[href]");
      return {
        href: link?.getAttribute("href") ?? "/",
        label: tab.dataset.bufferLabel ?? link?.textContent?.trim() ?? "buffer",
      };
    })
    .filter(buffer => buffer.label);
}

/* ── Close ── */

export async function closeBuffer(href: string, navigateWhenCurrent = true) {
  const current = currentBuffer();
  const existingBuffers = renderedBuffers().filter(isPersistentBuffer);
  const closedIndex = existingBuffers.findIndex(buffer => buffer.href === href);
  const buffers = existingBuffers.filter(buffer => buffer.href !== href);
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

export function quitCurrentBuffer() {
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

/* ── Sync ── */

export function syncBuffers() {
  const current = currentBuffer();
  if (!current) return;

  const buffers = readBuffers();
  if (isPersistentBuffer(current)) {
    const currentIndex = buffers.findIndex(
      buffer => buffer.href === current.href || buffer.label === current.label
    );
    if (currentIndex >= 0) buffers[currentIndex] = current;
    else buffers.push(current);
  }

  writeBuffers(buffers);
  renderBuffers(readBuffers());
}

/* ── Client-side buffer navigation ── */

export async function navigateToBuffer(href: string, replace = false) {
  const token = nextNavigationToken();
  const target = new URL(href, window.location.origin);
  if (
    target.origin !== window.location.origin ||
    !isPersistentBuffer({ href: target.pathname, label: "" })
  ) {
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
    const workspace = mainContentEl();
    const nextBufferline = nextDocument.querySelector<HTMLElement>("[data-bufferline]");
    const nextStatusFile = nextDocument.querySelector<HTMLElement>("[data-status-file]");
    const nextStatusMeta = nextDocument.querySelector<HTMLElement>("[data-status-meta]");
    const nextTitle = nextDocument.querySelector("title")?.textContent;
    const bl = bufferlineEl();

    if (!workspace || !nextWorkspace || !nextBufferline || !bl) {
      window.location.href = target.pathname;
      return;
    }

    const applyUpdate = () => {
      workspace.innerHTML = nextWorkspace.innerHTML;
      document.body.dataset.routeType = nextDocument.body.dataset.routeType ?? "buffer";
      bl.dataset.currentBuffer = nextBufferline.dataset.currentBuffer;
      bl.dataset.currentHref = nextBufferline.dataset.currentHref;
      if (nextStatusFile) {
        const statusFile = document.querySelector<HTMLElement>("[data-status-file]")!;
        statusFile.textContent = nextStatusFile.textContent;
        statusFile.title = nextStatusFile.textContent ?? "";
      }
      if (nextStatusMeta) setStatus(nextStatusMeta.textContent ?? "");
      if (nextTitle) document.title = nextTitle;
      const nextCurrent = {
        href: bl.dataset.currentHref || target.pathname,
        label: bl.dataset.currentBuffer || "buffer",
      };
      if (isPersistentBuffer(nextCurrent)) {
        const storedBuffers = readBuffers();
        const nextIndex = storedBuffers.findIndex(
          buffer => buffer.href === nextCurrent.href || buffer.label === nextCurrent.label
        );
        if (nextIndex >= 0) storedBuffers[nextIndex] = nextCurrent;
        else storedBuffers.push(nextCurrent);
        writeBuffers(storedBuffers);
      }
      renderBuffers(readBuffers());
      setMode("NORMAL");
      initializeWorkspace();
      document.querySelector<HTMLElement>(".editor-main")?.scrollTo({ top: 0 });
    };

    if (token !== navigationToken) return;
    if (replace) history.replaceState({}, "", target.pathname);
    else history.pushState({}, "", target.pathname);

    applyUpdate();

    // Close explorer on mobile after buffer switch; keep desktop state.
    if (window.matchMedia("(max-width: 760px)").matches) {
      setExplorerHidden(true);
    }
  } catch {
    window.location.href = target.pathname;
  } finally {
    if (token === navigationToken) document.body.classList.remove("is-switching-buffer");
  }
}
