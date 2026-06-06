# Linewise

Vim-inspired Astro blog starter. Posts as buffers, Vim keybindings, client-side search.

**Stack:** Astro 6 (static), vanilla TS, plain CSS, pnpm, Playwright.

## Commands

```sh
pnpm dev          # localhost:4321
pnpm build        # static → dist/
pnpm test         # Playwright e2e
pnpm lint         # ESLint
pnpm format:check # Prettier
```

## Code Style

- All CSS in `src/styles/global.css` — custom properties, BEM-like naming, no Tailwind
- Client JS in `src/scripts/modules/` (state, commands, buffers, search, keyboard), wired in `linewise.ts`
- Lazy DOM refs via functions in `state.ts`: `commandInput()`, `statusMetaEl()`, etc.
- Routes as `.astro` files in `src/pages/`; content in `src/content/blog/`
- Config schema: `src/types/config.ts` (types) + `linewise.config.ts` (values)
- Progressive enhancement: links/forms work without JS

## Documenting features

Major features that affect the public API (config, components, build output) must ship with a
user-facing blog post in `src/content/blog/`. This is the primary documentation surface for
end users. The README links to these posts rather than inlining long explanations.

**Adding a feature post:**

1. Create a new `.md` file in [src/content/blog/](src/content/blog/) with frontmatter:
   ```md
   ---
   title: "Feature Name"
   description: "One-line summary for SEO and previews."
   pubDate: 2026-06-07
   tags: ["reference"] # or ["meta", etc.] — used for tag pages and search
   ---
   ```
2. Add a short paragraph and a link to the post from README.md.

## Tests

```sh
pnpm test                    # all e2e (builds, starts preview, runs)
pnpm exec playwright test --ui   # interactive runner
```

Tests live in `e2e/`. Write tests with `test.use({ viewport })` for mobile scenarios. CI runs `pnpm test` after `pnpm build`.

## Commit

Run checks before committing. Confirm everything passes:

```sh
pnpm lint && pnpm format:check && pnpm build && pnpm test
```

Commit messages in English, format:

```
<type>: <short summary>

<optional body>
```

Types:

- `fix:` bug fixes
- `feat:` new features
- `docs:` README, comments, UX spec
- `chore:` deps, config, gitignore
- `style:` formatting-only changes
- `refactor:` code changes with no functional difference
- `test:` adding or updating tests
