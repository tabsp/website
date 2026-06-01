import "dotenv/config"
import type { GatsbyConfig, PluginRef } from "gatsby"
import path from "path"
import { rssSerialize } from "./src/utils/rss-serialize"

const config: GatsbyConfig = {
  siteMetadata: {
    title: `Tabsp's blog`,
    author: {
      name: `Tabsp`,
      summary: ``,
    },
    description: `Tabsp's blog`,
    siteUrl: `https://tabsp.com`,
    social: {
      github: `tabsp`,
    },
    pageSize: 10,
  },

  plugins: [
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: path.join(process.cwd(), "content/blog"),
        name: `blog`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: path.join(process.cwd(), "content/assets"),
        name: `assets`,
      },
    },
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          `gatsby-remark-autolink-headers`,
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 630,
            },
          },
          {
            resolve: `gatsby-remark-responsive-iframe`,
            options: {
              wrapperStyle: `margin-bottom: 1.0725rem`,
            },
          },
          {
            resolve: `gatsby-remark-prismjs`,
            options: {
              showLineNumbers: true,
              noInlineHighlight: true,
              aliases: {
                conf: `nginx`,
              },
            },
          },
          `gatsby-remark-copy-linked-files`,
          `gatsby-remark-smartypants`,
          `gatsby-remark-footnotes`,
        ],
      },
    },
    process.env.GATSBY_GTAG_ID && {
      resolve: `gatsby-plugin-google-gtag`,
      options: {
        trackingIds: [process.env.GATSBY_GTAG_ID],
      },
    },
    process.env.GATSBY_CLARITY_PROJECT_ID && {
      resolve: `gatsby-plugin-clarity`,
      options: {
        clarity_project_id: process.env.GATSBY_CLARITY_PROJECT_ID,
        enable_on_dev_env: false,
      },
    },
    `gatsby-plugin-sitemap`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Tabsp's blog`,
        short_name: `Tabsp`,
        start_url: `/`,
        background_color: `#0a0a0f`,
        theme_color: `#00f5ff`,
        display: `minimal-ui`,
        icon: `content/assets/icon.svg`,
      },
    },
    {
      resolve: `gatsby-plugin-feed`,
      options: {
        feeds: [
          {
            serialize: rssSerialize,
            query: `
              {
                allMarkdownRemark(
                  sort: { frontmatter: { date: DESC } },
                ) {
                  nodes {
                    excerpt
                    html
                    fields {
                      slug
                    }
                    frontmatter {
                      title
                      date
                    }
                  }
                }
              }
            `,
            output: "/rss.xml",
            title: "Tabsp's blog",
          },
        ],
      },
    },
  ].filter(Boolean) as PluginRef[],
}

export default config
