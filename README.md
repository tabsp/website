# Tabsp's Blog

[![Vercel Status](https://img.shields.io/github/deployments/tabsp/website/production?label=vercel&logo=vercel)](https://vercel.com/tabsp/website)
[![Coverage](https://img.shields.io/badge/coverage-99%25-brightgreen)](#tests--tooling)

A Gatsby-powered personal blog that renders Markdown posts with image optimization, RSS, and analytics integrations. This README gives you everything needed to work, test, and deploy the site on WSL or any Node 18+ environment.

## Prerequisites
- Node.js 18 LTS (match the GitHub Actions workflow)
- Yarn 1.x (preferred) or npm 8+
- WSL users: expose ports with `--host 0.0.0.0` so the Windows host can reach the dev server
- nvm users: run `nvm use` (the repo includes `.nvmrc`)

## Getting Started
```bash
# Clone and enter the repo
git clone https://github.com/tabsp/website.git
cd website

# Install dependencies
yarn install

# Optional: set analytics IDs for local parity
cp .env.example .env.development
```

Start a development server available on the host OS:
```bash
yarn develop --host 0.0.0.0
```
Visit `http://localhost:8000` (or `http://<wsl-ip>:8000` from Windows) for the site and `http://localhost:8000/___graphql` for GraphiQL.

## Scripts & Tooling
- `yarn develop` – Launch local dev server with hot reload
- `yarn build` – Produce production assets in `public/`
- `yarn serve` – Serve the latest production build
- `yarn clean` – Clear Gatsby caches (use after heavy content edits)
- `yarn format` – Run Prettier across JS/TS/MD/JSON
- `yarn lint` – ESLint with React, hooks, and a11y rules
- `yarn test` – Jest + Testing Library suite (use `--runInBand` in CI)
- `yarn browserslist:update` – Refresh local Browserslist caniuse dataset to silence warnings

## Project Structure
- `src/` – React components, pages, templates, and global CSS
- `content/blog/posts/<slug>/` – Markdown posts with frontmatter and assets
- `content/assets/` – Shared site media (icons, images)
- `static/` – Files copied verbatim to the build output
- `gatsby-config.js` / `gatsby-node.js` – Site metadata, plugins, and dynamic page builders

## Content Workflow
1. Duplicate an existing folder under `content/blog/posts/`
2. Update `index.md` frontmatter (`title`, `date`, `tags`, `description`)
3. Add images to the same folder and reference them relatively
4. Run `yarn develop` (or restart after `gatsby clean`) to refresh GraphQL data

## Environment Variables
Analytics and tracking IDs are optional but should live in per-environment files:
```
GATSBY_GTAG_ID=G-XXXXXXX
GATSBY_CLARITY_PROJECT_ID=clarity-id
```
Place them in `.env.development` / `.env.production` to avoid committing secrets. Missing values disable the plugins locally.

## Deployment
GitHub Actions (`.github/workflows/gatsby.yml`) builds and deploys on pushes to `master`. The workflow installs dependencies, runs lint/test gates, generates the static site, and publishes to GitHub Pages via `gatsby deploy`.

Need help or found a regression? Open an issue or reach out to @tabsp.
