import type { CollectionEntry } from "astro:content";
import { existsSync } from "node:fs";
import config from "../config";

export type BlogPost = CollectionEntry<"blog">;

export function byNewest(a: BlogPost, b: BlogPost) {
  return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
}

export function isPublished(post: BlogPost) {
  return !post.data.draft;
}

export function getFilename(postId: string) {
  // Prefer collection metadata when available; fallback to filesystem probe.
  for (const ext of [".mdx", ".md"]) {
    if (existsSync(`src/content/blog/${postId}${ext}`)) return `${postId}${ext}`;
  }
  return `${postId}.md`;
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat(config.site.locale, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function readingTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return words === 0 ? 0 : Math.max(1, Math.ceil(words / 220));
}

export function collectTags(posts: BlogPost[]) {
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

export function groupByYear(posts: BlogPost[]) {
  return posts.reduce<Record<string, BlogPost[]>>((groups, post) => {
    const year = String(post.data.pubDate.getFullYear());
    groups[year] ??= [];
    groups[year].push(post);
    return groups;
  }, {});
}
