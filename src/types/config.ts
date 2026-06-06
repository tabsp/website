export interface SiteConfig {
  /** Deployed URL, e.g. "https://example.com" */
  url: string;
  /** Blog title used in browser tab and OG metadata */
  title: string;
  /** Short description for SEO and RSS */
  description: string;
  /** Default post author name */
  author: string;
  /** HTML lang attribute, defaults to "en" */
  lang?: string;
  /** Locale for date formatting, defaults to "en" */
  locale?: string;
  /** Fallback OG image filename in /public, defaults to "og.svg" */
  ogImage?: string;
  /** Favicon filename in /public, defaults to "favicon.svg" */
  favicon?: string;
}

/* ── Comments ── */

export interface GiscusConfig {
  /** GitHub repo in "owner/repo" format, e.g. "tabsp/linewise" */
  repo: string;
  /** Repository ID from the giscus setup page */
  repoId: string;
  /** Discussion category name, e.g. "Announcements" */
  category: string;
  /** Category ID from the giscus setup page */
  categoryId: string;
  /** Page <-> discussion mapping. Defaults to "pathname". */
  mapping?: "pathname" | "url" | "title" | "og:title" | "specific" | "number";
  /** Where to place the comment input. Defaults to "bottom". */
  inputPosition?: "top" | "bottom";
  /** Enable reactions on the main post. Defaults to true. */
  reactionsEnabled?: boolean;
  /** Emit discussion metadata. Defaults to false. */
  emitMetadata?: boolean;
  /** Widget language. Defaults to "en". */
  lang?: string;
  /** Loading strategy. Defaults to "lazy". */
  loading?: "lazy" | "eager";
  /** giscus theme: a built-in name ("light", "dark", "preferred_color_scheme", etc.)
   *  or a full URL to a custom CSS file. Defaults to "light".
   *  Custom CSS URLs must be served with CORS headers. */
  theme?: string;
}

/**
 * Comment provider. Currently supports `"giscus"` and `"none"`.
 * Extend this union when adding new providers (disqus, utterances, etc.).
 */
export type CommentProvider = "giscus" | "none";

/**
 * Discriminated union: the `provider` field determines which sub-config is required.
 * Add new members here when new providers are implemented.
 */
export type CommentsConfig = { provider: "none" } | { provider: "giscus"; giscus: GiscusConfig };
// Future:
// | { provider: "disqus"; disqus: DisqusConfig }
// | { provider: "utterances"; utterances: UtterancesConfig }

/* ── Top-level config ── */

export interface LinewiseConfig {
  site: SiteConfig;
  comments?: CommentsConfig;
}

/* ── Resolved (internal) types ── */

export type ResolvedSiteConfig = Required<
  Pick<
    SiteConfig,
    "url" | "title" | "description" | "author" | "lang" | "locale" | "ogImage" | "favicon"
  >
>;

export type ResolvedGiscusConfig = Required<GiscusConfig>;

export type ResolvedCommentsConfig =
  | { provider: "none" }
  | { provider: "giscus"; giscus: ResolvedGiscusConfig };

export interface ResolvedLinewiseConfig {
  site: ResolvedSiteConfig;
  comments: ResolvedCommentsConfig;
}

/* ── Helper ── */

/**
 * Wraps the user config for type-checking without runtime cost.
 * Use this in linewise.config.ts at the project root.
 */
export function defineLinewiseConfig(config: LinewiseConfig): LinewiseConfig {
  return config;
}
