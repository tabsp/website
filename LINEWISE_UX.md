# Linewise UX Spec

Linewise should feel like reading a blog inside a Vim-shaped workspace, not like a terminal-themed website.

Color is a replaceable theme layer. The durable design is the Vim model: buffers, windows, motions, command line, quickfix, statusline, and a bias toward keyboard flow.

The editor feeling should come from runtime behavior: modes, commands, fuzzy finding, buffer switching, and status feedback. Linewise should keep that operational confidence while staying quiet and reading-centered because it is a blog starter, not a full personal web desktop.

## Product Shape

Linewise is an Astro starter/template for personal blogs. Phase one stays static-first and content-first:

- Astro static output
- Markdown/MDX posts
- RSS, sitemap, SEO metadata
- tags, archive, and client-side search
- Vim-inspired layout and interaction primitives

## Spatial Model

The browser viewport is an editor frame.

- `command-bar`: the command-line area and top-level navigation.
- `editor-body`: the area below the command line and above the statusline.
- `file-explorer`: a compact tree that exposes the blog's content structure.
- `editor-main`: the active editor column.
- `bufferline`: the visible set of open/recent buffers.
- `workspace`: the active window inside the main editor column.
- `status-line`: mode, current buffer, context, and progress.
- `buffer-list`: homepage as `:ls`.
- `post`: a readable buffer.
- `quickfix-list`: search, tags, archive, and filtered result pages.
- `picker`: a Telescope-like overlay or page for finding posts, tags, and commands.

The first screen should expose the active workspace immediately. No marketing hero, no decorative terminal chrome, no fake shell transcript.

The default desktop layout:

```text
Editor Frame
├─ Command Line
├─ Editor Body
│  ├─ File Explorer
│  │  ├─ posts
│  │  ├─ tags
│  │  └─ archive
│  └─ Editor Main
│     ├─ Bufferline
│     └─ Active Buffer
└─ Statusline
```

On mobile, the file explorer becomes a drawer opened from the command bar. The bufferline remains visible and horizontally scrollable.

## Route Metaphors

| Route            | Vim Metaphor           | Purpose                                 |
| ---------------- | ---------------------- | --------------------------------------- |
| `/`              | `:ls`                  | list open/readable buffers              |
| `/posts/[slug]/` | active buffer          | read one post                           |
| `/archive/`      | `:oldfiles` / jumplist | chronological navigation                |
| `/tags/`         | `:tags`                | topic index                             |
| `/tags/[tag]/`   | location list          | posts matching a topic                  |
| `/find/`         | Telescope / `:find`    | fuzzy-ish finding across posts and tags |

## Operation Model

Keyboard interaction should be progressive enhancement. Links and forms must still work without JavaScript.

Baseline normal-mode keys:

- `j` / `k`: move selection through buffer or quickfix rows
- `Enter`: open selected row
- `g g`: move to first row/top of document
- `G`: move to last row/bottom of document
- `/`: open the centered search palette with live result preview
- `:`: focus the command line
- `Esc`: leave command/search, close help panel, close explorer, return to normal mode
- `b`: go to `/`
- `q`: close the current persistent buffer and navigate to nearest buffer
- `?`: open help

Baseline command-line commands:

- `:ls`, `:buffers`, or `:posts`: go to `/`
- `:oldfiles` or `:archive`: go to `/archive/`
- `:tags`: go to `/tags/`
- `:search` or `:find`: go to `/find/`
- `:help` or `:h`: open help as a temporary buffer
- `:q` or `:quit`: close the current persistent buffer
- `:explore` or `:ex`: toggle the file explorer

Advanced commands can come later:

- `:open slug`
- `:tag name`
- `:theme name`
- `:buffer` / `:b name`
- `:next` / `:prev`
- marks and jumplist behavior

## Picker Model

Search should feel closer to Telescope than to a plain website search box.

Phase one has both a centered `/` search palette and a dedicated static `/find/` quickfix page with client-side filtering:

- `/` opens a centered prompt from normal mode
- the prompt previews matching posts and tags immediately
- `ArrowUp` / `ArrowDown` move through palette suggestions
- the `/find/` page keeps its own inline quickfix prompt
- results are selectable with `j` / `k`
- `Enter` opens the selected result
- `Esc` returns to normal mode, also closes help panel and file explorer
- results include posts first, then tags or commands later
- the statusline reports match count and selected item

Later, this can become a global overlay opened by `/`, `Ctrl+p`, or `:find`.

## Selection Model

Lists should behave more like Vim lists than static cards.

- One selectable row is active at a time.
- The active row is indicated by a cursor marker and statusline text.
- Mouse hover can preview active state, but keyboard focus is authoritative.
- The active item should be focusable and openable.

## File Explorer Model

The file tree is the site's information architecture, not decoration.

- `posts/` (expandable) lists recent article buffers.
- `tags/` (expandable) lists frequently used topic jump targets.
- `buffers` opens the post list (root).
- `archive` opens the chronological jump list (root).
- `find` opens the search picker (root).
- The tree should stay compact and scannable.
- The tree does not need to represent the physical repo exactly; it represents how a reader navigates the blog.

## Bufferline Model

The bufferline should make the workspace feel persistent.

Phase one should be small but honest:

- server-render the current buffer only
- use `localStorage` to remember recently visited buffers
- keep recent buffers capped to a small number
- allow each buffer tab to close
- closing the active buffer navigates to the nearest remaining buffer

Later, the bufferline can support `:bnext`, `:bprev`, `:bd`, and named `:buffer` jumps.

## Reading Model

The post page should feel like a buffer, but reading comfort wins.

- Body width remains narrow and calm.
- Typography is optimized for long reading.
- Vim details are peripheral: statusline, buffer name, optional progress, optional line gutter.
- Avoid forcing monospace body text.
- Avoid fake terminal prompts inside prose unless the content itself calls for them.

Future reading enhancements:

- reading progress in statusline
- section-aware status text
- optional line-number gutter for headings or paragraphs
- `[[` / `]]` between headings
- `n` / `N` for search matches

## Statusline Model

The statusline should communicate state rather than decorate.

Minimum fields:

- mode: `NORMAL`, `COMMAND`, `SEARCH`
- file/buffer: current route or post slug
- context: selected list index, reading progress, or result count

The statusline can update on keyboard movement, search input, route, and scroll progress.

## Visual Model

The visual layer should be quiet and themeable.

- Colors live in CSS tokens.
- Layout and interaction should not depend on one palette.
- Borders and panels are structural, not ornamental.
- Cards should be restrained; list rows should feel like editor rows.
- Vim-inspired does not mean every element must be dark, green, or monospace.

## First Implementation Target

The next implementation pass should:

- keep the current static routes
- make list pages keyboard selectable
- make command mode functional
- update statusline mode/context
- make `/find/` behave like a small Telescope-style picker
- add a compact file explorer
- add a bufferline above the active buffer
- add a compact help panel
- preserve readable article typography

This gets Linewise from visual resemblance toward operational resemblance.
