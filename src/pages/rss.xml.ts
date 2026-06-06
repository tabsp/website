import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { byNewest, isPublished } from "../lib/posts";
import config from "../config";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog")).filter(isPublished).sort(byNewest);

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: context.site ?? config.site.url,
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      author: config.site.author,
      link: `/posts/${post.id}/`,
    })),
  });
}
