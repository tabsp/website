import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { byNewest, isPublished } from "../lib/posts";
import { site } from "../lib/site";

export async function GET(context) {
  const posts = (await getCollection("blog")).filter(isPublished).sort(byNewest);

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/posts/${post.id}/`
    }))
  });
}
