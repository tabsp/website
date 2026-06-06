import { defineLinewiseConfig } from "./src/types/config";

export default defineLinewiseConfig({
  site: {
    url: "https://tabsp.com",
    title: "Tabsp's Blog",
    description: "Tabsp‘s personal blog about programming, technology, and more.",
    author: "tabsp",
    lang: "en",
    locale: "en",
    ogImage: "og.svg",
    favicon: "favicon.svg",
  },
  comments: {
    provider: "giscus",
    giscus: {
      repo: "tabsp/comments",
      repoId: "R_kgDOHcCUDA",
      category: "Announcements",
      categoryId: "DIC_kwDOHcCUDM4CPbjE",
    },
  },
});
