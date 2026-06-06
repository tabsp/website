# Linewise

Linewise is a Vim-inspired Astro starter for personal blogs. It is not a generic terminal theme: posts behave like buffers, search borrows from quickfix, and the interface uses Vim as an interaction model without sacrificing reading comfort.

The first phase is a starter/template named `@tabsp/linewise`, not an npm theme package.

**Preview:** [linewise.tabsp.com](https://linewise.tabsp.com)

## Features

- Static Astro output
- Markdown and MDX posts
- Typed content collections
- RSS, sitemap, canonical URLs, and Open Graph metadata
- Tags, archive, client-side search, and a quickfix-style search page
- giscus comments powered by GitHub Discussions (opt-in)
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

For a deeper dive into the design, read [Buffers, Not Tabs](https://linewise.tabsp.com/posts/buffers-not-tabs/).

## Getting Started

### 1. Create your copy

**Recommended:** Click **Use this template** on the [GitHub repository](https://github.com/tabsp/linewise) page to create your own repository, then clone it.

Or clone directly:

```sh
git clone https://github.com/tabsp/linewise.git my-blog
cd my-blog
```

### 2. Install dependencies

```sh
pnpm install
pnpm run dev
```

(Bun and npm work too when pnpm is unavailable.)

### 3. Configure your site

Edit `linewise.config.ts`:

- `site.url` — your production domain (required for sitemap, RSS, and canonical URLs)
- `site.title` — site title
- `site.description` — short description for SEO and previews
- `site.author` — your name
- `site.lang` and `site.locale` — e.g. `"en"` or `"zh"`
- `site.ogImage` and `site.favicon` — paths under `public/`

### 4. Write your posts

Replace the example posts in `src/content/blog/`. Each Markdown or MDX file needs frontmatter:

```md
---
title: "Your Title"
description: "A short description."
pubDate: 2026-01-01
tags: ["tag1", "tag2"]
---
```

See the [Getting Started](https://linewise.tabsp.com/posts/getting-started/) guide for the full schema.

### 5. Replace branding

Replace `public/favicon.svg` and `public/og.svg` with your own artwork.

### 6. Deploy

Any static host that runs Astro works. Common choices:

- **Vercel:** Connect your repo; detects Astro automatically.
- **Netlify:** Set build command to `pnpm run build` and publish directory to `dist`.
- **GitHub Pages:** Use the [Astro deployment guide](https://docs.astro.build/en/guides/deploy/github/).

For configuration, writing posts, and project layout, see the [Getting Started](https://linewise.tabsp.com/posts/getting-started/) guide.

## Comments

Linewise includes opt-in [giscus](https://giscus.app) comments backed by GitHub Discussions, with a custom theme that matches the Linewise palette. See the [Comments](/posts/comments/) guide for setup instructions.

## Keybindings and Commands

Linewise has Vim-style keyboard navigation and a command palette. See the [Keybindings and Commands](https://linewise.tabsp.com/posts/keybindings-and-commands/) post for the full reference.

## Development

```sh
pnpm install
pnpm run dev
pnpm run build
```

CI uses pnpm as well (see `.github/workflows/ci.yml`).

## Project Layout

```text
linewise.config.ts       User-editable site config
src/content/blog/        Markdown and MDX posts
src/content.config.ts    Blog frontmatter schema
src/config.ts            Resolved site configuration
src/types/               TypeScript type definitions
public/                  Static assets (favicon, OG image)
src/components/          UI components
src/pages/               Routes
src/scripts/linewise.ts  Client-side entry point
src/scripts/modules/     Domain modules (commands, buffers, search, keyboard)
src/styles/global.css    Theme tokens and layout
```

## Status

Linewise currently ships as a starter/template, not an npm theme package. It includes static output, Markdown/MDX, typed content collections, RSS, sitemap, tags, archive, search, SEO metadata, and code highlighting.

**Preview:** [linewise.tabsp.com](https://linewise.tabsp.com)

## License

MIT
