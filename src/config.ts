/**
 * Resolved configuration used throughout the codebase.
 * All components import from here — never from linewise.config.ts directly.
 */
import userConfig from "../linewise.config";
import type {
  CommentsConfig,
  GiscusConfig,
  ResolvedCommentsConfig,
  ResolvedLinewiseConfig,
} from "./types/config";

function resolveComments(raw?: CommentsConfig): ResolvedCommentsConfig {
  if (!raw || raw.provider === "none") return { provider: "none" };
  if (raw.provider === "giscus" && raw.giscus) {
    return {
      provider: "giscus",
      giscus: resolveGiscus(raw.giscus),
    };
  }
  // Fallback: should be unreachable with discriminated union, but safe default.
  return { provider: "none" };
}

function resolveGiscus(raw: GiscusConfig) {
  return {
    repo: raw.repo,
    repoId: raw.repoId,
    category: raw.category,
    categoryId: raw.categoryId,
    mapping: raw.mapping ?? "pathname",
    inputPosition: raw.inputPosition ?? "bottom",
    reactionsEnabled: raw.reactionsEnabled ?? true,
    emitMetadata: raw.emitMetadata ?? false,
    lang: raw.lang ?? "en",
    loading: raw.loading ?? "lazy",
    theme: raw.theme ?? "https://linewise.tabsp.com/giscus-theme.css",
  };
}

function validateLocale(locale: string) {
  try {
    new Intl.DateTimeFormat(locale);
    return locale;
  } catch {
    return "en";
  }
}

const config: ResolvedLinewiseConfig = {
  site: {
    url: userConfig.site.url,
    title: userConfig.site.title,
    description: userConfig.site.description,
    author: userConfig.site.author,
    lang: userConfig.site.lang ?? "en",
    locale: validateLocale(userConfig.site.locale ?? "en"),
    ogImage: userConfig.site.ogImage ?? "og.svg",
    favicon: userConfig.site.favicon ?? "favicon.svg",
  },
  comments: resolveComments(userConfig.comments),
};

export default config;
