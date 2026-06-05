# Linewise

Linewise is a Vim-inspired Astro starter for personal blogs. It is not a generic terminal theme: posts behave like buffers, search borrows from quickfix, and the interface uses Vim as an interaction model without sacrificing reading comfort.

The first phase is a starter/template named `astro-theme-linewise`, not an npm theme package.

## Features

- Static Astro output
- Markdown and MDX posts
- Typed content collections
- RSS, sitemap, canonical URLs, and Open Graph metadata
- Tags, archive, client-side search, and a quickfix-style search page
- Vim-like command palette, search palette, bufferline, file explorer, and statusline
- Keyboard motions for list navigation and reading
- Mobile file explorer drawer and horizontally scrollable buffer tabs

## Design Direction

- Posts are buffers.
- The homepage behaves like `:ls`.
- Archive and tag pages borrow from quickfix and location lists.
- Search is a client-side quickfix filter.
- The statusline and command line provide orientation without getting in the way.
- Reading comfort wins over novelty.

## Getting Started

Use Linewise as an Astro starter:

```sh
git clone https://github.com/tabsp/linewise.git my-blog
cd my-blog
bun install
bun run dev
```

Then replace the example posts in `src/content/blog/` with your own Markdown or MDX files.

If you are using GitHub, you can also click **Use this template** on the repository page, create your own copy, and then clone that copy locally.

## Configuration

Update the site metadata before publishing your own blog:

- `src/lib/site.ts`: site name, author, description, GitHub URL, and navigation labels
- `astro.config.mjs`: production `site` URL for sitemap and canonical metadata
- `public/favicon.svg` and `public/og.svg`: favicon and default social preview image

The default configuration in this repository points to `https://tabsp.com`. Change it if your deployment domain is different.

## Development

```sh
bun install
bun run dev
bun run build
```

The scripts are standard Astro scripts, so npm also works when available:

```sh
npm install
npm run dev
npm run build
```

## Keymap

| Key | Action |
| --- | --- |
| `j` / `k` | Move selection or scroll the active buffer |
| `Enter` | Open the selected row |
| `gg` / `G` | Jump to the top or bottom |
| `/` | Open search palette |
| `:` | Open command mode |
| `q` | Close the current buffer or leave a temporary buffer |
| `Esc` | Return to normal mode |

## Commands

| Command | Action |
| --- | --- |
| `:ls`, `:buffers`, `:posts` | Open the buffer list |
| `:archive`, `:oldfiles` | Open the archive |
| `:tags` | Open the tag index |
| `:search`, `:grep`, `:vimgrep`, `:find`, `:telescope` | Open search |
| `:help` | Open help |
| `:q` | Quit the current context |

## Writing Posts

Add Markdown or MDX files to `src/content/blog/`.

```md
---
title: "Welcome to Linewise"
description: "A small note on the shape of this Vim-inspired Astro starter."
pubDate: 2026-06-05
tags: ["meta", "astro", "vim"]
---

Your post content goes here.
```

## Project Layout

```text
public/                 Static assets
src/content/blog/        Markdown and MDX posts
src/content.config.ts    Blog frontmatter schema
src/components/          Linewise UI pieces
src/pages/               Static routes
src/scripts/linewise.ts  Client-side Vim-like interactions
src/styles/global.css    Theme tokens and layout
```

## Status

Linewise currently ships as a starter/template, not an npm theme package. It includes static output, Markdown/MDX, typed content collections, RSS, sitemap, tags, archive, search, SEO metadata, and code highlighting.

## License

MIT
